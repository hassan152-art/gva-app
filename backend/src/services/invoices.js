/**
 * Kafalat receivables (Edspire-style donation collection).
 *
 *   invoice  = one child · one month · addressed to the child's sponsor
 *   receipt  = money the sponsor sent (amount, date received, note, slip)
 *
 * A receipt is split over the sponsor's unpaid invoices, oldest first (or the
 * invoices the admin ticked). Every split is also written to kafalat_donations
 * so the tracker, Orphans table, reminders and summaries all agree.
 *
 * An invoice's "paid" is always read from kafalat_donations for that child and
 * month — imported history and online-form submissions settle invoices too.
 */
import { randomBytes } from 'node:crypto';
import { query, queryOne, withTransaction } from '../db/index.js';
import { ALL_DONATIONS_SQL, KAFALAT, MONTH_NAMES, importDonations, usd } from './kafalat.js';

const clean = (s) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t === '' ? null : t;
};
const iso = (d) => (d ? new Date(d).toISOString() : null);
const dateOnly = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Share of the monthly amount that still counts as "paid" (27,000 / 30,000). */
const PAID_RATIO = KAFALAT.paidMinPkr / KAFALAT.monthlyPkr;

/** Per child-month totals from every donation source. */
const PAID_SQL = `
  SELECT a.orphan_id, a.year, m.month,
         sum(a.amount_pkr::numeric / greatest(cardinality(a.months), 1))::int AS paid,
         max(a.submitted_at) AS last_paid_at,
         string_agg(a.attachment_urls, ',') AS slips
    FROM (${ALL_DONATIONS_SQL}) a
    CROSS JOIN LATERAL unnest(a.months) AS m(month)
   WHERE a.status <> 'rejected' AND a.orphan_id IS NOT NULL
   GROUP BY 1, 2, 3
`;

const INVOICE_SELECT = `
  SELECT i.*, o.code AS child_code, o.name_en, o.name_ar, o.photo_url, o.poster_url,
         COALESCE(p.paid, 0) AS paid, p.last_paid_at, p.slips,
         ks.name AS sponsor_name, ks.phone AS sponsor_phone
    FROM kafalat_invoices i
    JOIN orphans o ON o.id = i.orphan_id
    LEFT JOIN (${PAID_SQL}) p ON p.orphan_id = i.orphan_id AND p.year = i.year AND p.month = i.month
    LEFT JOIN kafalat_sponsors ks ON ks.code = i.sponsor_code
`;

function invoiceDto(r) {
  const net = Math.max(0, r.amount_pkr - r.discount_pkr);
  const paid = Number(r.paid) || 0;
  let status = 'unpaid';
  if (net === 0 || paid >= Math.round(net * PAID_RATIO)) status = 'paid';
  else if (paid > 0) status = 'partial';
  const today = new Date().toISOString().slice(0, 10);
  const due = dateOnly(r.due_date);
  return {
    id: String(r.id),
    invoiceNo: r.invoice_no,
    orphanId: String(r.orphan_id),
    childCode: r.child_code,
    childName: r.name_en || r.name_ar || r.child_code,
    childNameAr: r.name_ar,
    photoUrl: r.photo_url || r.poster_url || null,
    sponsorCode: r.sponsor_code,
    sponsorName: r.sponsor_name || r.sponsor_code,
    sponsorPhone: r.sponsor_phone || null,
    year: r.year,
    month: r.month,
    period: `${MONTH_NAMES[r.month - 1].slice(0, 3)} ${r.year}`,
    donationType: 'Monthly kafalat',
    amountPkr: r.amount_pkr,
    discountPkr: r.discount_pkr,
    netPkr: net,
    paidPkr: paid,
    balancePkr: status === 'paid' ? 0 : Math.max(0, net - paid),
    status,
    overdue: status !== 'paid' && Boolean(due) && due < today,
    dueDate: due,
    note: r.note,
    lastPaidAt: iso(r.last_paid_at),
    slips: [...new Set(String(r.slips || '').split(',').map((x) => x.trim()).filter((x) => /^https?:\/\//i.test(x)))],
    createdAt: iso(r.created_at),
  };
}

function totalsOf(invoices) {
  const t = { netPkr: 0, paidPkr: 0, balancePkr: 0, discountPkr: 0, invoices: invoices.length, paid: 0, partial: 0, unpaid: 0 };
  for (const i of invoices) {
    t.netPkr += i.netPkr;
    t.paidPkr += i.paidPkr;
    t.balancePkr += i.balancePkr;
    t.discountPkr += i.discountPkr;
    t[i.status] += 1;
  }
  t.netUsd = usd(t.netPkr);
  t.paidUsd = usd(t.paidPkr);
  t.balanceUsd = usd(t.balancePkr);
  return t;
}

function defaultDueDate(year, month) {
  return `${year}-${String(month).padStart(2, '0')}-10`;
}

async function nextNo(client, seq, prefix) {
  const { rows } = await client.query(`SELECT nextval('${seq}') AS n`);
  return `${prefix}-${rows[0].n}`;
}

// ---------------------------------------------------------------------------
// Create donation invoices (bulk or individual)
// ---------------------------------------------------------------------------

/**
 * Raise invoices for a month. Without sponsorCode/orphanIds: every child that
 * has a sponsor (bulk monthly run). Children whose sponsor
 * joined after that month are skipped; existing invoices are left alone.
 */
export async function createInvoices({ year, month, sponsorCode, orphanIds, amountPkr, dueDate, note, userId }) {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) throw fail(422, 'Year is required');
  if (!Number.isInteger(month) || month < 1 || month > 12) throw fail(422, 'Month is required');
  const amount = amountPkr == null || amountPkr === '' ? KAFALAT.monthlyPkr : Number.parseInt(String(amountPkr), 10);
  if (!Number.isFinite(amount) || amount <= 0) throw fail(422, 'Amount must be more than 0');
  const ids = Array.isArray(orphanIds) ? orphanIds.map((x) => Number.parseInt(String(x), 10)).filter(Number.isFinite) : null;

  const params = [year * 12 + (month - 1)];
  const where = ['o.roster_sponsor_code IS NOT NULL'];
  if (sponsorCode) {
    params.push(String(sponsorCode).trim());
    where.push(`upper(o.roster_sponsor_code) = upper($${params.length})`);
  }
  if (ids && ids.length) {
    params.push(ids);
    where.push(`o.id = ANY($${params.length}::bigint[])`);
  }
  const children = await query(
    `SELECT o.id, o.roster_sponsor_code,
            (ks.added_on IS NOT NULL AND
             EXTRACT(YEAR FROM ks.added_on)::int * 12 + EXTRACT(MONTH FROM ks.added_on)::int - 1 > $1) AS not_yet
       FROM orphans o
       LEFT JOIN kafalat_sponsors ks ON ks.code = o.roster_sponsor_code
      WHERE ${where.join(' AND ')}
      ORDER BY NULLIF(regexp_replace(o.code, '\\D', '', 'g'), '')::int NULLS LAST, o.id`,
    params,
  );
  const due = dueDate || defaultDueDate(year, month);
  let created = 0;
  let existing = 0;
  let notYet = 0;
  await withTransaction(async (client) => {
    for (const c of children) {
      // Asked for by hand (one child) → raise it even before "sponsor since".
      if (c.not_yet && !(ids && ids.length)) {
        notYet += 1;
        continue;
      }
      const invoiceNo = await nextNo(client, 'kafalat_invoice_no_seq', 'INV');
      const res = await client.query(
        `INSERT INTO kafalat_invoices (invoice_no, orphan_id, sponsor_code, year, month, amount_pkr, due_date, note, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (orphan_id, year, month) DO NOTHING RETURNING id`,
        [invoiceNo, c.id, c.roster_sponsor_code, year, month, amount, due, clean(note), userId || null],
      );
      if (res.rows.length) created += 1;
      else existing += 1;
    }
  });
  return {
    created,
    existing,
    skippedNotYetSponsored: notYet,
    children: children.length,
    monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
  };
}

export async function updateInvoice(id, body) {
  const cur = await queryOne('SELECT * FROM kafalat_invoices WHERE id = $1', [id]);
  if (!cur) throw fail(404, 'Invoice not found');
  const amount = body.amountPkr !== undefined ? Number.parseInt(String(body.amountPkr), 10) : cur.amount_pkr;
  const discount = body.discountPkr !== undefined ? Number.parseInt(String(body.discountPkr || 0), 10) : cur.discount_pkr;
  if (!Number.isFinite(amount) || amount < 0) throw fail(422, 'Amount is not valid');
  if (!Number.isFinite(discount) || discount < 0 || discount > amount) throw fail(422, 'Discount is not valid');
  await query(
    `UPDATE kafalat_invoices SET amount_pkr = $1, discount_pkr = $2,
            due_date = COALESCE($3, due_date), note = $4 WHERE id = $5`,
    [amount, discount, body.dueDate || null, body.note !== undefined ? clean(body.note) : cur.note, id],
  );
  return getInvoice(id);
}

export async function deleteInvoice(id) {
  const rows = await query('DELETE FROM kafalat_invoices WHERE id = $1 RETURNING id', [id]);
  if (!rows.length) throw fail(404, 'Invoice not found');
}

export async function getInvoice(id) {
  const r = await queryOne(`${INVOICE_SELECT} WHERE i.id = $1`, [id]);
  return r ? invoiceDto(r) : null;
}

// ---------------------------------------------------------------------------
// Month overview (all sponsors) and sponsor ledger
// ---------------------------------------------------------------------------

export async function monthReceivables({ year, month, status, q, page = 1, pageSize = 50 }) {
  // Only this month's donations are summed (not the whole history).
  const scoped = INVOICE_SELECT.replace(
    PAID_SQL,
    PAID_SQL.replace('AND a.orphan_id IS NOT NULL', 'AND a.orphan_id IS NOT NULL AND a.year = $1 AND $2 = ANY(a.months)'),
  );
  const params = [year, month];
  let where = 'WHERE i.year = $1 AND i.month = $2';
  if (q) {
    params.push(`%${String(q).trim().replace(/[%_]/g, '')}%`);
    where += ` AND (o.code ILIKE $3 OR o.name_en ILIKE $3 OR o.name_ar ILIKE $3 OR i.sponsor_code ILIKE $3
                    OR ks.name ILIKE $3 OR ks.phone ILIKE $3 OR i.invoice_no ILIKE $3)`;
  }
  const rows = await query(
    `${scoped} ${where}
      ORDER BY NULLIF(regexp_replace(i.sponsor_code, '\\D', '', 'g'), '')::int NULLS LAST,
               NULLIF(regexp_replace(o.code, '\\D', '', 'g'), '')::int NULLS LAST`,
    params,
  );
  const all = rows.map(invoiceDto);
  const sponsoredWithoutInvoice = await queryOne(
    `SELECT count(*)::int AS n FROM orphans o
      WHERE o.roster_sponsor_code IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM kafalat_invoices i WHERE i.orphan_id = o.id AND i.year = $1 AND i.month = $2)`,
    [year, month],
  );
  return {
    year,
    month,
    monthLabel: MONTH_NAMES[month - 1],
    totals: totalsOf(all),
    notInvoiced: sponsoredWithoutInvoice.n,
    ...(() => {
      const filtered = status ? all.filter((i) => i.status === status || (status === 'unpaid' && i.status === 'partial')) : all;
      const size = Math.min(200, Math.max(1, pageSize));
      const pg = Math.max(1, page);
      return {
        page: pg,
        pageSize: size,
        total: filtered.length,
        invoices: filtered.slice((pg - 1) * size, pg * size),
      };
    })(),
  };
}

function receiptDto(r, allocations) {
  return {
    id: String(r.id),
    receiptNo: r.receipt_no,
    sponsorCode: r.sponsor_code,
    sponsorName: r.sponsor_name,
    amountPkr: r.amount_pkr,
    amountUsd: usd(r.amount_pkr),
    receivedAt: iso(r.received_at),
    method: r.method,
    bank: r.bank,
    reference: r.reference,
    note: r.note,
    attachments: r.attachment_urls ? String(r.attachment_urls).split(',').map((x) => x.trim()).filter(Boolean) : [],
    receivedBy: r.received_by_name || null,
    status: allocations.length && allocations.every((a) => a.rejected) ? 'rejected' : 'completed',
    allocations,
  };
}

async function sponsorRow(code) {
  const s = await queryOne('SELECT * FROM kafalat_sponsors WHERE upper(code) = upper($1)', [String(code || '').trim()]);
  if (!s) throw fail(404, 'Sponsor not found');
  return s;
}

/** Everything the Donation Collection page shows for one sponsor. */
export async function sponsorLedger(code) {
  const s = await sponsorRow(code);
  const children = await query(
    `SELECT id, code, name_en, name_ar, photo_url, poster_url, list_name, status
       FROM orphans WHERE roster_sponsor_code = $1
      ORDER BY NULLIF(regexp_replace(code, '\\D', '', 'g'), '')::int NULLS LAST, id`,
    [s.code],
  );
  const invoices = (
    await query(`${INVOICE_SELECT} WHERE i.sponsor_code = $1 ORDER BY i.year, i.month, o.code`, [s.code])
  ).map(invoiceDto);

  // Payment history: receipts recorded here, plus older/imported donations for
  // the sponsor's children that did not come through a receipt.
  const receipts = await query(
    `SELECT r.*, u.full_name AS received_by_name FROM kafalat_receipts r
       LEFT JOIN users u ON u.id = r.received_by
      WHERE r.sponsor_code = $1 ORDER BY r.received_at DESC`,
    [s.code],
  );
  const allocRows = receipts.length
    ? await query(
        `SELECT d.receipt_id, d.amount_pkr, d.year, d.months, d.status, o.code AS child_code, o.name_en, o.name_ar, i.invoice_no
           FROM kafalat_donations d
           JOIN orphans o ON o.id = d.orphan_id
           LEFT JOIN kafalat_invoices i ON i.orphan_id = d.orphan_id AND i.year = d.year AND i.month = d.months[1]
          WHERE d.receipt_id = ANY($1::bigint[])`,
        [receipts.map((r) => r.id)],
      )
    : [];
  const allocMap = new Map();
  for (const a of allocRows) {
    const list = allocMap.get(String(a.receipt_id)) || [];
    list.push({
      invoiceNo: a.invoice_no,
      childCode: a.child_code,
      childName: a.name_en || a.name_ar,
      period: (a.months || []).map((m) => `${MONTH_NAMES[m - 1].slice(0, 3)} ${a.year}`).join(', '),
      amountPkr: a.amount_pkr,
      rejected: a.status === 'rejected',
    });
    allocMap.set(String(a.receipt_id), list);
  }
  const ids = children.map((c) => c.id);
  const older = ids.length
    ? await query(
        `SELECT d.*, o.code AS child_code, o.name_en, o.name_ar FROM kafalat_donations d
           JOIN orphans o ON o.id = d.orphan_id
          WHERE d.orphan_id = ANY($1::bigint[]) AND d.receipt_id IS NULL
          ORDER BY d.submitted_at DESC`,
        [ids],
      )
    : [];
  const history = [
    ...receipts.map((r) => receiptDto(r, allocMap.get(String(r.id)) || [])),
    ...older.map((d) => ({
      id: `d${d.id}`,
      receiptNo: d.external_ref ? `IMP-${d.id}` : `DON-${d.id}`,
      sponsorCode: d.sponsor_code,
      sponsorName: d.sponsor_name,
      amountPkr: d.amount_pkr,
      amountUsd: usd(d.amount_pkr),
      receivedAt: iso(d.submitted_at),
      method: d.source === 'online_form' ? 'online' : d.source === 'import' ? 'imported' : 'bank',
      bank: d.bank,
      reference: null,
      note: d.note,
      attachments: d.attachment_urls ? String(d.attachment_urls).split(',').map((x) => x.trim()).filter(Boolean) : [],
      receivedBy: null,
      status: d.status === 'rejected' ? 'rejected' : 'completed',
      allocations: [
        {
          invoiceNo: null,
          childCode: d.child_code,
          childName: d.name_en || d.name_ar,
          period: (d.months || []).map((m) => `${MONTH_NAMES[m - 1].slice(0, 3)} ${d.year}`).join(', '),
          amountPkr: d.amount_pkr,
        },
      ],
    })),
  ].sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));

  return {
    rules: KAFALAT,
    sponsor: {
      code: s.code,
      name: s.name,
      phone: s.phone,
      email: s.email,
      area: s.area,
      reference: s.reference,
      status: s.status,
      addedOn: iso(s.added_on),
      monthlyPkr: children.length * KAFALAT.monthlyPkr,
      invoiceToken: s.invoice_token || null,
    },
    children: children.map((c) => ({
      id: String(c.id),
      code: c.code,
      name: c.name_en || c.name_ar || c.code,
      nameAr: c.name_ar,
      photoUrl: c.photo_url || c.poster_url || null,
      listName: c.list_name,
      status: c.status,
    })),
    totals: totalsOf(invoices),
    invoices,
    history,
    ledger: await monthlyLedger(s.code, invoices),
  };
}

/**
 * Sponsor ledger (Edspire "Family Ledger"): one row per month with the kafalat
 * invoiced that month, the money received that month and the running balance
 * carried forward. 40k unpaid → 40k forward; +40k → 80k; 50k paid → 30k forward.
 * Payments received before the first invoiced month count in that first month.
 */
async function monthlyLedger(sponsorCode, invoices) {
  if (!invoices.length) return [];
  const keyOf = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
  const rows = new Map();
  const row = (k) => {
    if (!rows.has(k)) {
      const [y, m] = k.split('-').map(Number);
      rows.set(k, { key: k, year: y, month: m, invoicedPkr: 0, paidPkr: 0, children: 0 });
    }
    return rows.get(k);
  };
  for (const i of invoices) {
    const r = row(keyOf(i.year, i.month));
    r.invoicedPkr += i.netPkr;
    r.children += 1;
  }
  const first = [...rows.keys()].sort()[0];
  const paid = await query(
    `SELECT to_char(a.submitted_at AT TIME ZONE 'Asia/Karachi', 'YYYY-MM') AS ym,
            sum(a.amount_pkr::numeric / greatest(cardinality(a.months), 1))::int AS paid
       FROM kafalat_invoices i
       JOIN (${ALL_DONATIONS_SQL}) a
         ON a.orphan_id = i.orphan_id AND a.year = i.year AND i.month = ANY(a.months)
      WHERE i.sponsor_code = $1 AND a.status <> 'rejected'
      GROUP BY 1`,
    [sponsorCode],
  );
  for (const p of paid) {
    const k = p.ym < first ? first : p.ym;
    row(k).paidPkr += Number(p.paid) || 0;
  }
  let carry = 0;
  return [...rows.values()]
    .sort((x, y) => (x.key < y.key ? -1 : 1))
    .map((r) => {
      carry += r.invoicedPkr - r.paidPkr;
      return { ...r, label: `${MONTH_NAMES[r.month - 1].slice(0, 3)}-${r.year}`, carriedForwardPkr: carry };
    });
}

// ---------------------------------------------------------------------------
// Receive payment
// ---------------------------------------------------------------------------

export async function receivePayment(code, body, userId) {
  const s = await sponsorRow(code);
  const amount = Number.parseInt(String(body.amountPkr ?? '').replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(amount) || amount <= 0) throw fail(422, 'Amount is required');
  const when = body.receivedAt ? new Date(body.receivedAt) : new Date();
  if (Number.isNaN(when.getTime())) throw fail(422, 'Received date is not valid');
  const method = ['bank', 'cash', 'online', 'other'].includes(body.method) ? body.method : 'bank';
  const picked = Array.isArray(body.invoiceIds) ? new Set(body.invoiceIds.map(String)) : null;

  const open = (
    await query(`${INVOICE_SELECT} WHERE i.sponsor_code = $1 ORDER BY i.year, i.month, o.code`, [s.code])
  )
    .map(invoiceDto)
    .filter((i) => i.balancePkr > 0 && (!picked || picked.size === 0 || picked.has(i.id)));
  const due = open.reduce((sum, i) => sum + i.balancePkr, 0);
  if (open.length === 0) {
    throw fail(422, 'Nothing is due for this sponsor. Create this month’s donation invoice first, then receive the payment.');
  }
  if (amount > due) {
    throw fail(
      422,
      `PKR ${amount.toLocaleString('en-US')} is more than the dues (PKR ${due.toLocaleString('en-US')}). ` +
        'Create the next month’s donation invoice first or reduce the amount.',
    );
  }

  return withTransaction(async (client) => {
    const receiptNo = await nextNo(client, 'kafalat_receipt_no_seq', 'RCPT');
    const {
      rows: [receipt],
    } = await client.query(
      `INSERT INTO kafalat_receipts (receipt_no, sponsor_code, sponsor_name, sponsor_phone, amount_pkr, received_at,
                                     method, bank, reference, attachment_urls, note, received_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        receiptNo, s.code, s.name, s.phone, amount, when, method, clean(body.bank), clean(body.reference),
        clean(body.attachmentUrl), clean(body.note), userId || null,
      ],
    );
    let left = amount;
    const applied = [];
    for (const inv of open) {
      if (left <= 0) break;
      const part = Math.min(left, inv.balancePkr);
      left -= part;
      await client.query(
        `INSERT INTO kafalat_donations (
           orphan_id, orphan_code, orphan_name, sponsor_code, sponsor_name, sponsor_phone,
           year, months, amount_pkr, submitted_at, attachment_urls, note, status, source, bank, receipt_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'verified','manual',$13,$14)`,
        [
          inv.orphanId, inv.childCode, inv.childName, s.code, s.name, s.phone, inv.year, [inv.month], part, when,
          clean(body.attachmentUrl), clean(body.note) || `Receipt ${receiptNo}`, clean(body.bank), receipt.id,
        ],
      );
      applied.push({ invoiceNo: inv.invoiceNo, childCode: inv.childCode, period: inv.period, amountPkr: part });
    }
    return { receipt: receiptDto(receipt, applied), dueBefore: due, dueAfter: due - amount };
  });
}

/** Reject (or restore) a receipt: its per-child rows stop (or start) counting. Nothing is deleted. */
export async function setReceiptStatus(id, status) {
  const r = await queryOne('SELECT id FROM kafalat_receipts WHERE id = $1', [id]);
  if (!r) throw fail(404, 'Receipt not found');
  await query('UPDATE kafalat_donations SET status = $1 WHERE receipt_id = $2', [status, id]);
}

// ---------------------------------------------------------------------------
// Sponsor-facing invoice link (sent on WhatsApp)
// ---------------------------------------------------------------------------

export async function ensureInvoiceToken(code) {
  const s = await sponsorRow(code);
  if (s.invoice_token) return s.invoice_token;
  const token = randomBytes(18).toString('base64url');
  await query('UPDATE kafalat_sponsors SET invoice_token = $1 WHERE id = $2', [token, s.id]);
  return token;
}

/** Read-only statement for the public invoice page — no phone/e-mail of anyone else. */
export async function publicStatement(token) {
  if (!token || String(token).length < 16) throw fail(404, 'Invoice not found');
  const s = await queryOne('SELECT code FROM kafalat_sponsors WHERE invoice_token = $1', [String(token)]);
  if (!s) throw fail(404, 'Invoice not found');
  const l = await sponsorLedger(s.code);
  return {
    sponsor: { code: l.sponsor.code, name: l.sponsor.name, area: l.sponsor.area },
    children: l.children.map((c) => ({ code: c.code, name: c.name })),
    totals: l.totals,
    ledger: l.ledger,
    monthlyPkr: l.sponsor.monthlyPkr,
    invoices: l.invoices.map(({ sponsorPhone, ...i }) => i),
    history: l.history
      .filter((h) => h.status !== 'rejected')
      .map((h) => ({
        receiptNo: h.receiptNo,
        amountPkr: h.amountPkr,
        receivedAt: h.receivedAt,
        method: h.method,
        allocations: h.allocations,
      })),
    rules: { monthlyPkr: KAFALAT.monthlyPkr },
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Kafala form (website) → app
// ---------------------------------------------------------------------------

/**
 * One submission from the public Kafala form. Accepts the same field names as
 * the FOP export ("Orphan Code", "Sponsor Name", "Sponsor Phone", "Amount",
 * "Months", "Year", "Attachment", "Note", "ID"), so the website only has to
 * POST what it already collects.
 */
export async function receiveFormSubmission(payload) {
  const rows = (Array.isArray(payload) ? payload : [payload]).map((r) =>
    Object.fromEntries(Object.entries(r || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v ?? '')])),
  );
  if (!rows.length) throw fail(422, 'Empty submission');
  return importDonations(rows, { source: 'online_form' });
}

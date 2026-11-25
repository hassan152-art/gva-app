/**
 * Mobile donor app — the pieces behind the public orphan list, sponsorship /
 * payment requests (bank slip, admin approval), the donor's own children and
 * ledger, payment accounts and complaint tickets.
 *
 * Accounts: a donor's app login (users) is tied to their sponsor record
 * (kafalat_sponsors) through users.sponsor_code. On first approval the link is
 * made — an existing sponsor with the same phone or e-mail is reused, else a
 * new SP code is created — so the admin panel and the app share one ledger.
 */
import { query, queryOne, withTransaction } from '../db/index.js';
import { resolveMediaPreviewUrl } from '../utils/driveMedia.js';
import { KAFALAT, MONTH_NAMES } from './kafalat.js';
import { createInvoices, sponsorLedger } from './invoices.js';

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
const clean = (s) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t === '' ? null : t;
};
const iso = (d) => (d ? new Date(d).toISOString() : null);
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);

/**
 * Placeholder sponsors from the FOP import ("N/A" — "No Sponsor") mean the
 * child is actually waiting for a sponsor.
 */
const PLACEHOLDER_SPONSORS = `(SELECT code FROM kafalat_sponsors WHERE code ILIKE 'N/A' OR name ILIKE 'no sponsor%')`;
const AVAILABLE_SQL = (alias) => `(${alias}.roster_sponsor_code IS NULL OR ${alias}.roster_sponsor_code IN ${PLACEHOLDER_SPONSORS})`;
async function placeholderCodes() {
  return new Set((await query(PLACEHOLDER_SPONSORS)).map((r) => r.code));
}

function ageFrom(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function photoOf(o) {
  const url = o.photo_url || o.poster_url || null;
  return { photoUrl: url, photoThumbnailUrl: url ? resolveMediaPreviewUrl(url, 400) : null };
}

// ---------------------------------------------------------------------------
// Public orphans (no login)
// ---------------------------------------------------------------------------

/** Children waiting for a sponsor. Only safe, public fields. */
export async function publicOrphans({ q, page = 1, pageSize = 20 }) {
  const like = q ? `%${String(q).trim().replace(/[%_]/g, '')}%` : null;
  const size = Math.min(50, Math.max(1, pageSize));
  const where = `WHERE o.record_kind = 'orphan' AND ${AVAILABLE_SQL('o')}
                   AND ($1::text IS NULL OR o.code ILIKE $1 OR o.name_en ILIKE $1 OR o.name_ar ILIKE $1)`;
  const [{ total }] = await query(`SELECT count(*)::int AS total FROM orphans o ${where}`, [like]);
  const rows = await query(
    `SELECT o.*, EXISTS (SELECT 1 FROM donor_requests r WHERE r.status = 'pending' AND o.id = ANY(r.orphan_ids)) AS requested
       FROM orphans o ${where}
      ORDER BY (o.photo_url IS NULL AND o.poster_url IS NULL), NULLIF(regexp_replace(o.code, '\\D', '', 'g'), '')::int DESC NULLS LAST
      LIMIT $2 OFFSET $3`,
    [like, size, (Math.max(1, page) - 1) * size],
  );
  return {
    total,
    page: Math.max(1, page),
    pageSize: size,
    monthlyPkr: KAFALAT.monthlyPkr,
    orphans: rows.map((o) => ({
      id: String(o.id),
      code: o.code,
      name: o.name_en || o.name_ar || o.code,
      nameAr: o.name_ar,
      age: o.age ?? ageFrom(o.date_of_birth),
      sex: o.sex,
      location: o.location,
      listName: o.list_name,
      requested: o.requested,
      ...photoOf(o),
    })),
  };
}

export async function publicOrphan(id, userId = null) {
  const o = await queryOne("SELECT * FROM orphans WHERE id = $1 AND record_kind = 'orphan'", [id]);
  if (!o) throw fail(404, 'Child not found');
  const mine = userId
    ? await queryOne(
        `SELECT 1 FROM users u WHERE u.id = $1 AND u.sponsor_code IS NOT NULL AND u.sponsor_code = $2`,
        [userId, o.roster_sponsor_code],
      )
    : null;
  const myRequest = userId
    ? await queryOne(
        `SELECT id, status FROM donor_requests WHERE user_id = $1 AND $2 = ANY(orphan_ids) AND kind = 'sponsorship'
          ORDER BY created_at DESC LIMIT 1`,
        [userId, o.id],
      )
    : null;
  return {
    id: String(o.id),
    code: o.code,
    name: o.name_en || o.name_ar || o.code,
    nameAr: o.name_ar,
    age: o.age ?? ageFrom(o.date_of_birth),
    sex: o.sex,
    location: o.location,
    listName: o.list_name,
    organization: o.partner_org,
    monthlyPkr: KAFALAT.monthlyPkr,
    available: !o.roster_sponsor_code || (await placeholderCodes()).has(o.roster_sponsor_code),
    isMine: Boolean(mine),
    myRequest: myRequest ? { id: String(myRequest.id), status: myRequest.status } : null,
    ...photoOf(o),
  };
}

// ---------------------------------------------------------------------------
// Payment accounts (one active at a time)
// ---------------------------------------------------------------------------

function accountDto(a) {
  return {
    id: String(a.id),
    label: a.label,
    bankName: a.bank_name,
    accountTitle: a.account_title,
    accountNumber: a.account_number,
    iban: a.iban,
    branch: a.branch,
    instructions: a.instructions,
    isActive: a.is_active,
    updatedAt: iso(a.updated_at),
  };
}

export async function activePaymentAccount() {
  const a = await queryOne('SELECT * FROM payment_accounts WHERE is_active LIMIT 1');
  return a ? accountDto(a) : null;
}

export async function listPaymentAccounts() {
  return (await query('SELECT * FROM payment_accounts ORDER BY is_active DESC, updated_at DESC')).map(accountDto);
}

export async function savePaymentAccount(id, body) {
  const label = clean(body.label);
  const title = clean(body.accountTitle);
  const number = clean(body.accountNumber);
  if (!label || !title || !number) throw fail(422, 'Name, account title and account number are required');
  const vals = [label, clean(body.bankName), title, number, clean(body.iban), clean(body.branch), clean(body.instructions)];
  if (id) {
    const r = await queryOne(
      `UPDATE payment_accounts SET label=$1, bank_name=$2, account_title=$3, account_number=$4, iban=$5, branch=$6,
              instructions=$7, updated_at=now() WHERE id=$8 RETURNING *`,
      [...vals, id],
    );
    if (!r) throw fail(404, 'Account not found');
    return accountDto(r);
  }
  const first = !(await queryOne('SELECT 1 FROM payment_accounts LIMIT 1'));
  const r = await queryOne(
    `INSERT INTO payment_accounts (label, bank_name, account_title, account_number, iban, branch, instructions, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [...vals, first],
  );
  return accountDto(r);
}

/** Turn one account on; every other account goes off. */
export async function activatePaymentAccount(id) {
  return withTransaction(async (c) => {
    const { rows } = await c.query('SELECT id FROM payment_accounts WHERE id = $1', [id]);
    if (!rows.length) throw fail(404, 'Account not found');
    await c.query('UPDATE payment_accounts SET is_active = false, updated_at = now() WHERE is_active AND id <> $1', [id]);
    const r = await c.query('UPDATE payment_accounts SET is_active = true, updated_at = now() WHERE id = $1 RETURNING *', [id]);
    return accountDto(r.rows[0]);
  });
}

export async function deactivatePaymentAccount(id) {
  const r = await queryOne('UPDATE payment_accounts SET is_active = false, updated_at = now() WHERE id = $1 RETURNING *', [id]);
  if (!r) throw fail(404, 'Account not found');
  return accountDto(r);
}

export async function deletePaymentAccount(id) {
  const r = await query('DELETE FROM payment_accounts WHERE id = $1 RETURNING id', [id]);
  if (!r.length) throw fail(404, 'Account not found');
}

function accountText(a) {
  if (!a) return null;
  return [a.label, a.bankName, `${a.accountTitle} · ${a.accountNumber}`, a.iban ? `IBAN ${a.iban}` : null]
    .filter(Boolean)
    .join(' — ');
}

// ---------------------------------------------------------------------------
// Donor ↔ sponsor link
// ---------------------------------------------------------------------------

async function nextSponsorCode(c) {
  const { rows } = await c.query(
    `SELECT COALESCE(max(NULLIF(regexp_replace(code, '\\D', '', 'g'), '')::int), 600) + 1 AS n
       FROM kafalat_sponsors WHERE code ~* '^SP\\d+$'`,
  );
  return `SP${rows[0].n}`;
}

/** The donor's sponsor code; creates / links a kafalat_sponsors row when missing. */
async function ensureSponsorFor(c, userId) {
  const { rows: [u] } = await c.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
  if (!u) throw fail(404, 'Donor account not found');
  if (u.sponsor_code) return { code: u.sponsor_code, user: u };
  const p = last10(u.phone);
  const { rows: found } = await c.query(
    `SELECT s.code FROM kafalat_sponsors s
      WHERE NOT EXISTS (SELECT 1 FROM users x WHERE x.sponsor_code = s.code)
        AND ((length($1) = 10 AND right(regexp_replace(COALESCE(s.phone, ''), '\\D', '', 'g'), 10) = $1)
             OR (s.email IS NOT NULL AND lower(s.email) = lower($2)))
      ORDER BY s.id LIMIT 1`,
    [p, u.email],
  );
  let code = found[0]?.code;
  if (!code) {
    code = await nextSponsorCode(c);
    await c.query(
      `INSERT INTO kafalat_sponsors (code, external_id, name, phone, email, status, reference, added_on)
       VALUES ($1,(SELECT COALESCE(max(external_id), 20000) + 1 FROM kafalat_sponsors),$2,$3,$4,'Active','Mobile app',now())`,
      [code, u.full_name, u.phone, u.email],
    );
  }
  await c.query('UPDATE users SET sponsor_code = $1, updated_at = now() WHERE id = $2', [code, userId]);
  return { code, user: u };
}

/** Write one receipt + per child-month donation rows (amount split evenly). */
async function recordMoney(c, { code, user, orphanIds, year, months, amount, slipUrl, note, when, adminId, bank }) {
  const { rows: [{ n }] } = await c.query("SELECT nextval('kafalat_receipt_no_seq') AS n");
  const receiptNo = `RCPT-${n}`;
  const { rows: [receipt] } = await c.query(
    `INSERT INTO kafalat_receipts (receipt_no, sponsor_code, sponsor_name, sponsor_phone, amount_pkr, received_at,
                                   method, bank, attachment_urls, note, received_by)
     VALUES ($1,$2,$3,$4,$5,$6,'online',$7,$8,$9,$10) RETURNING id`,
    [receiptNo, code, user.full_name, user.phone, amount, when, bank, slipUrl, note, adminId],
  );
  const { rows: kids } = await c.query('SELECT id, code, name_en, name_ar FROM orphans WHERE id = ANY($1::bigint[])', [orphanIds]);
  const parts = kids.length * months.length;
  let left = amount;
  let i = 0;
  for (const k of kids) {
    for (const m of months) {
      i += 1;
      const share = i === parts ? left : Math.floor(amount / parts);
      left -= share;
      await c.query(
        `INSERT INTO kafalat_donations (orphan_id, orphan_code, orphan_name, sponsor_code, sponsor_name, sponsor_phone,
                                        year, months, amount_pkr, submitted_at, attachment_urls, note, status, source, bank, receipt_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'verified','online_form',$13,$14)`,
        [k.id, k.code, k.name_en || k.name_ar, code, user.full_name, user.phone, year, [m], share, when, slipUrl,
         note || `Mobile app · ${receiptNo}`, bank, receipt.id],
      );
    }
  }
  return { receiptId: receipt.id, receiptNo };
}

// ---------------------------------------------------------------------------
// Requests (donor → admin)
// ---------------------------------------------------------------------------

function requestDto(r) {
  return {
    id: String(r.id),
    kind: r.kind,
    status: r.status,
    year: r.year,
    months: r.months,
    monthLabels: (r.months || []).map((m) => MONTH_NAMES[m - 1]),
    amountPkr: r.amount_pkr,
    slipUrl: r.slip_url,
    note: r.note,
    adminNote: r.admin_note,
    account: r.account_snapshot,
    createdAt: iso(r.created_at),
    decidedAt: iso(r.decided_at),
    children: (r.children || []).map((k) => ({
      id: String(k.id),
      code: k.code,
      name: k.name_en || k.name_ar || k.code,
      photoUrl: k.photo_url || k.poster_url || null,
      sponsorCode: k.roster_sponsor_code || null,
    })),
    donor: r.donor_name
      ? { id: String(r.user_id), name: r.donor_name, email: r.donor_email, phone: r.donor_phone, sponsorCode: r.donor_sponsor_code }
      : undefined,
  };
}

const REQUEST_SELECT = `
  SELECT r.*, u.full_name AS donor_name, u.email AS donor_email, u.phone AS donor_phone, u.sponsor_code AS donor_sponsor_code,
         (SELECT json_agg(json_build_object('id', o.id, 'code', o.code, 'name_en', o.name_en, 'name_ar', o.name_ar,
                                            'photo_url', o.photo_url, 'poster_url', o.poster_url,
                                            'roster_sponsor_code',
                                            CASE WHEN o.roster_sponsor_code IN ${PLACEHOLDER_SPONSORS} THEN NULL ELSE o.roster_sponsor_code END))
            FROM orphans o WHERE o.id = ANY(r.orphan_ids)) AS children
    FROM donor_requests r JOIN users u ON u.id = r.user_id`;

export async function createRequest(userId, body, slipUrl) {
  const kind = body.kind === 'payment' ? 'payment' : 'sponsorship';
  let ids;
  try {
    ids = (Array.isArray(body.orphanIds) ? body.orphanIds : JSON.parse(body.orphanIds || '[]'))
      .map((x) => Number.parseInt(String(x), 10))
      .filter(Number.isFinite);
  } catch {
    ids = [];
  }
  let months;
  try {
    months = (Array.isArray(body.months) ? body.months : JSON.parse(body.months || '[]')).map(Number).filter((m) => m >= 1 && m <= 12);
  } catch {
    months = [];
  }
  const now = new Date();
  const year = Number.parseInt(String(body.year || now.getFullYear()), 10);
  if (!months.length) months = [now.getMonth() + 1];
  const amount = Number.parseInt(String(body.amountPkr ?? '').replace(/[^\d]/g, ''), 10);
  if (!ids.length) throw fail(422, 'Choose at least one child');
  if (!Number.isFinite(amount) || amount <= 0) throw fail(422, 'Enter the amount you sent');
  if (!slipUrl) throw fail(422, 'Attach the payment slip / screenshot');

  const kids = await query('SELECT id, roster_sponsor_code FROM orphans WHERE id = ANY($1::bigint[]) AND record_kind = $2', [ids, 'orphan']);
  if (kids.length !== ids.length) throw fail(404, 'Child not found');
  const u = await queryOne('SELECT sponsor_code FROM users WHERE id = $1', [userId]);
  if (kind === 'sponsorship') {
    const placeholders = await placeholderCodes();
    const taken = kids.filter((k) => k.roster_sponsor_code && !placeholders.has(k.roster_sponsor_code) && k.roster_sponsor_code !== u?.sponsor_code);
    if (taken.length) throw fail(409, 'This child already has a sponsor. Please choose another child.');
    const dup = await queryOne(
      `SELECT 1 FROM donor_requests WHERE user_id = $1 AND kind = 'sponsorship' AND status = 'pending' AND orphan_ids && $2::bigint[]`,
      [userId, ids],
    );
    if (dup) throw fail(409, 'You already sent a request for this child — it is waiting for approval.');
  } else {
    const notMine = kids.filter((k) => !u?.sponsor_code || k.roster_sponsor_code !== u.sponsor_code);
    if (notMine.length) throw fail(403, 'You can only pay for children you sponsor');
  }
  const acc = await activePaymentAccount();
  const r = await queryOne(
    `INSERT INTO donor_requests (user_id, kind, orphan_ids, year, months, amount_pkr, payment_account_id, account_snapshot, slip_url, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [userId, kind, ids, year, months, amount, acc ? Number(acc.id) : null, accountText(acc), slipUrl, clean(body.note)],
  );
  return getRequest(r.id);
}

export async function getRequest(id) {
  const r = await queryOne(`${REQUEST_SELECT} WHERE r.id = $1`, [id]);
  if (!r) throw fail(404, 'Request not found');
  return requestDto(r);
}

export async function myRequests(userId) {
  return (await query(`${REQUEST_SELECT} WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 100`, [userId])).map(requestDto);
}

export async function adminRequests({ status, kind }) {
  const params = [];
  const where = [];
  if (status) {
    params.push(status);
    where.push(`r.status = $${params.length}`);
  }
  if (kind) {
    params.push(kind);
    where.push(`r.kind = $${params.length}`);
  }
  const rows = await query(
    `${REQUEST_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY (r.status = 'pending') DESC, r.created_at DESC LIMIT 200`,
    params,
  );
  const counts = await queryOne(
    `SELECT count(*) FILTER (WHERE status = 'pending')::int AS pending,
            count(*) FILTER (WHERE status = 'pending' AND kind = 'sponsorship')::int AS pending_sponsorship,
            count(*) FILTER (WHERE status = 'pending' AND kind = 'payment')::int AS pending_payment,
            count(*) FILTER (WHERE status = 'approved')::int AS approved,
            count(*) FILTER (WHERE status = 'rejected')::int AS rejected
       FROM donor_requests`,
  );
  return { counts, requests: rows.map(requestDto) };
}

/**
 * Approve: link the child(ren) to the donor's sponsor code (sponsorship),
 * raise the invoices for the paid months and record the money as a receipt.
 */
export async function approveRequest(id, adminId, adminNote) {
  const reqRow = await queryOne('SELECT * FROM donor_requests WHERE id = $1', [id]);
  if (!reqRow) throw fail(404, 'Request not found');
  if (reqRow.status !== 'pending') throw fail(409, `This request is already ${reqRow.status}`);

  const { code, user } = await withTransaction(async (c) => {
    const link = await ensureSponsorFor(c, reqRow.user_id);
    if (reqRow.kind === 'sponsorship') {
      const { rows: kids } = await c.query('SELECT id, code, roster_sponsor_code FROM orphans WHERE id = ANY($1::bigint[]) FOR UPDATE', [reqRow.orphan_ids]);
      const { rows: ph } = await c.query(PLACEHOLDER_SPONSORS);
      const placeholders = new Set(ph.map((r) => r.code));
      const taken = kids.filter((k) => k.roster_sponsor_code && !placeholders.has(k.roster_sponsor_code) && k.roster_sponsor_code !== link.code);
      if (taken.length) {
        throw fail(409, `${taken.map((k) => k.code).join(', ')} is already sponsored by ${taken.map((k) => k.roster_sponsor_code).join(', ')}. Reject this request or unlink the child first.`);
      }
      await c.query(`UPDATE orphans SET roster_sponsor_code = $1, status = 'sponsored' WHERE id = ANY($2::bigint[])`, [link.code, reqRow.orphan_ids]);
      // Invoices raised before (placeholder sponsor, none, or from this month on) move to the new sponsor.
      await c.query(
        `UPDATE kafalat_invoices SET sponsor_code = $1
          WHERE orphan_id = ANY($2::bigint[])
            AND (sponsor_code IS NULL OR sponsor_code = ANY($3::text[])
                 OR year * 12 + month >= EXTRACT(YEAR FROM now())::int * 12 + EXTRACT(MONTH FROM now())::int)`,
        [link.code, reqRow.orphan_ids, [...placeholders]],
      );
      for (const oid of reqRow.orphan_ids) {
        await c.query(
          `INSERT INTO sponsorships (user_id, orphan_id, monthly_amount_pkr, status)
           SELECT $1, $2, $3, 'active' WHERE NOT EXISTS (SELECT 1 FROM sponsorships WHERE user_id = $1 AND orphan_id = $2 AND status = 'active')`,
          [reqRow.user_id, oid, KAFALAT.monthlyPkr],
        );
      }
    }
    return link;
  });

  // Invoices for the months paid (separate transaction inside createInvoices).
  for (const m of reqRow.months) {
    await createInvoices({ year: reqRow.year, month: m, orphanIds: reqRow.orphan_ids.map(String), userId: adminId });
  }

  return withTransaction(async (c) => {
    const acc = reqRow.payment_account_id
      ? (await c.query('SELECT label, bank_name FROM payment_accounts WHERE id = $1', [reqRow.payment_account_id])).rows[0]
      : null;
    const money = await recordMoney(c, {
      code,
      user,
      orphanIds: reqRow.orphan_ids,
      year: reqRow.year,
      months: reqRow.months,
      amount: reqRow.amount_pkr,
      slipUrl: reqRow.slip_url,
      note: clean(reqRow.note),
      when: reqRow.created_at,
      adminId,
      bank: acc ? acc.label : null,
    });
    await c.query(
      `UPDATE donor_requests SET status = 'approved', admin_note = $1, decided_by = $2, decided_at = now(), receipt_id = $3 WHERE id = $4`,
      [clean(adminNote), adminId, money.receiptId, id],
    );
    return { sponsorCode: code, receiptNo: money.receiptNo };
  });
}

export async function rejectRequest(id, adminId, adminNote) {
  const r = await queryOne(
    `UPDATE donor_requests SET status = 'rejected', admin_note = $1, decided_by = $2, decided_at = now()
      WHERE id = $3 AND status = 'pending' RETURNING id`,
    [clean(adminNote), adminId, id],
  );
  if (!r) throw fail(409, 'Only pending requests can be rejected');
}

// ---------------------------------------------------------------------------
// Donor home / children / ledger
// ---------------------------------------------------------------------------

export async function donorOverview(userId) {
  const u = await queryOne('SELECT id, full_name, sponsor_code FROM users WHERE id = $1', [userId]);
  if (!u) throw fail(404, 'Account not found');
  const reqCounts = await queryOne(
    `SELECT count(*) FILTER (WHERE status = 'pending')::int AS pending, count(*)::int AS total FROM donor_requests WHERE user_id = $1`,
    [userId],
  );
  const tickets = await ticketCounts(userId);
  if (!u.sponsor_code) {
    return { sponsorCode: null, name: u.full_name, children: [], totals: null, requests: reqCounts, tickets, ledger: [] };
  }
  const l = await sponsorLedger(u.sponsor_code);
  const now = new Date();
  const byChild = new Map();
  for (const i of l.invoices) {
    const cur = byChild.get(i.orphanId) || { paid: 0, pending: 0, balancePkr: 0, paidPkr: 0, thisMonth: null };
    if (i.status === 'paid') cur.paid += 1;
    else cur.pending += 1;
    cur.balancePkr += i.balancePkr;
    cur.paidPkr += i.paidPkr;
    if (i.year === now.getFullYear() && i.month === now.getMonth() + 1) cur.thisMonth = i.status;
    if (i.year === now.getFullYear()) (cur.months ||= []).push({ year: i.year, month: i.month, status: i.status });
    byChild.set(i.orphanId, cur);
  }
  return {
    sponsorCode: u.sponsor_code,
    name: u.full_name,
    monthlyPkr: l.sponsor.monthlyPkr,
    totals: l.totals,
    requests: reqCounts,
    tickets,
    children: l.children.map((c) => {
      const s = byChild.get(c.id) || { paid: 0, pending: 0, balancePkr: 0, paidPkr: 0, thisMonth: null };
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        nameAr: c.nameAr,
        photoUrl: c.photoUrl,
        monthsPaid: s.paid,
        monthsPending: s.pending,
        balancePkr: s.balancePkr,
        paidPkr: s.paidPkr,
        thisMonth: s.thisMonth,
        months: s.months || [],
      };
    }),
    ledger: l.ledger,
  };
}

export async function donorLedger(userId) {
  const u = await queryOne('SELECT sponsor_code FROM users WHERE id = $1', [userId]);
  if (!u?.sponsor_code) return { sponsorCode: null, invoices: [], history: [], ledger: [], totals: null, children: [] };
  const l = await sponsorLedger(u.sponsor_code);
  return {
    sponsorCode: u.sponsor_code,
    totals: l.totals,
    children: l.children,
    invoices: l.invoices.map(({ sponsorPhone, ...i }) => i),
    history: l.history
      .filter((h) => h.status !== 'rejected')
      .map((h) => ({
        id: h.id,
        receiptNo: h.receiptNo,
        amountPkr: h.amountPkr,
        receivedAt: h.receivedAt,
        method: h.method,
        bank: h.bank || null,
        // The donor's own note; system notes ("Receipt RCP-…") are left out.
        note: h.note && !/^(Receipt |Mobile app · )/.test(h.note) ? h.note : null,
        allocations: h.allocations,
        attachments: h.attachments,
      })),
    ledger: l.ledger,
  };
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export const TICKET_CATEGORIES = ['payment', 'child_update', 'account', 'other'];

async function ticketCounts(userId) {
  return queryOne(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE status IN ('open', 'in_progress'))::int AS pending,
            count(*) FILTER (WHERE status IN ('resolved', 'closed'))::int AS resolved
       FROM support_tickets WHERE ($1::bigint IS NULL OR user_id = $1)`,
    [userId],
  );
}

function ticketDto(t) {
  return {
    id: String(t.id),
    ticketNo: t.ticket_no,
    category: t.category,
    subject: t.subject,
    status: t.status,
    createdAt: iso(t.created_at),
    updatedAt: iso(t.updated_at),
    resolvedAt: iso(t.resolved_at),
    lastMessage: t.last_body ? { body: t.last_body, role: t.last_role, at: iso(t.last_at) } : null,
    messages: t.message_count ?? undefined,
    child: t.child_code ? { id: String(t.orphan_id), code: t.child_code } : null,
    donor: t.donor_name ? { name: t.donor_name, email: t.donor_email, phone: t.donor_phone, sponsorCode: t.donor_sponsor_code } : undefined,
  };
}

const TICKET_SELECT = `
  SELECT t.*, o.code AS child_code, u.full_name AS donor_name, u.email AS donor_email, u.phone AS donor_phone,
         u.sponsor_code AS donor_sponsor_code,
         lm.body AS last_body, lm.author_role AS last_role, lm.created_at AS last_at,
         (SELECT count(*)::int FROM ticket_messages m WHERE m.ticket_id = t.id) AS message_count
    FROM support_tickets t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN orphans o ON o.id = t.orphan_id
    LEFT JOIN LATERAL (SELECT body, author_role, created_at FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) lm ON true`;

export async function listTickets({ userId = null, status = null }) {
  const params = [userId];
  let where = 'WHERE ($1::bigint IS NULL OR t.user_id = $1)';
  if (status === 'pending') where += " AND t.status IN ('open', 'in_progress')";
  else if (status === 'resolved') where += " AND t.status IN ('resolved', 'closed')";
  const rows = await query(`${TICKET_SELECT} ${where} ORDER BY t.updated_at DESC LIMIT 200`, params);
  return { counts: await ticketCounts(userId), tickets: rows.map(ticketDto) };
}

export async function getTicket(id, userId = null) {
  const t = await queryOne(`${TICKET_SELECT} WHERE t.id = $1 AND ($2::bigint IS NULL OR t.user_id = $2)`, [id, userId]);
  if (!t) throw fail(404, 'Ticket not found');
  const msgs = await query(
    `SELECT m.*, u.full_name FROM ticket_messages m LEFT JOIN users u ON u.id = m.author_user_id
      WHERE m.ticket_id = $1 ORDER BY m.created_at`,
    [id],
  );
  return {
    ...ticketDto(t),
    thread: msgs.map((m) => ({
      id: String(m.id),
      role: m.author_role,
      author: m.author_role === 'admin' ? 'Support team' : m.full_name,
      body: m.body,
      attachmentUrl: m.attachment_url,
      createdAt: iso(m.created_at),
    })),
  };
}

export async function createTicket(userId, body, attachmentUrl) {
  const subject = clean(body.subject);
  const message = clean(body.message);
  if (!subject) throw fail(422, 'Write a short title for your complaint');
  if (!message) throw fail(422, 'Describe the problem');
  const category = TICKET_CATEGORIES.includes(body.category) ? body.category : 'other';
  const orphanId = Number.parseInt(String(body.orphanId || ''), 10);
  const id = await withTransaction(async (c) => {
    const { rows: [{ n }] } = await c.query("SELECT nextval('support_ticket_no_seq') AS n");
    const { rows: [t] } = await c.query(
      `INSERT INTO support_tickets (ticket_no, user_id, category, subject, orphan_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [`TKT-${n}`, userId, category, subject, Number.isFinite(orphanId) ? orphanId : null],
    );
    await c.query(
      `INSERT INTO ticket_messages (ticket_id, author_user_id, author_role, body, attachment_url) VALUES ($1,$2,'donor',$3,$4)`,
      [t.id, userId, message, attachmentUrl || null],
    );
    return t.id;
  });
  return getTicket(id, userId);
}

/** Reply on a ticket. Donor reply re-opens a resolved ticket; admin may set a status. */
export async function replyTicket(id, { userId, role, body, attachmentUrl, status }) {
  const text = clean(body);
  if (!text && !attachmentUrl) throw fail(422, 'Write a reply');
  const t = await queryOne('SELECT * FROM support_tickets WHERE id = $1', [id]);
  if (!t || (role === 'donor' && String(t.user_id) !== String(userId))) throw fail(404, 'Ticket not found');
  const next =
    role === 'admin'
      ? ['open', 'in_progress', 'resolved', 'closed'].includes(status) ? status : t.status === 'open' ? 'in_progress' : t.status
      : t.status === 'resolved' || t.status === 'closed' ? 'open' : t.status;
  await withTransaction(async (c) => {
    await c.query(
      `INSERT INTO ticket_messages (ticket_id, author_user_id, author_role, body, attachment_url) VALUES ($1,$2,$3,$4,$5)`,
      [id, userId, role, text || '(attachment)', attachmentUrl || null],
    );
    await c.query(
      `UPDATE support_tickets SET status = $1, updated_at = now(),
              resolved_at = CASE WHEN $1 IN ('resolved', 'closed') THEN now() ELSE NULL END WHERE id = $2`,
      [next, id],
    );
  });
  return getTicket(id, role === 'donor' ? userId : null);
}

export async function setTicketStatus(id, status) {
  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) throw fail(422, 'Unknown status');
  const r = await queryOne(
    `UPDATE support_tickets SET status = $1, updated_at = now(),
            resolved_at = CASE WHEN $1 IN ('resolved', 'closed') THEN now() ELSE NULL END
      WHERE id = $2 RETURNING id`,
    [status, id],
  );
  if (!r) throw fail(404, 'Ticket not found');
  return getTicket(id);
}

export async function adminBadgeCounts() {
  return queryOne(
    `SELECT (SELECT count(*)::int FROM donor_requests WHERE status = 'pending') AS requests,
            (SELECT count(*)::int FROM support_tickets WHERE status IN ('open', 'in_progress')) AS tickets`,
  );
}

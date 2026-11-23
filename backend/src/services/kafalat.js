/**
 * Kafalat (monthly child sponsorship) — roster import, donation records and
 * the paid / partial / pending rules used by the child profile and report.
 *
 * Rule of thumb from the programme: one child's kafalat is USD 100 a month
 * (the public form enforces PKR 30,000). A payment a little under that still
 * counts as paid, so the "paid" line is KAFALAT_PAID_MIN_PKR (default 27,000,
 * i.e. ~90%). Anything above zero but below the line is "partial".
 */
import { query, queryOne, withTransaction } from '../db/index.js';

export const KAFALAT = {
  monthlyPkr: Number(process.env.KAFALAT_MONTHLY_PKR || 30000),
  paidMinPkr: Number(process.env.KAFALAT_PAID_MIN_PKR || 27000),
  pkrPerUsd: Number(process.env.KAFALAT_PKR_PER_USD || 280),
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function usd(pkr) {
  return Math.round((Number(pkr) || 0) / KAFALAT.pkrPerUsd);
}

// ---------------------------------------------------------------------------
// CSV parsing (RFC 4180: quoted fields, "" escapes, CRLF, UTF-8 BOM)
// ---------------------------------------------------------------------------
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.slice(0, src.indexOf('\n') === -1 ? undefined : src.indexOf('\n'));
  const delimiter =
    (firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length
      ? '\t'
      : (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length
        ? ';'
        : ',';
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) return [];
  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const o = {};
    headers.forEach((h, idx) => {
      o[h] = (r[idx] ?? '').trim();
    });
    return o;
  });
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** First non-empty value among header aliases (case/spacing-insensitive). */
function pick(row, aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const k = keys.find((key) => norm(key) === norm(alias));
    if (k && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
  return '';
}

/** Accepts ISO, dd/mm/yyyy [hh:mm[:ss]], and Excel serial day numbers. */
export function parseDateTime(value) {
  const v = String(value || '').trim();
  if (!v) return null;
  if (/^\d+(\.\d+)?$/.test(v)) {
    const serial = Number(v);
    if (serial > 20000 && serial < 80000) {
      return new Date(Math.round((serial - 25569) * 86400 * 1000));
    }
  }
  const dmy = v.match(
    /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:,?[ T]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i,
  );
  if (dmy) {
    const [, d, m, y, hh = '0', mm = '0', ss = '0', ampm] = dmy;
    let h = Number(hh);
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    }
    // Back-office times are Pakistan time (UTC+5); a bare date stays on that day.
    const hasTime = dmy[4] !== undefined;
    return new Date(
      Date.UTC(Number(y), Number(m) - 1, Number(d), hasTime ? h - 5 : 0, Number(mm), Number(ss)),
    );
  }
  const iso = new Date(v);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function isoDate(d) {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** "January, March" | "1,3" | "Jan-Mar" → [1, 3] / [1, 2, 3]. */
export function parseMonths(value) {
  const v = String(value || '').trim();
  if (!v) return [];
  const toNum = (tok) => {
    const t = tok.trim().toLowerCase();
    if (/^\d{1,2}$/.test(t)) {
      const n = Number(t);
      return n >= 1 && n <= 12 ? n : null;
    }
    const idx = MONTH_NAMES.findIndex((m) => t.startsWith(m.slice(0, 3).toLowerCase()));
    return idx === -1 ? null : idx + 1;
  };
  const out = new Set();
  for (const part of v.split(/[,;|/]+/)) {
    const range = part.split(/\s+(?:to|-)\s+|-/);
    if (range.length === 2) {
      const a = toNum(range[0]);
      const b = toNum(range[1]);
      if (a && b && a <= b) {
        for (let m = a; m <= b; m += 1) out.add(m);
        continue;
      }
    }
    for (const tok of part.split(/\s+/)) {
      const n = toNum(tok);
      if (n) out.add(n);
    }
  }
  return [...out].sort((a, b) => a - b);
}

const clean = (s) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t === '' ? null : t;
};

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
async function upsertSponsor(client, s, { overwrite }) {
  if (!s.code || !s.name) return false;
  const sql = overwrite
    ? `INSERT INTO kafalat_sponsors (code, external_id, name, area, phone, email, status, added_on, reference, total_orphans)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (code) DO UPDATE SET
         reference = EXCLUDED.reference, total_orphans = EXCLUDED.total_orphans,
         external_id = COALESCE(EXCLUDED.external_id, kafalat_sponsors.external_id),
         name = EXCLUDED.name, area = EXCLUDED.area, phone = EXCLUDED.phone,
         email = EXCLUDED.email, status = COALESCE(EXCLUDED.status, kafalat_sponsors.status),
         added_on = COALESCE(EXCLUDED.added_on, kafalat_sponsors.added_on), updated_at = now()`
    : `INSERT INTO kafalat_sponsors (code, external_id, name, area, phone, email, status, added_on, reference, total_orphans)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (code) DO NOTHING`;
  await client.query(sql, [
    s.code, s.externalId ?? null, s.name, s.area, s.phone, s.email, s.status, s.addedOn,
    s.reference ?? null, s.totalOrphans ?? null,
  ]);
  return true;
}

export async function importSponsors(rows) {
  let count = 0;
  await withTransaction(async (client) => {
    for (const r of rows) {
      const ok = await upsertSponsor(
        client,
        {
          code: clean(pick(r, ['Code', 'Sponsor Code'])),
          externalId: Number.parseInt(pick(r, ['ID', 'Sponsor ID']), 10) || null,
          name: clean(pick(r, ['Name', 'Sponsor Name'])),
          area: clean(pick(r, ['Area', 'Sponsor Area'])),
          phone: clean(pick(r, ['Phone', 'Sponsor Phone'])),
          email: clean(pick(r, ['Email', 'Sponsor Email'])),
          status: clean(pick(r, ['Status'])),
          addedOn: parseDateTime(pick(r, ['Added On', 'Created At'])),
          reference: clean(pick(r, ['Reference'])),
          totalOrphans: Number.parseInt(pick(r, ['Total Orphans']), 10) || null,
        },
        { overwrite: true },
      );
      if (ok) count += 1;
    }
  });
  return { imported: count, skipped: rows.length - count };
}

export async function importOrphans(rows) {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  await withTransaction(async (client) => {
    for (const r of rows) {
      const code = clean(pick(r, ['Code', 'Orphan Code']));
      if (!code) {
        skipped += 1;
        continue;
      }
      const sponsorCode = clean(pick(r, ['Sponsor Code']));
      if (sponsorCode) {
        await upsertSponsor(
          client,
          {
            code: sponsorCode,
            name: clean(pick(r, ['Sponsor Name'])),
            area: clean(pick(r, ['Sponsor Area'])),
            phone: clean(pick(r, ['Sponsor Phone'])),
            email: clean(pick(r, ['Sponsor Email'])),
            status: null,
            addedOn: null,
          },
          { overwrite: false },
        );
      }
      const dob = parseDateTime(pick(r, ['Date of Birth', 'DOB']));
      const monthly = Number.parseInt(pick(r, ['Monthly Amount']), 10) || KAFALAT.monthlyPkr;
      const values = [
        code,
        clean(pick(r, ['Name', 'Name AR'])),
        clean(pick(r, ['Name EN'])),
        clean(pick(r, ['Father Name', 'Guardian AR', 'Guardian Name'])),
        clean(pick(r, ['Guardian EN'])),
        clean(pick(r, ['Orphan ID Number'])),
        clean(pick(r, ['Guardian ID Number'])),
        clean(pick(r, ['Location'])),
        dob ? isoDate(dob) : null,
        clean(pick(r, ['Child Phone', 'WhatsApp'])),
        monthly,
        sponsorCode ? 'sponsored' : 'waiting',
        clean(pick(r, ['Orphans List Name', 'List'])),
        clean(pick(r, ['Organization'])),
        Number.parseInt(pick(r, ['Orphan ID']), 10) || null,
        sponsorCode,
      ];
      const existing = await client.query('SELECT id FROM orphans WHERE code = $1', [code]);
      if (existing.rows[0]) {
        await client.query(
          `UPDATE orphans SET
             name_ar = COALESCE($2, name_ar), name_en = COALESCE($3, name_en),
             guardian_name_ar = COALESCE($4, guardian_name_ar),
             guardian_name_en = COALESCE($5, guardian_name_en),
             orphan_id_number = COALESCE($6, orphan_id_number),
             guardian_id_number = COALESCE($7, guardian_id_number),
             location = COALESCE($8, location), date_of_birth = COALESCE($9, date_of_birth),
             whatsapp = COALESCE($10, whatsapp), monthly_amount_pkr = $11, status = $12,
             list_name = $13, partner_org = $14, roster_external_id = $15,
             roster_sponsor_code = $16
           WHERE code = $1`,
          values,
        );
        updated += 1;
      } else {
        await client.query(
          `INSERT INTO orphans (
             code, name_ar, name_en, guardian_name_ar, guardian_name_en, orphan_id_number,
             guardian_id_number, location, date_of_birth, whatsapp, monthly_amount_pkr, status,
             list_name, partner_org, roster_external_id, roster_sponsor_code, record_kind
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'orphan')`,
          values,
        );
        created += 1;
      }
    }
  });
  return { created, updated, skipped };
}

/**
 * Orphan codes as donors type them: "OR 473", "0R211", "QR060", "OROR549",
 * "OR_315", "630", "OR079, OR317, OR318", "OR492-Joan …", "SOR006", "444933386".
 * Returns { codes: ['OR473', …], idNumbers: ['444933386', …] }.
 */
export function parseOrphanRefs(value) {
  const v = String(value || '').toUpperCase();
  const codes = new Set();
  const idNumbers = new Set();
  // Digit part may use the letter O for zero ("ORO45", "SORO14").
  const re = /(DSOR|SOR|FR|ORPHAN|OR|QR|0R|O\.R|(?<![A-Z])O)[\s_\-.#:]*([\dO]*\d[\dO]*)(?![\dO])/g;
  let m;
  while ((m = re.exec(v))) {
    const digits = m[2].replace(/O/g, '0');
    if (digits.length > 4) continue;
    let prefix = m[1];
    if (['QR', '0R', 'O.R', 'O', 'ORPHAN'].includes(prefix)) prefix = 'OR';
    codes.add(`${prefix}${digits.replace(/^0+(?=\d{3})/, '').padStart(3, '0')}`);
  }
  for (const id of v.match(/(?<!\d)\d{9}(?!\d)/g) || []) idNumbers.add(id);
  // Only numbers typed ("630", "607 ,609", "652 651 225"): treat each as an OR code.
  if (codes.size === 0 && idNumbers.size === 0 && /^[\d\s,+&/-]+$/.test(v.trim())) {
    for (const n of v.match(/\d{1,3}/g) || []) {
      if (Number(n) > 0) codes.add(`OR${n.padStart(3, '0')}`);
    }
  }
  return { codes: [...codes], idNumbers: [...idNumbers] };
}

/** "November 2026, December 2026, January 2027" / "May" → Map(year → [months]). */
export function parseMonthYears(value, defaultYear) {
  const out = new Map();
  const add = (y, m) => {
    if (!out.has(y)) out.set(y, new Set());
    out.get(y).add(m);
  };
  const parts = String(value || '')
    .split(/[,;|/&]+|\band\b/i)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    const y = Number((part.match(/\b(20\d{2})\b/) || [])[1]) || defaultYear;
    const months = parseMonths(part.replace(/\b20\d{2}\b/g, ''));
    for (const mo of months) add(y, mo);
  }
  return new Map([...out].map(([y, s]) => [y, [...s].sort((a, b) => a - b)]));
}

/** Anything above this for one row is a typo in the source (e.g. an account number). */
const MAX_SANE_PKR = Number(process.env.KAFALAT_MAX_ROW_PKR || 5_000_000);

function hashKey(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export async function importDonations(rows) {
  let imported = 0;
  let duplicates = 0;
  let unmatched = 0;
  let invalidAmount = 0;
  const problems = [];
  const orphans = await query(
    'SELECT id, code, name_en, name_ar, orphan_id_number, guardian_id_number, roster_sponsor_code FROM orphans WHERE code IS NOT NULL',
  );
  const byCode = new Map(orphans.map((o) => [o.code.toUpperCase(), o]));
  const byIdNo = new Map();
  for (const o of orphans) {
    if (o.orphan_id_number) byIdNo.set(o.orphan_id_number.replace(/\D/g, ''), o);
  }
  const byGuardianId = new Map();
  for (const o of orphans) {
    const g = o.guardian_id_number?.replace(/\D/g, '');
    if (g) byGuardianId.set(g, byGuardianId.has(g) ? null : o); // null = guardian of several children
  }
  const byName = new Map();
  for (const o of orphans) {
    for (const n of [o.name_en, o.name_ar]) {
      const k = norm(n);
      if (k.length > 5) byName.set(k, byName.has(k) ? null : o); // null = ambiguous
    }
  }

  await withTransaction(async (client) => {
    for (const [i, r] of rows.entries()) {
      const line = i + 2;
      const rawCode = clean(pick(r, ['Orphan Code', 'oprhanCode', 'orphanCode', 'Code', 'Orphan'])) || '';
      const orphanName = clean(pick(r, ['Orphan Name', 'oprhanName', 'orphanName']));
      const amount = Math.round(
        Number(pick(r, ['Amount', 'Payment', 'Total Amount (PKR)', 'Total Amount', 'Amount PKR']).replace(/[^\d.]/g, '')),
      );
      const sponsorName =
        clean(pick(r, ['Sponsor Name', 'sponsorName', 'Donor', 'Donor Name', 'Name'])) || 'Unknown sponsor';
      if (!Number.isFinite(amount)) {
        problems.push(`Row ${line}: no amount`);
        continue;
      }
      const when =
        parseDateTime(
          pick(r, ['Submitted On', 'Date', 'Date & Time', 'Payment Date', 'Added On', 'Created At', 'Created On']),
        ) || new Date();
      const defaultYear = Number.parseInt(pick(r, ['Year']), 10) || Number(when.toISOString().slice(0, 4));
      let byYear = parseMonthYears(
        pick(r, ['Months', 'Kafalat Month(s)', 'Kafalat Months', 'Kafalat Month', 'Month', 'months']),
        defaultYear,
      );
      if (byYear.size === 0) byYear = new Map([[defaultYear, [when.getUTCMonth() + 1]]]);
      const totalMonths = [...byYear.values()].reduce((s, m) => s + m.length, 0);

      // Resolve which children this row pays for.
      const refs = parseOrphanRefs(rawCode);
      const targets = [];
      for (const c of refs.codes) {
        // Retired SOR cases live on as DSOR (SOR001 → DSOR001).
        const hit = byCode.get(c) || (c.startsWith('SOR') ? byCode.get(`D${c}`) : undefined);
        if (hit) targets.push(hit);
      }
      for (const id of refs.idNumbers) {
        const hit = byIdNo.get(id) || byGuardianId.get(id);
        if (hit) targets.push(hit);
      }
      if (targets.length === 0) {
        const hit = byName.get(norm(rawCode)) || (orphanName ? byName.get(norm(orphanName)) : null);
        if (hit) targets.push(hit);
      }
      const unique = [...new Map(targets.map((o) => [o.id, o])).values()];

      const statusRaw = norm(pick(r, ['Status']));
      let status = statusRaw.includes('reject')
        ? 'rejected'
        : statusRaw.includes('verif') || statusRaw.includes('approv') || statusRaw.includes('complete')
          ? 'verified'
          : 'received';
      let note = clean(pick(r, ['Note', 'Notes']));
      if (note === '---') note = null;
      const bank = clean(pick(r, ['Bank', 'Bank Name']));
      if (amount > MAX_SANE_PKR) {
        status = 'rejected';
        note = [`Amount in export looks wrong (PKR ${amount.toLocaleString('en-US')})`, note]
          .filter(Boolean)
          .join(' · ');
        invalidAmount += 1;
      }
      const ref = clean(pick(r, ['ID', 'Id', 'Reference', 'Submission ID']));
      const baseRef = ref
        ? `import:${ref}`
        : `row:${hashKey([rawCode, sponsorName, when.toISOString(), amount, pick(r, ['Month', 'Months'])].join('|'))}`;

      const recipients = unique.length ? unique : [null];
      if (!unique.length) {
        unmatched += 1;
        problems.push(`Row ${line}: could not match "${rawCode || orphanName || '?'}" to a child (saved, unlinked)`);
      }
      // A typo amount is kept in the note only; it must not count towards any month.
      const usable = amount > MAX_SANE_PKR ? 0 : amount;
      const amountPerChild = Math.round(usable / recipients.length);
      for (const orphan of recipients) {
        for (const [year, months] of byYear) {
          const share = Math.round((amountPerChild * months.length) / totalMonths);
          const res = await client.query(
            `INSERT INTO kafalat_donations (
               orphan_id, orphan_code, orphan_name, sponsor_code, sponsor_name, sponsor_phone,
               year, months, amount_pkr, submitted_at, attachment_urls, note, status, source,
               external_ref, bank, raw_code, split_count, account_no
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'import',$14,$15,$16,$17,$18)
             ON CONFLICT (external_ref) WHERE external_ref IS NOT NULL
             DO UPDATE SET bank = EXCLUDED.bank, account_no = EXCLUDED.account_no
             RETURNING (xmax = 0) AS inserted`,
            [
              orphan?.id ?? null,
              orphan?.code ?? (rawCode || null),
              orphan?.name_en || orphan?.name_ar || orphanName,
              orphan?.roster_sponsor_code || null,
              sponsorName,
              clean(pick(r, ['Sponsor Phone', 'sponsorPhone', 'Phone'])),
              year,
              months,
              share,
              when,
              clean(pick(r, ['Attachment', 'Attachments', 'Payment Slips', 'Slip', 'attachment'])),
              note,
              status,
              `${baseRef}:${orphan?.id ?? 'x'}:${year}`,
              bank,
              rawCode || null,
              recipients.length,
              (() => {
                const a = clean(pick(r, ['Account No.', 'Account No', 'Account Number']));
                return a && a !== '-' ? a : null;
              })(),
            ],
          );
          if (res.rows[0]?.inserted) imported += 1;
          else duplicates += 1;
        }
      }
    }
  });
  return { imported, duplicates, unmatched, invalidAmount, problems: problems.slice(0, 200) };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Every donation row, from kafalat_donations plus the app's own payments
 * (payment_allocations), in one shape.
 */
const ALL_DONATIONS_SQL = `
  SELECT 'k' || d.id AS uid, d.id AS donation_id, d.orphan_id, d.sponsor_code, d.sponsor_name,
         d.sponsor_phone, d.year, d.months, d.amount_pkr, d.submitted_at, d.attachment_urls,
         d.note, d.status, d.source, d.bank, d.raw_code, d.split_count
    FROM kafalat_donations d
  UNION ALL
  SELECT 'p' || pa.id, NULL, pa.orphan_id, NULL, u.full_name, u.phone,
         EXTRACT(YEAR FROM p.paid_on)::int, ARRAY[EXTRACT(MONTH FROM p.paid_on)::int],
         pa.amount_pkr, p.created_at, p.proof_path, p.reference_note,
         CASE p.status WHEN 'completed' THEN 'verified' WHEN 'rejected' THEN 'rejected' ELSE 'received' END,
         'app', NULL, NULL, 1
    FROM payment_allocations pa
    JOIN payments p ON p.id = pa.payment_id
    JOIN users u ON u.id = p.user_id
`;

/**
 * paid | partial | pending | upcoming | not_due.
 * `since` = when the sponsorship began (sponsor added on); months before it are not due.
 */
function monthState(paidPkr, year, month, since = null, now = new Date()) {
  if (paidPkr >= KAFALAT.paidMinPkr) return 'paid';
  if (paidPkr > 0) return 'partial';
  const nowKey = now.getFullYear() * 12 + now.getMonth();
  const key = year * 12 + (month - 1);
  if (since) {
    const s = new Date(since);
    if (key < s.getUTCFullYear() * 12 + s.getUTCMonth()) return 'not_due';
  }
  return key > nowKey ? 'upcoming' : 'pending';
}

/** Per-month amount for a donation covering several months. */
function perMonth(d) {
  const n = d.months?.length || 1;
  return Math.round(d.amount_pkr / n);
}

function donationDto(d) {
  const per = perMonth(d);
  return {
    id: d.uid,
    donationId: d.donation_id ? String(d.donation_id) : null,
    sponsorCode: d.sponsor_code,
    sponsorName: d.sponsor_name,
    sponsorPhone: d.sponsor_phone,
    year: d.year,
    months: d.months || [],
    monthLabels: (d.months || []).map((m) => MONTH_NAMES[m - 1]),
    amountPkr: d.amount_pkr,
    amountUsd: usd(d.amount_pkr),
    perMonthPkr: per,
    meetsMinimum: per >= KAFALAT.paidMinPkr,
    fullAmount: per >= KAFALAT.monthlyPkr,
    submittedAt: new Date(d.submitted_at).toISOString(),
    attachments: d.attachment_urls
      ? String(d.attachment_urls).split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    note: d.note,
    status: d.status,
    source: d.source,
    bank: d.bank || null,
    rawCode: d.raw_code || null,
    splitCount: d.split_count || 1,
  };
}

function ageFrom(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function sponsorDto(s, fallback) {
  if (s) {
    return {
      code: s.code, name: s.name, phone: s.phone, email: s.email, area: s.area,
      status: s.status, addedOn: s.added_on ? new Date(s.added_on).toISOString() : null,
    };
  }
  return fallback || null;
}

export async function orphanKafalatProfile(orphanId, year) {
  const o = await queryOne('SELECT * FROM orphans WHERE id = $1', [orphanId]);
  if (!o) return null;
  const sponsor = o.roster_sponsor_code
    ? await queryOne('SELECT * FROM kafalat_sponsors WHERE code = $1', [o.roster_sponsor_code])
    : null;
  const appSponsor = await queryOne(
    `SELECT u.full_name, u.email, u.phone FROM sponsorships s JOIN users u ON u.id = s.user_id
      WHERE s.orphan_id = $1 AND s.status = 'active' ORDER BY s.started_at DESC LIMIT 1`,
    [orphanId],
  );
  const rows = await query(
    `SELECT * FROM (${ALL_DONATIONS_SQL}) a WHERE a.orphan_id = $1 ORDER BY a.submitted_at DESC`,
    [orphanId],
  );
  const donations = rows.map(donationDto);
  const counted = rows.filter((d) => d.status !== 'rejected');

  const years = [...new Set([year, ...counted.map((d) => d.year)])].sort((a, b) => b - a);
  const months = MONTH_NAMES.map((label, idx) => {
    const m = idx + 1;
    const inMonth = counted.filter((d) => d.year === year && d.months?.includes(m));
    const paid = inMonth.reduce((sum, d) => sum + perMonth(d), 0);
    return {
      month: m,
      label,
      paidPkr: paid,
      paidUsd: usd(paid),
      donations: inMonth.length,
      state: monthState(paid, year, m, sponsor?.added_on ?? null),
    };
  });

  const donorMap = new Map();
  for (const d of counted) {
    const key = (d.sponsor_phone || '').replace(/\D/g, '').slice(-10) || d.sponsor_name.toLowerCase();
    const cur = donorMap.get(key) || {
      name: d.sponsor_name, phone: d.sponsor_phone, donations: 0, totalPkr: 0, lastAt: null, firstAt: null,
    };
    cur.donations += 1;
    cur.totalPkr += d.amount_pkr;
    const at = new Date(d.submitted_at).toISOString();
    if (!cur.lastAt || at > cur.lastAt) cur.lastAt = at;
    if (!cur.firstAt || at < cur.firstAt) cur.firstAt = at;
    donorMap.set(key, cur);
  }
  const donors = [...donorMap.values()]
    .map((d) => ({ ...d, totalUsd: usd(d.totalPkr) }))
    .sort((a, b) => b.totalPkr - a.totalPkr);

  const totalPkr = counted.reduce((s, d) => s + d.amount_pkr, 0);
  const elapsed = months.filter((m) => m.state !== 'upcoming' && m.state !== 'not_due');
  return {
    rules: KAFALAT,
    year,
    years,
    orphan: {
      id: String(o.id),
      code: o.code,
      nameEn: o.name_en,
      nameAr: o.name_ar,
      guardianNameEn: o.guardian_name_en,
      guardianNameAr: o.guardian_name_ar,
      guardianIdNumber: o.guardian_id_number,
      orphanIdNumber: o.orphan_id_number,
      dateOfBirth: o.date_of_birth ? isoDate(new Date(o.date_of_birth)) : null,
      age: o.age ?? ageFrom(o.date_of_birth),
      sex: o.sex,
      location: o.location || o.city,
      whatsapp: o.whatsapp,
      listName: o.list_name,
      organization: o.partner_org,
      status: o.status,
      recordKind: o.record_kind,
      photoUrl: o.photo_url || o.poster_url || null,
      monthlyPkr: KAFALAT.monthlyPkr,
    },
    sponsor: sponsorDto(
      sponsor,
      appSponsor
        ? { code: null, name: appSponsor.full_name, phone: appSponsor.phone, email: appSponsor.email, area: null }
        : o.roster_sponsor_code
          ? { code: o.roster_sponsor_code, name: o.roster_sponsor_code }
          : null,
    ),
    stats: {
      totalPkr,
      totalUsd: usd(totalPkr),
      donations: counted.length,
      donors: donors.length,
      monthsPaid: months.filter((m) => m.state === 'paid').length,
      monthsPartial: months.filter((m) => m.state === 'partial').length,
      monthsPending: elapsed.filter((m) => m.state === 'pending').length,
      outstandingPkr: elapsed
        .filter((m) => m.state === 'pending' || m.state === 'partial')
        .reduce((s, m) => s + Math.max(0, KAFALAT.monthlyPkr - m.paidPkr), 0),
      lastDonationAt: donations[0]?.submittedAt ?? null,
    },
    months,
    donors,
    donations,
  };
}

/** One row per child for a month: who paid, who is pending. */
export async function kafalatMonthReport({ year, month, kind = 'orphan' }) {
  const orphans = await query(
    `SELECT o.id, o.code, o.name_en, o.name_ar, o.list_name, o.partner_org, o.status,
            o.roster_sponsor_code, o.photo_url, o.poster_url,
            COALESCE(ks.name, u.full_name) AS sponsor_name,
            COALESCE(ks.phone, u.phone) AS sponsor_phone,
            ks.added_on AS sponsor_since
       FROM orphans o
       LEFT JOIN kafalat_sponsors ks ON ks.code = o.roster_sponsor_code
       LEFT JOIN LATERAL (
         SELECT us.full_name, us.phone FROM sponsorships s JOIN users us ON us.id = s.user_id
          WHERE s.orphan_id = o.id AND s.status = 'active' ORDER BY s.started_at DESC LIMIT 1
       ) u ON true
      WHERE o.record_kind = $1
      ORDER BY NULLIF(regexp_replace(o.code, '\\D', '', 'g'), '')::int NULLS LAST, o.id`,
    [kind],
  );
  const don = await query(
    `SELECT a.orphan_id, a.amount_pkr, a.months, a.submitted_at, a.sponsor_name
       FROM (${ALL_DONATIONS_SQL}) a
      WHERE a.status <> 'rejected' AND a.year = $1 AND $2 = ANY(a.months) AND a.orphan_id IS NOT NULL`,
    [year, month],
  );
  const byOrphan = new Map();
  for (const d of don) {
    const cur = byOrphan.get(String(d.orphan_id)) || { paid: 0, count: 0, last: null, donors: new Set() };
    cur.paid += perMonth(d);
    cur.count += 1;
    cur.donors.add(d.sponsor_name);
    const at = new Date(d.submitted_at).toISOString();
    if (!cur.last || at > cur.last) cur.last = at;
    byOrphan.set(String(d.orphan_id), cur);
  }
  const rows = orphans.map((o) => {
    const agg = byOrphan.get(String(o.id));
    const paid = agg?.paid || 0;
    const hasSponsor = Boolean(o.sponsor_name || o.roster_sponsor_code);
    let state = monthState(paid, year, month, o.sponsor_since);
    if ((state === 'pending' || state === 'not_due') && !hasSponsor) state = 'unsponsored';
    return {
      id: String(o.id),
      code: o.code,
      nameEn: o.name_en,
      nameAr: o.name_ar,
      listName: o.list_name,
      organization: o.partner_org,
      photoUrl: o.photo_url || o.poster_url || null,
      sponsorName: o.sponsor_name || o.roster_sponsor_code || null,
      sponsorPhone: o.sponsor_phone || null,
      paidPkr: paid,
      paidUsd: usd(paid),
      donations: agg?.count || 0,
      donors: agg ? [...agg.donors] : [],
      lastDonationAt: agg?.last || null,
      state,
    };
  });
  const count = (s) => rows.filter((r) => r.state === s).length;
  const received = rows.reduce((s, r) => s + r.paidPkr, 0);
  return {
    rules: KAFALAT,
    year,
    month,
    monthLabel: MONTH_NAMES[month - 1],
    totals: {
      children: rows.length,
      sponsored: rows.filter((r) => r.state !== 'unsponsored').length,
      notDue: count('not_due'),
      paid: count('paid'),
      partial: count('partial'),
      pending: count('pending') + count('upcoming'),
      unsponsored: count('unsponsored'),
      receivedPkr: received,
      receivedUsd: usd(received),
      expectedPkr:
        rows.filter((r) => r.state !== 'unsponsored' && r.state !== 'not_due').length *
        KAFALAT.monthlyPkr,
    },
    rows,
  };
}

export async function addDonation(orphanId, body) {
  const o = await queryOne('SELECT id, code, name_en, name_ar, roster_sponsor_code FROM orphans WHERE id = $1', [orphanId]);
  if (!o) {
    const err = new Error('Child not found');
    err.status = 404;
    throw err;
  }
  const amount = Number.parseInt(String(body.amountPkr ?? ''), 10);
  const sponsorName = clean(body.sponsorName);
  const months = (Array.isArray(body.months) ? body.months : parseMonths(body.months))
    .map(Number)
    .filter((m) => m >= 1 && m <= 12);
  const year = Number.parseInt(String(body.year ?? ''), 10);
  const when = body.submittedAt ? new Date(body.submittedAt) : new Date();
  const errors = {};
  if (!sponsorName) errors.sponsorName = 'Donor name is required';
  if (!Number.isFinite(amount) || amount <= 0) errors.amountPkr = 'Amount is required';
  if (months.length === 0) errors.months = 'Select at least one month';
  if (!Number.isFinite(year) || year < 2020 || year > 2100) errors.year = 'Year is required';
  if (Number.isNaN(when.getTime())) errors.submittedAt = 'Invalid date';
  if (Object.keys(errors).length) {
    const err = new Error(Object.values(errors)[0]);
    err.status = 422;
    throw err;
  }
  return queryOne(
    `INSERT INTO kafalat_donations (
       orphan_id, orphan_code, orphan_name, sponsor_code, sponsor_name, sponsor_phone,
       year, months, amount_pkr, submitted_at, attachment_urls, note, status, source
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'manual') RETURNING id`,
    [
      o.id, o.code, o.name_en || o.name_ar, clean(body.sponsorCode) || o.roster_sponsor_code,
      sponsorName, clean(body.sponsorPhone), year, months, amount, when,
      clean(body.attachmentUrl), clean(body.note),
      body.status === 'verified' ? 'verified' : 'received',
    ],
  );
}

/** Submissions whose orphan code could not be matched to a child. */
export async function unmatchedDonations() {
  const rows = await query(
    `SELECT id, raw_code, orphan_name, sponsor_name, sponsor_phone, year, months, amount_pkr,
            submitted_at, attachment_urls, note, status, bank
       FROM kafalat_donations WHERE orphan_id IS NULL ORDER BY submitted_at DESC`,
  );
  return rows.map((d) => ({
    id: String(d.id),
    rawCode: d.raw_code,
    orphanName: d.orphan_name,
    sponsorName: d.sponsor_name,
    sponsorPhone: d.sponsor_phone,
    year: d.year,
    monthLabels: (d.months || []).map((m) => MONTH_NAMES[m - 1]),
    amountPkr: d.amount_pkr,
    submittedAt: new Date(d.submitted_at).toISOString(),
    attachments: d.attachment_urls ? String(d.attachment_urls).split(',').map((x) => x.trim()).filter(Boolean) : [],
    note: d.note,
    status: d.status,
    bank: d.bank,
  }));
}

/** Link an unmatched submission to a child by code. */
export async function assignDonation(id, code) {
  const o = await queryOne('SELECT id, code, name_en, name_ar, roster_sponsor_code FROM orphans WHERE upper(code) = upper($1)', [
    String(code || '').trim(),
  ]);
  if (!o) {
    const err = new Error(`No child with code ${code}`);
    err.status = 404;
    throw err;
  }
  const row = await queryOne(
    `UPDATE kafalat_donations SET orphan_id = $1, orphan_code = $2, orphan_name = COALESCE($3, orphan_name),
            sponsor_code = COALESCE(sponsor_code, $4)
      WHERE id = $5 RETURNING id`,
    [o.id, o.code, o.name_en || o.name_ar, o.roster_sponsor_code, id],
  );
  if (!row) {
    const err = new Error('Donation not found');
    err.status = 404;
    throw err;
  }
  return o;
}

/** Event registrations export (EventRegistration_Export_*.xls → CSV). */
export async function importEvents(rows) {
  let imported = 0;
  let updated = 0;
  await withTransaction(async (client) => {
    for (const r of rows) {
      const name = clean(pick(r, ['Full Name', 'Name']));
      if (!name) continue;
      const res = await client.query(
        `INSERT INTO fop_event_registrations (
           external_id, event, full_name, phone, email, address, heard_from, persons,
           payment_upload, note, status, added_on
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (external_id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note,
           payment_upload = EXCLUDED.payment_upload
         RETURNING (xmax = 0) AS inserted`,
        [
          Number.parseInt(pick(r, ['ID']), 10) || null,
          clean(pick(r, ['Event Description', 'Event'])) || 'Event',
          name,
          clean(pick(r, ['Contact Number (WhatsApp)', 'Contact Number', 'Phone'])),
          clean(pick(r, ['Email Address', 'Email'])),
          clean(pick(r, ['Address'])),
          clean(pick(r, ['How did you hear about this event?', 'Source'])),
          Number.parseInt(pick(r, ['Number of Accompanying Persons', 'Persons']), 10) || 1,
          clean(pick(r, ['Payment Upload'])),
          clean(pick(r, ['Note'])),
          clean(pick(r, ['Status'])),
          parseDateTime(pick(r, ['Added On'])),
        ],
      );
      if (res.rows[0]?.inserted) imported += 1;
      else updated += 1;
    }
  });
  return { imported, updated };
}

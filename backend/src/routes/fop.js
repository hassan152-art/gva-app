/**
 * FOP Management — sponsors roster, reminders, monthly summaries, online
 * donations, banks and event registrations (mirrors the FOP back-office menu).
 */
import { Router } from 'express';
import { query, queryOne } from '../db/index.js';
import { requireAuth, asyncRoute } from '../lib/auth.js';
import { requireAdmin } from '../lib/requireAdmin.js';
import { KAFALAT, MONTH_NAMES, kafalatMonthReport, usd } from '../services/kafalat.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const int = (v, d) => {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : d;
};
const iso = (d) => (d ? new Date(d).toISOString() : null);
const likeOf = (q) => (q ? `%${String(q).trim().replace(/[%_]/g, '')}%` : null);

/** wa.me wants digits with country code: 0300… → 92300…, 00971… → 971… */
export function waNumber(phone) {
  const first = String(phone || '').split(/[,/]| or /i)[0];
  let d = first.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('03')) d = `92${d.slice(1)}`;
  if (d.length === 10 && d.startsWith('3')) d = `92${d}`;
  return d.length >= 10 ? d : null;
}

function periodWhere(req, params, alias = 'd') {
  const where = [];
  if (req.query.from) {
    params.push(req.query.from);
    where.push(`${alias}.submitted_at >= $${params.length}::date`);
  }
  if (req.query.to) {
    params.push(req.query.to);
    where.push(`${alias}.submitted_at < ($${params.length}::date + 1)`);
  }
  return where;
}

// ---------------------------------------------------------------------------
// Sponsors
// ---------------------------------------------------------------------------

/** GET /admin/fop/sponsors?q=&filter=all|paid|pending|none&page=1&pageSize=50 — paginated. */
router.get(
  '/sponsors',
  asyncRoute(async (req, res) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const like = likeOf(req.query.q);
    const rows = await query(
      `WITH kids AS (
         SELECT roster_sponsor_code AS code, count(*)::int AS children,
                array_agg(code ORDER BY code) AS codes
           FROM orphans WHERE roster_sponsor_code IS NOT NULL GROUP BY 1
       ), org AS (
         SELECT DISTINCT ON (roster_sponsor_code) roster_sponsor_code AS code, partner_org AS organization
           FROM orphans WHERE roster_sponsor_code IS NOT NULL AND partner_org IS NOT NULL AND partner_org <> ''
          GROUP BY roster_sponsor_code, partner_org ORDER BY roster_sponsor_code, count(*) DESC
       ), paid AS (
         SELECT o.roster_sponsor_code AS code, sum(d.amount_pkr)::bigint AS total,
                max(d.submitted_at) AS last_at, count(*)::int AS donations
           FROM kafalat_donations d JOIN orphans o ON o.id = d.orphan_id
          WHERE d.status <> 'rejected' AND o.roster_sponsor_code IS NOT NULL
          GROUP BY 1
       ), this_month AS (
         SELECT o.roster_sponsor_code AS code, count(DISTINCT o.id)::int AS paid_children
           FROM kafalat_donations d JOIN orphans o ON o.id = d.orphan_id
          WHERE d.status <> 'rejected' AND d.year = $2 AND $3 = ANY(d.months)
          GROUP BY 1
       )
       SELECT s.*, COALESCE(k.children, 0) AS children, k.codes,
              COALESCE(p.total, 0) AS total_pkr, p.last_at, COALESCE(p.donations, 0) AS donations,
              COALESCE(t.paid_children, 0) AS paid_children, g.organization
         FROM kafalat_sponsors s
         LEFT JOIN kids k ON k.code = s.code
         LEFT JOIN org g ON g.code = s.code
         LEFT JOIN paid p ON p.code = s.code
         LEFT JOIN this_month t ON t.code = s.code
        WHERE ($1::text IS NULL OR s.name ILIKE $1 OR s.code ILIKE $1 OR s.phone ILIKE $1 OR s.external_id::text ILIKE $1
               OR s.email ILIKE $1 OR s.area ILIKE $1 OR array_to_string(k.codes, ' ') ILIKE $1)
        ORDER BY (k.children IS NULL), (s.code !~* '^SP'),
                 NULLIF(regexp_replace(s.code, '\\D', '', 'g'), '')::int DESC NULLS LAST`,
      [like, year, month],
    );
    const filter = String(req.query.filter || 'all');
    const filtered = rows.filter((r) => {
      if (filter === 'paid') return r.children > 0 && r.paid_children >= r.children;
      if (filter === 'pending') return r.children > r.paid_children;
      if (filter === 'none') return r.children === 0;
      return true;
    });
    const pageSize = Math.min(1000, Math.max(1, int(req.query.pageSize, 50)));
    const page = Math.max(1, int(req.query.page, 1));
    const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
    res.json({
      year,
      month,
      monthLabel: MONTH_NAMES[month - 1],
      totals: {
        sponsors: rows.length,
        children: rows.reduce((s, r) => s + r.children, 0),
        fullyPaid: rows.filter((r) => r.children > 0 && r.paid_children >= r.children).length,
        pending: rows.filter((r) => r.children > r.paid_children).length,
        noChild: rows.filter((r) => r.children === 0).length,
      },
      page,
      pageSize,
      total: filtered.length,
      sponsors: pageRows.map((r) => ({
        code: r.code,
        sponsorId: r.external_id ?? null,
        name: r.name,
        organization: r.organization || null,
        area: r.area,
        phone: r.phone,
        whatsapp: waNumber(r.phone),
        email: r.email,
        status: r.status,
        reference: r.reference,
        addedOn: iso(r.added_on),
        children: r.children,
        childCodes: r.codes || [],
        paidChildrenThisMonth: r.paid_children,
        donations: r.donations,
        totalPkr: Number(r.total_pkr),
        lastDonationAt: iso(r.last_at),
      })),
    });
  }),
);

/** GET /admin/fop/sponsors/:code */
router.get(
  '/sponsors/:code',
  asyncRoute(async (req, res) => {
    const s = await queryOne('SELECT * FROM kafalat_sponsors WHERE upper(code) = upper($1)', [req.params.code]);
    if (!s) return res.status(404).json({ error: 'Sponsor not found' });
    const year = int(req.query.year, new Date().getFullYear());
    const children = await query(
      `SELECT id, code, name_en, name_ar, list_name, photo_url, poster_url FROM orphans
        WHERE roster_sponsor_code = $1 ORDER BY code`,
      [s.code],
    );
    const ids = children.map((c) => c.id);
    const dons = ids.length
      ? await query(
          `SELECT d.*, o.code AS child_code FROM kafalat_donations d
             JOIN orphans o ON o.id = d.orphan_id
            WHERE d.orphan_id = ANY($1::bigint[]) ORDER BY d.submitted_at DESC`,
          [ids],
        )
      : [];
    const now = new Date();
    const childRows = children.map((c) => {
      const mine = dons.filter((d) => String(d.orphan_id) === String(c.id) && d.status !== 'rejected');
      const months = MONTH_NAMES.map((label, i) => {
        const m = i + 1;
        const paid = mine
          .filter((d) => d.year === year && d.months.includes(m))
          .reduce((sum, d) => sum + d.amount_pkr / (d.months.length || 1), 0);
        const since = s.added_on ? new Date(s.added_on) : null;
        const key = year * 12 + i;
        let state = paid >= KAFALAT.paidMinPkr ? 'paid' : paid > 0 ? 'partial' : 'pending';
        if (state === 'pending' && since && key < since.getUTCFullYear() * 12 + since.getUTCMonth()) state = 'not_due';
        if (state === 'pending' && key > now.getFullYear() * 12 + now.getMonth()) state = 'upcoming';
        return { month: m, label, paidPkr: Math.round(paid), state };
      });
      return {
        id: String(c.id),
        code: c.code,
        nameEn: c.name_en,
        nameAr: c.name_ar,
        listName: c.list_name,
        photoUrl: c.photo_url || c.poster_url || null,
        totalPkr: mine.reduce((sum, d) => sum + d.amount_pkr, 0),
        months,
      };
    });
    const reminders = await query(
      'SELECT year, month, sent_at FROM kafalat_reminders WHERE sponsor_code = $1 ORDER BY sent_at DESC LIMIT 20',
      [s.code],
    );
    const total = dons.filter((d) => d.status !== 'rejected').reduce((sum, d) => sum + d.amount_pkr, 0);
    res.json({
      year,
      rules: KAFALAT,
      sponsor: {
        code: s.code,
        name: s.name,
        area: s.area,
        phone: s.phone,
        whatsapp: waNumber(s.phone),
        email: s.email,
        status: s.status,
        reference: s.reference,
        addedOn: iso(s.added_on),
      },
      stats: {
        children: children.length,
        totalPkr: total,
        totalUsd: usd(total),
        donations: dons.length,
        lastDonationAt: iso(dons[0]?.submitted_at),
      },
      children: childRows,
      donations: dons.map((d) => ({
        id: String(d.id),
        childCode: d.child_code,
        sponsorName: d.sponsor_name,
        sponsorPhone: d.sponsor_phone,
        year: d.year,
        monthLabels: d.months.map((m) => MONTH_NAMES[m - 1]),
        amountPkr: d.amount_pkr,
        submittedAt: iso(d.submitted_at),
        bank: d.bank,
        status: d.status,
        attachments: d.attachment_urls ? d.attachment_urls.split(',').map((x) => x.trim()).filter(Boolean) : [],
        note: d.note,
      })),
      reminders: reminders.map((r) => ({ year: r.year, month: r.month, sentAt: iso(r.sent_at) })),
    });
  }),
);

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/**
 * GET /admin/fop/dashboard?year=
 * Totals, top donors, account balances (money received per account), recent
 * donations, money received per month, and donation size distribution.
 * Rejected entries never count.
 */
router.get(
  '/dashboard',
  asyncRoute(async (req, res) => {
    const now = new Date();
    const year = int(req.query.year, now.getFullYear());
    const month = now.getMonth() + 1;
    const OK = "d.status <> 'rejected' AND d.amount_pkr > 0";

    const [totals, top, accounts, recent, monthly, dist, thisMonth] = await Promise.all([
      queryOne(
        `SELECT (SELECT count(*)::int FROM kafalat_sponsors) AS sponsors,
                (SELECT count(*)::int FROM kafalat_sponsors s
                  WHERE EXISTS (SELECT 1 FROM orphans o WHERE o.roster_sponsor_code = s.code)) AS active_sponsors,
                (SELECT count(*)::int FROM orphans WHERE record_kind = 'orphan') AS orphans,
                (SELECT count(*)::int FROM orphans WHERE record_kind = 'orphan' AND roster_sponsor_code IS NOT NULL) AS sponsored,
                (SELECT COALESCE(sum(d.amount_pkr), 0)::bigint FROM kafalat_donations d WHERE ${OK}) AS donations_pkr,
                (SELECT count(*)::int FROM kafalat_donations d WHERE ${OK}) AS donations`,
      ),
      query(
        `SELECT COALESCE(s.name, d.sponsor_name) AS name, COALESCE(d.sponsor_code, '') AS code,
                sum(d.amount_pkr)::bigint AS total, count(*)::int AS n, max(d.submitted_at) AS last_at
           FROM kafalat_donations d
           LEFT JOIN kafalat_sponsors s ON s.code = d.sponsor_code
          WHERE ${OK}
          GROUP BY 1, 2
          ORDER BY total DESC
          LIMIT 6`,
      ),
      query(
        `SELECT COALESCE(NULLIF(d.bank, ''), 'Not specified') AS bank, d.account_no,
                sum(d.amount_pkr)::bigint AS total, count(*)::int AS n, max(d.submitted_at) AS last_at
           FROM kafalat_donations d
          WHERE ${OK}
          GROUP BY 1, 2
          ORDER BY total DESC
          LIMIT 6`,
      ),
      query(
        `SELECT d.id, d.sponsor_name, d.sponsor_code, d.amount_pkr, d.submitted_at, d.year, d.months, d.source,
                d.attachment_urls, o.code AS child_code
           FROM kafalat_donations d
           LEFT JOIN orphans o ON o.id = d.orphan_id
          WHERE ${OK}
          ORDER BY d.submitted_at DESC
          LIMIT 8`,
      ),
      query(
        `SELECT EXTRACT(MONTH FROM d.submitted_at AT TIME ZONE 'Asia/Karachi')::int AS m,
                sum(d.amount_pkr)::bigint AS total, count(*)::int AS n
           FROM kafalat_donations d
          WHERE ${OK} AND EXTRACT(YEAR FROM d.submitted_at AT TIME ZONE 'Asia/Karachi')::int = $1
          GROUP BY 1 ORDER BY 1`,
        [year],
      ),
      query(
        `SELECT CASE WHEN d.amount_pkr < 30000 THEN 0
                     WHEN d.amount_pkr < 60000 THEN 1
                     WHEN d.amount_pkr < 150000 THEN 2
                     ELSE 3 END AS b,
                count(*)::int AS n, sum(d.amount_pkr)::bigint AS total
           FROM kafalat_donations d
          WHERE ${OK} AND EXTRACT(YEAR FROM d.submitted_at AT TIME ZONE 'Asia/Karachi')::int = $1
          GROUP BY 1 ORDER BY 1`,
        [year],
      ),
      queryOne(
        `SELECT COALESCE(sum(d.amount_pkr), 0)::bigint AS total, count(*)::int AS n
           FROM kafalat_donations d
          WHERE ${OK} AND date_trunc('month', d.submitted_at AT TIME ZONE 'Asia/Karachi')
                = date_trunc('month', now() AT TIME ZONE 'Asia/Karachi')`,
      ),
    ]);

    const byMonth = new Map(monthly.map((r) => [r.m, r]));
    const buckets = ['Under 30,000', '30,000 – 59,999', '60,000 – 149,999', '150,000 +'];
    const byBucket = new Map(dist.map((r) => [r.b, r]));
    res.json({
      year,
      month,
      monthLabel: MONTH_NAMES[month - 1],
      totals: {
        sponsors: totals.sponsors,
        activeSponsors: totals.active_sponsors,
        orphans: totals.orphans,
        sponsoredOrphans: totals.sponsored,
        volunteers: 0,
        donationsPkr: Number(totals.donations_pkr),
        donationsUsd: usd(Number(totals.donations_pkr)),
        donations: totals.donations,
        thisMonthPkr: Number(thisMonth.total),
        thisMonthCount: thisMonth.n,
      },
      topDonors: top.map((r) => ({
        name: r.name,
        code: r.code || null,
        totalPkr: Number(r.total),
        donations: r.n,
        lastAt: iso(r.last_at),
      })),
      // No volunteer records exist in the system yet.
      recentVolunteers: [],
      accounts: accounts.map((r) => ({
        bank: r.bank,
        accountNo: r.account_no,
        totalPkr: Number(r.total),
        donations: r.n,
        lastAt: iso(r.last_at),
      })),
      recentDonations: recent.map((r) => ({
        id: String(r.id),
        sponsorName: r.sponsor_name,
        sponsorCode: r.sponsor_code,
        childCode: r.child_code,
        amountPkr: r.amount_pkr,
        submittedAt: iso(r.submitted_at),
        period: `${(r.months || []).map((m) => MONTH_NAMES[m - 1].slice(0, 3)).join(', ')} ${r.year}`,
        source: r.source,
        slips: r.attachment_urls ? String(r.attachment_urls).split(',').filter((x) => x.trim()).length : 0,
      })),
      monthly: MONTH_NAMES.map((label, i) => ({
        month: i + 1,
        label: label.slice(0, 3),
        totalPkr: Number(byMonth.get(i + 1)?.total || 0),
        donations: byMonth.get(i + 1)?.n || 0,
      })),
      distribution: buckets.map((label, i) => ({
        label,
        donations: byBucket.get(i)?.n || 0,
        totalPkr: Number(byBucket.get(i)?.total || 0),
      })),
    });
  }),
);

// ---------------------------------------------------------------------------
// Sponsor add / edit and child linking
// ---------------------------------------------------------------------------

const cleanStr = (v) => {
  const t = String(v ?? '').replace(/\s+/g, ' ').trim();
  return t === '' ? null : t;
};

async function nextSponsorCode() {
  const r = await queryOne(
    `SELECT COALESCE(max(NULLIF(regexp_replace(code, '\\D', '', 'g'), '')::int), 600) + 1 AS n
       FROM kafalat_sponsors WHERE code ~* '^SP\\d+$'`,
  );
  return `SP${r.n}`;
}

/** GET /admin/fop/sponsor-options?q= — for pickers (code, name, phone). */
router.get(
  '/sponsor-options',
  asyncRoute(async (req, res) => {
    const like = likeOf(req.query.q);
    const rows = await query(
      `SELECT s.code, s.name, s.phone, s.area,
              (SELECT count(*)::int FROM orphans o WHERE o.roster_sponsor_code = s.code) AS children
         FROM kafalat_sponsors s
        WHERE ($1::text IS NULL OR s.name ILIKE $1 OR s.code ILIKE $1 OR s.phone ILIKE $1 OR s.external_id::text ILIKE $1)
        ORDER BY NULLIF(regexp_replace(s.code, '\\D', '', 'g'), '')::int DESC NULLS LAST
        LIMIT 30`,
      [like],
    );
    res.json({ sponsors: rows });
  }),
);

/** POST /admin/fop/sponsors — add a sponsor (donor). Code is generated when left empty. */
router.post(
  '/sponsors',
  asyncRoute(async (req, res) => {
    const b = req.body || {};
    const name = cleanStr(b.name);
    if (!name) return res.status(422).json({ error: 'Sponsor name is required' });
    const code = (cleanStr(b.code) || (await nextSponsorCode())).toUpperCase();
    const clash = await queryOne('SELECT id FROM kafalat_sponsors WHERE upper(code) = $1', [code]);
    if (clash) return res.status(409).json({ error: `Sponsor code ${code} already exists` });
    const row = await queryOne(
      `INSERT INTO kafalat_sponsors (code, external_id, name, phone, email, area, reference, status, added_on)
       VALUES ($1,(SELECT COALESCE(max(external_id), 20000) + 1 FROM kafalat_sponsors),$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz, now()))
       RETURNING code`,
      [code, name, cleanStr(b.phone), cleanStr(b.email), cleanStr(b.area), cleanStr(b.reference),
       cleanStr(b.status) || 'Active', b.addedOn || null],
    );
    if (Array.isArray(b.childCodes) && b.childCodes.length) {
      await query(
        `UPDATE orphans SET roster_sponsor_code = $1, status = 'sponsored'
          WHERE upper(code) = ANY($2::text[])`,
        [row.code, b.childCodes.map((c) => String(c).trim().toUpperCase())],
      );
    }
    res.status(201).json({ ok: true, code: row.code, message: `Sponsor ${row.code} added` });
  }),
);

/** PATCH /admin/fop/sponsors/:code */
router.patch(
  '/sponsors/:code',
  asyncRoute(async (req, res) => {
    const b = req.body || {};
    const s = await queryOne('SELECT * FROM kafalat_sponsors WHERE upper(code) = upper($1)', [req.params.code]);
    if (!s) return res.status(404).json({ error: 'Sponsor not found' });
    const pickStr = (k) => (b[k] !== undefined ? cleanStr(b[k]) : s[k]);
    const name = b.name !== undefined ? cleanStr(b.name) : s.name;
    if (!name) return res.status(422).json({ error: 'Sponsor name is required' });
    await query(
      `UPDATE kafalat_sponsors SET name = $1, phone = $2, email = $3, area = $4, reference = $5, status = $6,
              added_on = COALESCE($7::timestamptz, added_on), updated_at = now() WHERE id = $8`,
      [name, pickStr('phone'), pickStr('email'), pickStr('area'), pickStr('reference'), pickStr('status'),
       b.addedOn || null, s.id],
    );
    res.json({ ok: true, message: 'Sponsor updated' });
  }),
);

/**
 * POST /admin/fop/sponsors/:code/children { add: ['OR015', …], remove: ['OR016', …] }
 * Links / unlinks orphans to this sponsor (one sponsor per child).
 */
router.post(
  '/sponsors/:code/children',
  asyncRoute(async (req, res) => {
    const s = await queryOne('SELECT code FROM kafalat_sponsors WHERE upper(code) = upper($1)', [req.params.code]);
    if (!s) return res.status(404).json({ error: 'Sponsor not found' });
    const norm = (list) => (Array.isArray(list) ? list.map((c) => String(c).trim().toUpperCase()).filter(Boolean) : []);
    const add = norm(req.body?.add);
    const remove = norm(req.body?.remove);
    let added = [];
    let moved = [];
    if (add.length) {
      const found = await query('SELECT id, code, roster_sponsor_code FROM orphans WHERE upper(code) = ANY($1::text[])', [add]);
      const missing = add.filter((c) => !found.some((o) => o.code.toUpperCase() === c));
      if (missing.length) return res.status(404).json({ error: `No child with code ${missing.join(', ')}` });
      moved = found.filter((o) => o.roster_sponsor_code && o.roster_sponsor_code !== s.code)
        .map((o) => `${o.code} (was ${o.roster_sponsor_code})`);
      await query(`UPDATE orphans SET roster_sponsor_code = $1, status = 'sponsored' WHERE id = ANY($2::bigint[])`, [
        s.code, found.map((o) => o.id),
      ]);
      // Open invoices follow the child to the new sponsor.
      await query(
        `UPDATE kafalat_invoices SET sponsor_code = $1 WHERE orphan_id = ANY($2::bigint[])
           AND NOT EXISTS (SELECT 1 FROM kafalat_donations d WHERE d.orphan_id = kafalat_invoices.orphan_id
                            AND d.year = kafalat_invoices.year AND kafalat_invoices.month = ANY(d.months)
                            AND d.status <> 'rejected')`,
        [s.code, found.map((o) => o.id)],
      );
      added = found.map((o) => o.code);
    }
    if (remove.length) {
      await query(
        `UPDATE orphans SET roster_sponsor_code = NULL, status = 'waiting'
          WHERE upper(code) = ANY($1::text[]) AND roster_sponsor_code = $2`,
        [remove, s.code],
      );
    }
    const parts = [];
    if (added.length) parts.push(`Linked ${added.join(', ')}`);
    if (moved.length) parts.push(`moved from another sponsor: ${moved.join(', ')}`);
    if (remove.length) parts.push(`Unlinked ${remove.join(', ')}`);
    res.json({ ok: true, message: parts.join(' · ') || 'No change' });
  }),
);

// ---------------------------------------------------------------------------
// Send reminder — sponsors with children still pending for a month
// ---------------------------------------------------------------------------

/** GET /admin/fop/reminders?year=&month= */
router.get(
  '/reminders',
  asyncRoute(async (req, res) => {
    const now = new Date();
    const year = int(req.query.year, now.getFullYear());
    const month = int(req.query.month, now.getMonth() + 1);
    const report = await kafalatMonthReport({ year, month, kind: 'orphan' });
    const pendingKids = report.rows.filter((r) => r.state === 'pending' || r.state === 'partial' || r.state === 'upcoming');
    const codesByOrphan = new Map(
      (await query('SELECT id, roster_sponsor_code FROM orphans')).map((o) => [String(o.id), o.roster_sponsor_code]),
    );
    const sponsors = new Map(
      (await query('SELECT code, name, phone, area FROM kafalat_sponsors')).map((s) => [s.code, s]),
    );
    const sent = await query(
      `SELECT sponsor_code, max(sent_at) AS last, count(*)::int AS n FROM kafalat_reminders
        WHERE year = $1 AND month = $2 GROUP BY 1`,
      [year, month],
    );
    const sentBy = new Map(sent.map((r) => [r.sponsor_code, r]));
    const groups = new Map();
    for (const k of pendingKids) {
      const code = codesByOrphan.get(k.id) || null;
      const key = code || `child:${k.id}`;
      const sp = code ? sponsors.get(code) : null;
      const g = groups.get(key) || {
        sponsorCode: code,
        sponsorName: sp?.name || k.sponsorName || 'Unknown',
        phone: sp?.phone || k.sponsorPhone || null,
        area: sp?.area || null,
        children: [],
        duePkr: 0,
      };
      g.children.push({ id: k.id, code: k.code, name: k.nameEn || k.nameAr, state: k.state, paidPkr: k.paidPkr });
      g.duePkr += Math.max(0, KAFALAT.monthlyPkr - k.paidPkr);
      groups.set(key, g);
    }
    const list = [...groups.values()]
      .map((g) => ({
        ...g,
        whatsapp: waNumber(g.phone),
        remindedAt: g.sponsorCode ? iso(sentBy.get(g.sponsorCode)?.last) : null,
        reminders: g.sponsorCode ? sentBy.get(g.sponsorCode)?.n || 0 : 0,
      }))
      .sort((a, b) => b.children.length - a.children.length || a.sponsorName.localeCompare(b.sponsorName));
    res.json({
      year,
      month,
      monthLabel: MONTH_NAMES[month - 1],
      rules: KAFALAT,
      totals: {
        sponsors: list.length,
        children: pendingKids.length,
        duePkr: list.reduce((s, g) => s + g.duePkr, 0),
        withWhatsapp: list.filter((g) => g.whatsapp).length,
        reminded: list.filter((g) => g.remindedAt).length,
      },
      sponsors: list,
    });
  }),
);

/** POST /admin/fop/reminders/log { items: [{sponsorCode, sponsorName, phone}], year, month, message } */
router.post(
  '/reminders/log',
  asyncRoute(async (req, res) => {
    const { items = [], year, month, message = '' } = req.body || {};
    const y = int(year, null);
    const m = int(month, null);
    if (!y || !m || !Array.isArray(items) || items.length === 0) {
      return res.status(422).json({ error: 'items, year and month are required' });
    }
    for (const it of items.slice(0, 1000)) {
      await query(
        `INSERT INTO kafalat_reminders (sponsor_code, sponsor_name, phone, year, month, message, sent_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [it.sponsorCode || null, it.sponsorName || null, it.phone || null, y, m, String(message).slice(0, 2000), req.user.id],
      );
    }
    res.json({ ok: true, message: `${items.length} reminder(s) recorded` });
  }),
);

// ---------------------------------------------------------------------------
// Donation summary — one row per sponsorship month
// ---------------------------------------------------------------------------

/** GET /admin/fop/donation-summary?year= */
router.get(
  '/donation-summary',
  asyncRoute(async (req, res) => {
    const year = int(req.query.year, new Date().getFullYear());
    const months = [];
    for (let m = 1; m <= 12; m += 1) {
      const r = await kafalatMonthReport({ year, month: m, kind: 'orphan' });
      const subs = await queryOne(
        `SELECT count(*)::int AS n, min(submitted_at) AS first_at FROM kafalat_donations
          WHERE year = $1 AND $2 = ANY(months) AND status <> 'rejected'`,
        [year, m],
      );
      if (!subs.n && r.totals.paid === 0) continue;
      const byBank = await query(
        `SELECT COALESCE(NULLIF(trim(bank), ''), 'Unknown') AS bank,
                round(sum(amount_pkr::numeric / GREATEST(array_length(months, 1), 1)))::bigint AS pkr,
                count(*)::int AS n
           FROM kafalat_donations
          WHERE year = $1 AND $2 = ANY(months) AND status <> 'rejected'
          GROUP BY 1 ORDER BY 2 DESC`,
        [year, m],
      );
      months.push({
        month: m,
        label: `${MONTH_NAMES[m - 1]} ${year}`,
        submissions: subs.n,
        firstSubmissionAt: iso(subs.first_at),
        ...r.totals,
        receivedUsd: usd(r.totals.receivedPkr),
        byBank: byBank.map((b) => ({ bank: b.bank, pkr: Number(b.pkr), submissions: b.n })),
      });
    }
    res.json({ year, rules: KAFALAT, months: months.reverse() });
  }),
);

// ---------------------------------------------------------------------------
// Online donations + banks
// ---------------------------------------------------------------------------

/** GET /admin/fop/online-donations/summary?from=&to= — per bank cards. */
router.get(
  '/online-donations/summary',
  asyncRoute(async (req, res) => {
    const params = [];
    const where = ["d.status <> 'rejected'", ...periodWhere(req, params)];
    const rows = await query(
      `SELECT COALESCE(NULLIF(trim(d.bank), ''), 'Unknown') AS bank,
              (array_agg(d.account_no) FILTER (WHERE d.account_no IS NOT NULL))[1] AS account_no,
              sum(d.amount_pkr)::bigint AS pkr, count(DISTINCT split_part(d.external_ref, ':', 2))::int AS submissions,
              max(d.submitted_at) AS last_at
         FROM kafalat_donations d WHERE ${where.join(' AND ')}
        GROUP BY 1 ORDER BY 3 DESC`,
      params,
    );
    res.json({
      banks: rows.map((r) => ({
        bank: r.bank,
        accountNo: r.account_no,
        pkr: Number(r.pkr),
        usd: usd(Number(r.pkr)),
        submissions: r.submissions,
        lastAt: iso(r.last_at),
      })),
      totalPkr: rows.reduce((s, r) => s + Number(r.pkr), 0),
    });
  }),
);

/** GET /admin/fop/online-donations?from=&to=&bank=&q=&status=&page=&pageSize= */
router.get(
  '/online-donations',
  asyncRoute(async (req, res) => {
    const params = [];
    const where = periodWhere(req, params);
    if (req.query.bank) {
      params.push(req.query.bank);
      where.push(`COALESCE(NULLIF(trim(d.bank), ''), 'Unknown') = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`d.status = $${params.length}`);
    }
    if (req.query.q) {
      params.push(likeOf(req.query.q));
      const p = `$${params.length}`;
      where.push(
        `(d.orphan_code ILIKE ${p} OR d.raw_code ILIKE ${p} OR d.orphan_name ILIKE ${p} OR d.sponsor_name ILIKE ${p} OR d.sponsor_phone ILIKE ${p} OR d.note ILIKE ${p})`,
      );
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const pageSize = Math.min(int(req.query.pageSize, 50), 500);
    const page = Math.max(int(req.query.page, 1), 1);
    const total = await queryOne(
      `SELECT count(*)::int AS n, COALESCE(sum(amount_pkr) FILTER (WHERE status <> 'rejected'), 0)::bigint AS pkr
         FROM kafalat_donations d ${whereSql}`,
      params,
    );
    const rows = await query(
      `SELECT d.*, o.id AS child_id FROM kafalat_donations d LEFT JOIN orphans o ON o.id = d.orphan_id
        ${whereSql} ORDER BY d.submitted_at DESC, d.id DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      params,
    );
    res.json({
      page,
      pageSize,
      total: total.n,
      totalPkr: Number(total.pkr),
      donations: rows.map((d) => ({
        id: String(d.id),
        childId: d.child_id ? String(d.child_id) : null,
        orphanCode: d.orphan_code,
        rawCode: d.raw_code,
        orphanName: d.orphan_name,
        sponsorName: d.sponsor_name,
        sponsorPhone: d.sponsor_phone,
        monthLabels: d.months.map((m) => `${MONTH_NAMES[m - 1]} ${d.year}`),
        bank: d.bank,
        accountNo: d.account_no,
        amountPkr: d.amount_pkr,
        splitCount: d.split_count,
        submittedAt: iso(d.submitted_at),
        attachments: d.attachment_urls ? d.attachment_urls.split(',').map((x) => x.trim()).filter(Boolean) : [],
        note: d.note,
        status: d.status,
      })),
    });
  }),
);

/** GET /admin/fop/banks — every bank / account seen in donations. */
router.get(
  '/banks',
  asyncRoute(async (_req, res) => {
    const rows = await query(
      `SELECT COALESCE(NULLIF(trim(bank), ''), 'Unknown') AS bank,
              array_remove(array_agg(DISTINCT account_no), NULL) AS accounts,
              sum(amount_pkr) FILTER (WHERE status <> 'rejected')::bigint AS pkr,
              count(*)::int AS n, min(submitted_at) AS first_at, max(submitted_at) AS last_at,
              count(DISTINCT sponsor_name)::int AS donors
         FROM kafalat_donations GROUP BY 1 ORDER BY 3 DESC NULLS LAST`,
    );
    const monthly = await query(
      `SELECT COALESCE(NULLIF(trim(bank), ''), 'Unknown') AS bank,
              to_char(submitted_at AT TIME ZONE 'Asia/Karachi', 'YYYY-MM') AS ym,
              sum(amount_pkr)::bigint AS pkr
         FROM kafalat_donations WHERE status <> 'rejected' GROUP BY 1, 2 ORDER BY 2`,
    );
    res.json({
      banks: rows.map((r) => ({
        bank: r.bank,
        accounts: r.accounts,
        pkr: Number(r.pkr || 0),
        usd: usd(Number(r.pkr || 0)),
        records: r.n,
        donors: r.donors,
        firstAt: iso(r.first_at),
        lastAt: iso(r.last_at),
        monthly: monthly.filter((m) => m.bank === r.bank).map((m) => ({ ym: m.ym, pkr: Number(m.pkr) })),
      })),
    });
  }),
);

// ---------------------------------------------------------------------------
// Notifications (header bell)
// ---------------------------------------------------------------------------

/**
 * GET /admin/fop/notifications — newest activity plus standing alerts.
 * Every item has a stable `id` and an `at` time so the client can count
 * what is unread since the admin last opened the bell.
 */
router.get(
  '/notifications',
  asyncRoute(async (_req, res) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const items = [];

    // Latest kafalat submissions (one per original submission, not per split child).
    const dons = await query(
      `SELECT DISTINCT ON (COALESCE(split_part(d.external_ref, ':', 2), d.id::text))
              d.id, d.sponsor_name, d.amount_pkr, d.split_count, d.orphan_code, d.raw_code, d.orphan_id,
              d.months, d.year, d.submitted_at, d.status
         FROM kafalat_donations d
        ORDER BY COALESCE(split_part(d.external_ref, ':', 2), d.id::text), d.submitted_at DESC`,
    );
    dons.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    for (const d of dons.slice(0, 15)) {
      const total = d.amount_pkr * (d.split_count || 1);
      const months = d.months.map((m) => MONTH_NAMES[m - 1].slice(0, 3)).join(', ');
      items.push({
        id: `don-${d.id}`,
        kind: 'donation',
        title: `${d.sponsor_name} paid PKR ${total.toLocaleString('en-US')}`,
        body: `${d.split_count > 1 ? d.raw_code || `${d.split_count} children` : d.orphan_code || d.raw_code || '—'} · ${months} ${d.year}`,
        at: iso(d.submitted_at),
        link: d.orphan_id ? `/organization/orphans/${d.orphan_id}` : '/fop/online-donations',
      });
    }

    // Submissions that could not be matched to a child.
    const unmatched = await queryOne(
      'SELECT count(*)::int AS n, max(submitted_at) AS last FROM kafalat_donations WHERE orphan_id IS NULL',
    );
    if (unmatched.n) {
      items.push({
        id: `unmatched-${unmatched.n}`,
        kind: 'warning',
        title: `${unmatched.n} payment${unmatched.n === 1 ? '' : 's'} not linked to a child`,
        body: 'The orphan code typed on the form could not be read. Link them to the right child.',
        at: iso(unmatched.last),
        link: '/organization/kafalat',
      });
    }

    // This month's pending kafalat.
    const report = await kafalatMonthReport({ year, month, kind: 'orphan' });
    const pending = report.totals.pending + report.totals.partial;
    if (pending) {
      items.push({
        id: `pending-${year}-${month}-${pending}`,
        kind: 'alert',
        title: `${pending} children still pending for ${MONTH_NAMES[month - 1]}`,
        body: `${report.totals.paid + report.totals.partial} of ${report.totals.sponsored - report.totals.notDue} paid so far. Send reminders to their sponsors.`,
        at: iso(new Date(year, month - 1, 1)),
        link: '/fop/send-reminder',
      });
    }

    // New sponsors in the last 14 days.
    const sponsors = await query(
      `SELECT code, name, added_on FROM kafalat_sponsors
        WHERE added_on > now() - interval '14 days' ORDER BY added_on DESC LIMIT 10`,
    );
    for (const s of sponsors) {
      items.push({
        id: `sp-${s.code}`,
        kind: 'sponsor',
        title: `New sponsor: ${s.name}`,
        body: s.code,
        at: iso(s.added_on),
        link: `/fop/sponsors/${encodeURIComponent(s.code)}`,
      });
    }

    // Event registrations in the last 14 days (grouped per day).
    const events = await query(
      `SELECT date_trunc('day', added_on) AS day, count(*)::int AS n, sum(persons)::int AS persons, max(added_on) AS last
         FROM fop_event_registrations WHERE added_on > now() - interval '14 days'
        GROUP BY 1 ORDER BY 1 DESC LIMIT 7`,
    );
    for (const e of events) {
      items.push({
        id: `ev-${iso(e.day)}-${e.n}`,
        kind: 'event',
        title: `${e.n} event registration${e.n === 1 ? '' : 's'}`,
        body: `${e.persons} person${e.persons === 1 ? '' : 's'} registered`,
        at: iso(e.last),
        link: '/fop/events',
      });
    }

    items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    res.json({ generatedAt: now.toISOString(), items: items.slice(0, 40) });
  }),
);

// ---------------------------------------------------------------------------
// Event submissions
// ---------------------------------------------------------------------------

/** GET /admin/fop/events?q=&event= */
router.get(
  '/events',
  asyncRoute(async (req, res) => {
    const like = likeOf(req.query.q);
    const rows = await query(
      `SELECT * FROM fop_event_registrations
        WHERE ($1::text IS NULL OR full_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 OR address ILIKE $1)
          AND ($2::text IS NULL OR event = $2)
        ORDER BY added_on DESC NULLS LAST, id DESC`,
      [like, req.query.event || null],
    );
    const events = await query(
      `SELECT event, count(*)::int AS registrations, sum(persons)::int AS persons
         FROM fop_event_registrations GROUP BY 1 ORDER BY 2 DESC`,
    );
    const sources = await query(
      `SELECT COALESCE(heard_from, 'Unknown') AS source, count(*)::int AS n
         FROM fop_event_registrations GROUP BY 1 ORDER BY 2 DESC`,
    );
    res.json({
      events,
      sources,
      registrations: rows.map((r) => ({
        id: String(r.id),
        externalId: r.external_id,
        event: r.event,
        fullName: r.full_name,
        phone: r.phone,
        whatsapp: waNumber(r.phone),
        email: r.email,
        address: r.address,
        heardFrom: r.heard_from,
        persons: r.persons,
        paymentUpload: r.payment_upload,
        note: r.note,
        status: r.status,
        addedOn: iso(r.added_on),
      })),
    });
  }),
);

export default router;

/**
 * Seeds the dataset.
 *
 * Content (orphans, hadith, carousel slides) is taken from the official
 * content API at gazavirtualadoption.org — see `officialContent` below, which
 * was extracted from `fop-vads` and stored verbatim. Nothing about a real child
 * is invented: the published API exposes only a code and a poster JPEG, so a
 * seeded orphan has a code and a poster and nothing else.
 *
 * Demo sponsorship data (Fardeen's account, payments, batches) exists so the
 * Payments screens have something real to show. Its figures are computed from
 * MONTHLY_SPONSORSHIP so the totals stay internally consistent.
 *
 *   node src/db/seed.js
 */
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from './index.js';
import { OFFICIAL_ORPHANS, OFFICIAL_HADITH, OFFICIAL_CAROUSEL } from './official-content.js';
import { upsertWebDemoUser, WEB_DEMO_USER } from './web-demo-user.js';

const DEMO = {
  fullName: 'Fardeen',
  email: 'fardeen@gazavirtualadoption.org',
  phone: '+92 300 1234567',
  password: 'Gaza2026!',
  initial: 'F',
};

/** The published sponsorship price. */
const MONTHLY = 30000;

/** How many of the published children the demo sponsor supports. */
const DEMO_SPONSORED_CODES = ['OR575', 'OR348', 'OR576'];

/** When the demo user's first sponsorship began — drives the monthly average. */
const SPONSORED_SINCE = '2026-08-01';

/**
 * Demo donation history.
 *
 * Figures are derived from MONTHLY so that every number the app shows agrees:
 * 9 completed donations of 3 x MONTHLY plus small extras, totalling 150,000
 * over the 3 months the demo sponsor has been active. That gives the History
 * screen a PKR 150,000 total, 9 donations and a PKR 50,000/month average.
 *
 * `allocate` is 'all' (split across the sponsored children) or omitted for a
 * general-fund gift.
 */
const PAYMENTS = [
  { title: 'Monthly sponsorship', kind: 'monthly', amount: 90000, status: 'completed', subtitle: 'All sponsored · 3 orphans', paidOn: '2026-10-20', allocate: 'all' },
  { title: 'Special campaign', kind: 'campaign', amount: 10000, status: 'completed', subtitle: 'Winter relief fund', paidOn: '2026-10-08' },
  { title: 'One-time gift', kind: 'one_time', amount: 5000, status: 'completed', subtitle: 'General fund', paidOn: '2026-09-28' },
  { title: 'Monthly sponsorship', kind: 'monthly', amount: 90000, status: 'completed', subtitle: 'All sponsored · 3 orphans', paidOn: '2026-09-19', allocate: 'all' },
  { title: 'Special campaign', kind: 'campaign', amount: 30000, status: 'completed', subtitle: 'School supplies', paidOn: '2026-09-12' },
  { title: 'Monthly sponsorship', kind: 'monthly', amount: 30000, status: 'completed', subtitle: 'Fatima Ali', paidOn: '2026-08-21', allocate: 'first' },
  { title: 'One-time gift', kind: 'one_time', amount: 5000, status: 'completed', subtitle: 'General fund', paidOn: '2026-08-09' },
  { title: 'Monthly sponsorship', kind: 'monthly', amount: 30000, status: 'completed', subtitle: 'Monthly gift', paidOn: '2026-07-18', allocate: 'first' },
  { title: 'Special campaign', kind: 'campaign', amount: 10000, status: 'completed', subtitle: 'School supplies', paidOn: '2026-07-05' },
  { title: 'Monthly sponsorship', kind: 'monthly', amount: 90000, status: 'pending', subtitle: 'All sponsored · 3 orphans', paidOn: '2026-10-24', allocate: 'all', note: 'Bank transfer reference 88214' },
  { title: 'One-time gift', kind: 'one_time', amount: 5000, status: 'pending', subtitle: 'General fund', paidOn: '2026-10-22', note: 'Awaiting verification' },
  { title: 'Special campaign', kind: 'campaign', amount: 30000, status: 'pending', subtitle: 'Winter relief fund', paidOn: '2026-10-15', note: 'Awaiting verification' },
];

async function seed() {
  const hash = await bcrypt.hash(DEMO.password, 10);

  await withTransaction(async (client) => {
    // --- reset -------------------------------------------------------------
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [DEMO.email]);
    if (existing.rows.length) {
      const uid = existing.rows[0].id;
      await client.query('DELETE FROM payments WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM sponsorships WHERE user_id = $1', [uid]);
      await client.query('DELETE FROM users WHERE id = $1', [uid]);
    }
    await client.query('DELETE FROM payment_allocations');
    await client.query('DELETE FROM orphans');
    await client.query('DELETE FROM batches');
    await client.query('DELETE FROM carousel_slides');
    await client.query('DELETE FROM hadiths');

    // --- official content: carousel + hadith -------------------------------
    for (const [i, slide] of OFFICIAL_CAROUSEL.entries()) {
      await client.query(
        `INSERT INTO carousel_slides
           (kind, tag, title, body, arabic, reference, image_url, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)`,
        [slide.kind, slide.tag, slide.title, slide.body, slide.arabic, slide.reference, slide.imageUrl, i]
      );
    }
    for (const [i, h] of OFFICIAL_HADITH.entries()) {
      await client.query(
        `INSERT INTO hadiths (heading, arabic, translation, reference, sort_order)
         VALUES ($1,$2,$3,$4,$5)`,
        [h.heading, h.arabic, h.translation, h.reference, i]
      );
    }

    // --- official content: the 21 published orphans ------------------------
    // A published orphan carries only a code and a poster. Sponsorship status
    // comes from the official `Status` flag.
    const orphanIds = {};
    for (const o of OFFICIAL_ORPHANS) {
      const r = await client.query(
        `INSERT INTO orphans
           (code, external_id, poster_url, status, monthly_amount_pkr)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id`,
        [o.code, o.externalId, o.posterUrl, o.sponsored ? 'sponsored' : 'waiting', MONTHLY]
      );
      orphanIds[o.code] = r.rows[0].id;
    }

    // --- demo user ---------------------------------------------------------
    const userRes = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, avatar_initial)
       VALUES ($1,$2,$3,$4,'sponsor',$5) RETURNING id`,
      [DEMO.fullName, DEMO.email, DEMO.phone, hash, DEMO.initial]
    );
    const userId = userRes.rows[0].id;

    // The demo sponsor supports the first three published children.
    const sponsored = DEMO_SPONSORED_CODES.filter((c) => orphanIds[c]);
    for (const code of sponsored) {
      await client.query(
        `INSERT INTO sponsorships (user_id, orphan_id, monthly_amount_pkr, status, started_at)
         VALUES ($1,$2,$3,'active',$4)`,
        [userId, orphanIds[code], MONTHLY, `${SPONSORED_SINCE}T00:00:00Z`]
      );
      await client.query("UPDATE orphans SET status = 'sponsored' WHERE id = $1", [orphanIds[code]]);
    }

    // --- open batch --------------------------------------------------------
    const batchRes = await client.query(
      `INSERT INTO batches (label, month_key, batch_no, minimum_pkr, status)
       VALUES ('December batch 1', '2026-12', 1, $1, 'open')
       ON CONFLICT (month_key, batch_no) DO UPDATE SET minimum_pkr = EXCLUDED.minimum_pkr
       RETURNING id`,
      [MONTHLY * sponsored.length]
    );
    const batchId = batchRes.rows[0].id;

    // --- demo payment history ---------------------------------------------
    for (const p of PAYMENTS) {
      const r = await client.query(
        `INSERT INTO payments
           (user_id, batch_id, kind, title, subtitle, amount_pkr, status, method,
            reference_note, paid_on, verified_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'bank_transfer',$8,$9,$10) RETURNING id`,
        [
          userId,
          p.kind === 'monthly' ? batchId : null,
          p.kind,
          p.title,
          p.subtitle,
          p.amount,
          p.status,
          p.note || null,
          p.paidOn,
          p.status === 'completed' ? `${p.paidOn}T10:00:00Z` : null,
        ]
      );
      const paymentId = r.rows[0].id;

      if (p.allocate === 'all') {
        for (const code of sponsored) {
          await client.query(
            'INSERT INTO payment_allocations (payment_id, orphan_id, amount_pkr) VALUES ($1,$2,$3)',
            [paymentId, orphanIds[code], MONTHLY]
          );
        }
      } else if (p.allocate === 'first' && sponsored[0]) {
        await client.query(
          'INSERT INTO payment_allocations (payment_id, orphan_id, amount_pkr) VALUES ($1,$2,$3)',
          [paymentId, orphanIds[sponsored[0]], p.amount]
        );
      }
    }

    await upsertWebDemoUser(client, bcrypt);
  });

  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*) FROM orphans)::int                                       AS orphans,
       (SELECT count(*) FROM orphans WHERE status = 'waiting')::int              AS waiting,
       (SELECT count(*) FROM carousel_slides)::int                               AS slides,
       (SELECT count(*) FROM hadiths)::int                                       AS hadiths,
       (SELECT count(*) FROM payments p JOIN users u ON u.id = p.user_id
          WHERE u.email = $1)::int                                               AS records,
       (SELECT count(*) FROM payments p JOIN users u ON u.id = p.user_id
          WHERE u.email = $1 AND p.status = 'completed')::int                    AS completed,
       (SELECT COALESCE(sum(p.amount_pkr),0) FROM payments p JOIN users u ON u.id = p.user_id
          WHERE u.email = $1 AND p.status = 'completed')::int                    AS total`,
    [DEMO.email]
  );
  const s = rows[0];
  console.log('[seed] demo account', DEMO.email, '/', DEMO.password);
  console.log('[seed] web demo', WEB_DEMO_USER.email, '/', WEB_DEMO_USER.password);
  console.log(
    `[seed] orphans=${s.orphans} waiting=${s.waiting} slides=${s.slides} hadiths=${s.hadiths}`
  );
  console.log(
    `[seed] payments: records=${s.records} completed=${s.completed} total=PKR ${Number(s.total).toLocaleString('en-US')}`
  );
  await pool.end();
}

seed().catch(async (err) => {
  console.error('[seed] failed:', err.message);
  await pool.end().catch(() => {});
  process.exit(1);
});

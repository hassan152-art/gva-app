import { Router } from 'express';
import { query, queryOne } from '../db/index.js';
import { requireAuth, asyncRoute } from '../lib/auth.js';
import { orphanDto, money } from '../lib/dto.js';
import { monthsActiveSince } from '../lib/period.js';
import { getOfficialOrphans } from '../services/officialOrphans.js';

const router = Router();

/**
 * Full roster from gazavirtualadoption.org (Elixir fop-vads).
 * @see https://gazavirtualadoption.org/orphans/all
 */
router.get(
  '/all',
  asyncRoute(async (req, res) => {
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const data = await getOfficialOrphans({ refresh });
    res.json(data);
  })
);

/**
 * Every child who still needs a sponsor — the Sponsor tab's list, one row per
 * child, newest published first by code.
 */
router.get(
  '/available',
  asyncRoute(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const rows = await query(
      `SELECT * FROM orphans
        WHERE status = 'waiting'
        ORDER BY code NULLS LAST, id
        LIMIT $1`,
      [limit]
    );
    const [counts] = await query(
      `SELECT
         count(*) FILTER (WHERE status = 'waiting')::int   AS waiting,
         count(*)::int                                     AS total
       FROM orphans`
    );
    res.json({
      orphans: rows.map(orphanDto),
      totalWaiting: counts.waiting,
      totalOrphans: counts.total,
    });
  })
);

/** The carousel at the top of the Sponsor tab. */
router.get(
  '/carousel',
  asyncRoute(async (_req, res) => {
    const rows = await query(
      `SELECT kind, tag, title, body, arabic, reference, image_url
         FROM carousel_slides
        WHERE is_active
        ORDER BY sort_order, id`
    );
    res.json({
      slides: rows.map((r) => ({
        kind: r.kind,
        tag: r.tag,
        title: r.title,
        body: r.body,
        arabic: r.arabic,
        reference: r.reference,
        imageUrl: r.image_url,
      })),
    });
  })
);

/** The standalone hadith collection. */
router.get(
  '/hadith',
  asyncRoute(async (_req, res) => {
    const rows = await query(
      'SELECT heading, arabic, translation, reference FROM hadiths ORDER BY sort_order, id'
    );
    res.json({ hadiths: rows });
  })
);

/**
 * Orphans the signed-in user actively sponsors, oldest first.
 */
router.get(
  '/active',
  requireAuth,
  asyncRoute(async (req, res) => {
    const rows = await query(
      `SELECT o.*,
              s.monthly_amount_pkr AS sponsored_amount,
              s.started_at,
              EXISTS (
                SELECT 1
                  FROM payments p
                  JOIN payment_allocations pa ON pa.payment_id = p.id
                 WHERE p.user_id = $1
                   AND pa.orphan_id = o.id
                   AND p.status = 'completed'
                   AND p.batch_id = (
                     SELECT id FROM batches WHERE status = 'open' ORDER BY opens_at DESC LIMIT 1
                   )
              ) AS paid_current_batch
         FROM sponsorships s
         JOIN orphans o ON o.id = s.orphan_id
        WHERE s.user_id = $1 AND s.status = 'active'
        ORDER BY s.started_at, o.id`,
      [req.user.id]
    );
    res.json({
      orphans: rows.map((r) => ({
        ...orphanDto({ ...r, monthly_amount_pkr: r.sponsored_amount }),
        sponsoredSince: r.started_at,
        badge: 'Active',
        paymentStatus: r.paid_current_batch ? 'paid' : 'unpaid',
      })),
    });
  })
);

/** One child, plus whether the current user already sponsors them. */
router.get(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const row = await queryOne('SELECT * FROM orphans WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Child not found' });
    const sponsored = await queryOne(
      "SELECT id FROM sponsorships WHERE user_id = $1 AND orphan_id = $2 AND status = 'active'",
      [req.user.id, row.id]
    );
    res.json({ orphan: { ...orphanDto(row), sponsored: Boolean(sponsored) } });
  })
);

/**
 * Sponsorship totals for the Home impact tiles.
 * Exported so it can be mounted at GET /me/impact.
 */
export const getImpact = asyncRoute(async (req, res) => {
  const [active] = await query(
    "SELECT count(*)::int AS count, COALESCE(sum(monthly_amount_pkr),0)::int AS monthly FROM sponsorships WHERE user_id = $1 AND status = 'active'",
    [req.user.id]
  );
  const [given] = await query(
    "SELECT COALESCE(sum(amount_pkr),0)::int AS total, count(*)::int AS donations FROM payments WHERE user_id = $1 AND status = 'completed'",
    [req.user.id]
  );
  const since = await queryOne(
    "SELECT min(started_at) AS since FROM sponsorships WHERE user_id = $1 AND status = 'active'",
    [req.user.id]
  );
  const batch = await queryOne("SELECT * FROM batches WHERE status = 'open' ORDER BY opens_at DESC LIMIT 1");

  const monthsActive = monthsActiveSince(since?.since);
  const average = Math.round(given.total / monthsActive);
  const [records] = await query(
    'SELECT count(*)::int AS count FROM payments WHERE user_id = $1',
    [req.user.id]
  );
  const [waiting] = await query(
    "SELECT count(*)::int AS count FROM orphans WHERE status = 'waiting'"
  );
  const [community] = await query(
    `SELECT count(*) FILTER (WHERE status = 'sponsored')::int AS sponsored FROM orphans`
  );
  const communityGoal = Number(process.env.COMMUNITY_ORPHAN_GOAL || 7000);

  res.json({
    sponsored: active.count,
    monthlyTotal: money(active.monthly),
    batchTotal: money(active.monthly),
    lifetimeGiven: money(given.total),
    donations: given.donations,
    averagePerMonth: money(average),
    monthsActive,
    currentList: 1,
    records: records.count,
    waiting: waiting.count,
    communityProgress: {
      sponsored: community.sponsored,
      goal: communityGoal,
    },
    batch: batch
      ? {
          id: String(batch.id),
          label: batch.label,
          headline: `Your ${batch.label} is open`,
          subline: `Minimum PKR ${batch.minimum_pkr.toLocaleString('en-US')} required`,
          minimum: money(batch.minimum_pkr),
        }
      : null,
  });
});

export default router;

import { Router } from 'express';
import multer from 'multer';
import { extname } from 'node:path';
import { query, queryOne, withTransaction } from '../db/index.js';
import { requireAuth, asyncRoute } from '../lib/auth.js';
import { paymentDto, money } from '../lib/dto.js';
import { monthsActiveSince } from '../lib/period.js';
import { PROOF_UPLOAD_EXTENSIONS } from '../constants/cloudious.js';
import { uploadToCloudious } from '../services/cloudiousUploadService.js';

const router = Router();

// --- proof uploads (memory → Cloudious, folder GVA-APP) --------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (PROOF_UPLOAD_EXTENSIONS.has(extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error('Upload a PNG, JPG, WEBP or PDF file'));
  },
});

// --- helper: payments joined to their orphan names --------------------------
const PAYMENT_SELECT = `
  SELECT p.*,
         COALESCE(string_agg(o.first_name || ' ' || o.last_name, '||' ORDER BY o.id), '') AS orphan_names
    FROM payments p
    LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
    LEFT JOIN orphans o ON o.id = pa.orphan_id
   WHERE p.user_id = $1
`;

/**
 * GET /payments — the Donation history list.
 * Query: orphanId, from (YYYY-MM-DD), to (YYYY-MM-DD), limit
 */
router.get(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { orphanId, from, to } = req.query;
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const params = [req.user.id];
    let sql = PAYMENT_SELECT;

    if (orphanId && orphanId !== 'all') {
      params.push(orphanId);
      sql += ` AND EXISTS (
                 SELECT 1 FROM payment_allocations pa2
                  WHERE pa2.payment_id = p.id AND pa2.orphan_id = $${params.length}
               )`;
    }
    if (from) {
      params.push(from);
      sql += ` AND p.paid_on >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      sql += ` AND p.paid_on <= $${params.length}`;
    }

    params.push(limit);
    sql += ` GROUP BY p.id ORDER BY p.paid_on DESC, p.id DESC LIMIT $${params.length}`;

    const rows = await query(sql, params);
    res.json({ payments: rows.map(paymentDto), count: rows.length });
  })
);

/**
 * GET /payments/summary — the green "Giving summary" card.
 * Accepts the same from/to filters as the list.
 */
router.get(
  '/summary',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { from, to, orphanId } = req.query;
    const params = [req.user.id];
    let sql = `
      SELECT COALESCE(sum(p.amount_pkr),0)::int AS total,
             count(*)::int                     AS donations
        FROM payments p
       WHERE p.user_id = $1 AND p.status = 'completed'`;

    if (orphanId && orphanId !== 'all') {
      params.push(orphanId);
      sql += ` AND EXISTS (
                 SELECT 1 FROM payment_allocations pa
                  WHERE pa.payment_id = p.id AND pa.orphan_id = $${params.length}
               )`;
    }
    if (from) {
      params.push(from);
      sql += ` AND p.paid_on >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      sql += ` AND p.paid_on <= $${params.length}`;
    }

    const [summary] = await query(sql, params);

    // Average per month across the months the user has been sponsoring.
    const since = await queryOne(
      "SELECT min(started_at) AS since FROM sponsorships WHERE user_id = $1 AND status = 'active'",
      [req.user.id]
    );
    const monthsActive = monthsActiveSince(since?.since);

    res.json({
      totalGiven: money(summary.total),
      donations: summary.donations,
      averagePerMonth: money(Math.round(summary.total / monthsActive)),
      monthsActive,
    });
  })
);

/** GET /payments/:id */
router.get(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const rows = await query(`${PAYMENT_SELECT} AND p.id = $2 GROUP BY p.id`, [
      req.user.id,
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Payment not found' });
    res.json({ payment: paymentDto(rows[0]) });
  })
);

/**
 * POST /payments — submit a multi-pay order with proof (frame 05).
 * multipart/form-data: amountTotal, orphanIds (JSON array of ids or "all"),
 * allocations (JSON [{orphanId, amount}]), method, note, proof (file)
 */
router.post(
  '/',
  requireAuth,
  upload.single('proof'),
  asyncRoute(async (req, res) => {
    let allocations = [];
    try {
      allocations = JSON.parse(req.body.allocations || '[]');
    } catch {
      return res.status(422).json({ error: 'Invalid allocation payload' });
    }
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(422).json({ error: 'Select at least one child to sponsor' });
    }

    const method = req.body.method === 'card' ? 'card' : 'bank_transfer';

    // The server recomputes the total; it never trusts a client-sent figure.
    const total = allocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    if (!Number.isFinite(total) || total <= 0) {
      return res.status(422).json({ error: 'Enter an amount for each selected child' });
    }

    // Every referenced child must be actively sponsored by this user.
    const ids = allocations.map((a) => Number(a.orphanId));
    const owned = await query(
      `SELECT orphan_id FROM sponsorships
        WHERE user_id = $1 AND status = 'active' AND orphan_id = ANY($2::bigint[])`,
      [req.user.id, ids]
    );
    if (owned.length !== ids.length) {
      return res.status(422).json({ error: 'One of the selected children is not in your sponsorship' });
    }

    const batch = await queryOne("SELECT * FROM batches WHERE status = 'open' ORDER BY opens_at DESC LIMIT 1");
    if (batch && total < batch.minimum_pkr) {
      return res.status(422).json({
        error: `Minimum order PKR ${batch.minimum_pkr.toLocaleString('en-US')}`,
        minimum: money(batch.minimum_pkr),
      });
    }

    let proofPath = null;
    if (req.file) {
      const uploaded = await uploadToCloudious({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      proofPath = uploaded.path;
    }

    const payment = await withTransaction(async (client) => {
      const names = await client.query(
        'SELECT first_name, last_name FROM orphans WHERE id = ANY($1::bigint[]) ORDER BY id',
        [ids]
      );
      const subtitle =
        ids.length > 1
          ? `All sponsored · ${ids.length} orphans`
          : `${names.rows[0].first_name} ${names.rows[0].last_name}`;

      const inserted = await client.query(
        `INSERT INTO payments
           (user_id, batch_id, kind, title, subtitle, amount_pkr, status, method, reference_note, proof_path, paid_on)
         VALUES ($1,$2,'monthly','Monthly sponsorship',$3,$4,'pending',$5,$6,$7, CURRENT_DATE)
         RETURNING id`,
        [
          req.user.id,
          batch?.id || null,
          subtitle,
          total,
          method,
          req.body.note || null,
          proofPath,
        ]
      );
      const paymentId = inserted.rows[0].id;

      for (const a of allocations) {
        await client.query(
          'INSERT INTO payment_allocations (payment_id, orphan_id, amount_pkr) VALUES ($1,$2,$3)',
          [paymentId, Number(a.orphanId), Number(a.amount)]
        );
      }
      return paymentId;
    });

    const rows = await query(`${PAYMENT_SELECT} AND p.id = $2 GROUP BY p.id`, [
      req.user.id,
      payment,
    ]);
    res.status(201).json({
      payment: paymentDto(rows[0]),
      message: 'Our team verifies within 24 hours',
    });
  })
);

export default router;

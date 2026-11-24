/**
 * Public endpoints — no login.
 *
 *   GET  /public/statement/:token   sponsor's invoice page (link sent on WhatsApp)
 *   POST /public/kafala-form        the website's Kafala form posts each submission here
 *                                   (header x-form-secret: KAFALAT_FORM_SECRET)
 */
import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { asyncRoute } from '../lib/auth.js';
import { publicStatement, receiveFormSubmission } from '../services/invoices.js';

const router = Router();

router.get(
  '/statement/:token',
  asyncRoute(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await publicStatement(req.params.token));
  }),
);

function secretOk(given) {
  const expected = process.env.KAFALAT_FORM_SECRET || '';
  if (!expected || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

router.post(
  '/kafala-form',
  asyncRoute(async (req, res) => {
    if (!process.env.KAFALAT_FORM_SECRET) {
      return res.status(503).json({ error: 'Form link is not set up (KAFALAT_FORM_SECRET missing)' });
    }
    if (!secretOk(req.get('x-form-secret') || req.query.secret)) {
      return res.status(401).json({ error: 'Invalid form secret' });
    }
    const result = await receiveFormSubmission(req.body);
    res.status(201).json({ ok: true, ...result });
  }),
);

export default router;

/**
 * Mobile donor app.
 *
 * Public (no login):
 *   GET  /app/orphans?q=&page=            children waiting for a sponsor
 *   GET  /app/orphans/:id                 child details (adds my request status when signed in)
 *   GET  /app/payment-account             the account donors should pay into now
 *
 * Signed in (donor):
 *   GET  /app/me                          my children, totals, requests & ticket counts
 *   GET  /app/ledger                      invoices (paid/unpaid per month), payments, carried-forward ledger
 *   GET  /app/requests                    my sponsorship / payment requests
 *   POST /app/requests                    multipart: kind, orphanIds (JSON), year, months (JSON), amountPkr, note, slip
 *   GET  /app/tickets?status=             my complaints + counts
 *   POST /app/tickets                     multipart: category, subject, message, orphanId?, attachment?
 *   GET  /app/tickets/:id
 *   POST /app/tickets/:id/messages        multipart: body, attachment?
 */
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config.js';
import { requireAuth, asyncRoute } from '../lib/auth.js';
import { singleFile, storeUpload } from '../lib/fileUpload.js';
import {
  activePaymentAccount,
  createRequest,
  createTicket,
  donorLedger,
  donorOverview,
  getTicket,
  listTickets,
  myRequests,
  publicOrphan,
  publicOrphans,
  replyTicket,
} from '../services/donorApp.js';

const router = Router();
const int = (v, d) => {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : d;
};

/** Signed-in user id if a valid token was sent; never fails. */
function optionalUserId(req) {
  const h = req.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  try {
    return Number(jwt.verify(token, env.jwtSecret).sub) || null;
  } catch {
    return null;
  }
}

router.get(
  '/orphans',
  asyncRoute(async (req, res) => {
    res.json(
      await publicOrphans({
        q: req.query.q ? String(req.query.q) : null,
        page: int(req.query.page, 1),
        pageSize: int(req.query.pageSize, 20),
      }),
    );
  }),
);

router.get(
  '/orphans/:id',
  asyncRoute(async (req, res) => {
    res.json(await publicOrphan(int(req.params.id, 0), optionalUserId(req)));
  }),
);

router.get(
  '/payment-account',
  asyncRoute(async (_req, res) => {
    res.json({ account: await activePaymentAccount() });
  }),
);

router.get('/me', requireAuth, asyncRoute(async (req, res) => res.json(await donorOverview(req.user.id))));
router.get('/ledger', requireAuth, asyncRoute(async (req, res) => res.json(await donorLedger(req.user.id))));
router.get('/requests', requireAuth, asyncRoute(async (req, res) => res.json({ requests: await myRequests(req.user.id) })));

router.post(
  '/requests',
  requireAuth,
  singleFile('slip'),
  asyncRoute(async (req, res) => {
    const slip = await storeUpload(req);
    const request = await createRequest(req.user.id, req.body || {}, slip);
    res.status(201).json({
      request,
      message: 'Your request has been received. Our team will verify the payment and contact you soon.',
    });
  }),
);

router.get(
  '/tickets',
  requireAuth,
  asyncRoute(async (req, res) => {
    const status = ['pending', 'resolved'].includes(req.query.status) ? req.query.status : null;
    res.json(await listTickets({ userId: req.user.id, status }));
  }),
);

router.post(
  '/tickets',
  requireAuth,
  singleFile('attachment'),
  asyncRoute(async (req, res) => {
    const url = await storeUpload(req);
    const ticket = await createTicket(req.user.id, req.body || {}, url);
    res.status(201).json({ ticket, message: `Complaint ${ticket.ticketNo} registered. Our team will reply soon.` });
  }),
);

router.get(
  '/tickets/:id',
  requireAuth,
  asyncRoute(async (req, res) => res.json(await getTicket(int(req.params.id, 0), req.user.id))),
);

router.post(
  '/tickets/:id/messages',
  requireAuth,
  singleFile('attachment'),
  asyncRoute(async (req, res) => {
    const url = await storeUpload(req);
    res.json(
      await replyTicket(int(req.params.id, 0), { userId: req.user.id, role: 'donor', body: req.body?.body, attachmentUrl: url }),
    );
  }),
);

export default router;

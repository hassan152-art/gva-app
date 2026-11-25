/**
 * Admin side of the donor app.
 *
 *   GET    /admin/app/badges                          pending approvals + open complaints
 *   GET    /admin/app/payment-accounts                all accounts
 *   POST   /admin/app/payment-accounts                create
 *   PATCH  /admin/app/payment-accounts/:id            edit
 *   POST   /admin/app/payment-accounts/:id/activate   turn on (all others go off)
 *   POST   /admin/app/payment-accounts/:id/deactivate
 *   DELETE /admin/app/payment-accounts/:id
 *   GET    /admin/app/requests?status=&kind=          sponsorship / payment approvals
 *   POST   /admin/app/requests/:id/approve { note }
 *   POST   /admin/app/requests/:id/reject  { note }
 *   GET    /admin/app/tickets?status=
 *   GET    /admin/app/tickets/:id
 *   POST   /admin/app/tickets/:id/messages            multipart: body, status?, attachment?
 *   PATCH  /admin/app/tickets/:id { status }
 */
import { Router } from 'express';
import { requireAuth, asyncRoute } from '../lib/auth.js';
import { requireAdmin } from '../lib/requireAdmin.js';
import { singleFile, storeUpload } from '../lib/fileUpload.js';
import {
  activatePaymentAccount,
  adminBadgeCounts,
  adminRequests,
  approveRequest,
  deactivatePaymentAccount,
  deletePaymentAccount,
  getTicket,
  listPaymentAccounts,
  listTickets,
  rejectRequest,
  replyTicket,
  savePaymentAccount,
  setTicketStatus,
} from '../services/donorApp.js';

const router = Router();
router.use(requireAuth, requireAdmin);
const id = (req) => Number.parseInt(req.params.id, 10);

router.get('/badges', asyncRoute(async (_req, res) => res.json(await adminBadgeCounts())));

router.get('/payment-accounts', asyncRoute(async (_req, res) => res.json({ accounts: await listPaymentAccounts() })));
router.post(
  '/payment-accounts',
  asyncRoute(async (req, res) => res.status(201).json({ account: await savePaymentAccount(null, req.body || {}), message: 'Account saved' })),
);
router.patch(
  '/payment-accounts/:id',
  asyncRoute(async (req, res) => res.json({ account: await savePaymentAccount(id(req), req.body || {}), message: 'Account updated' })),
);
router.post(
  '/payment-accounts/:id/activate',
  asyncRoute(async (req, res) => {
    const account = await activatePaymentAccount(id(req));
    res.json({ account, message: `${account.label} is now shown in the app — every other account is off` });
  }),
);
router.post(
  '/payment-accounts/:id/deactivate',
  asyncRoute(async (req, res) => res.json({ account: await deactivatePaymentAccount(id(req)), message: 'Account turned off' })),
);
router.delete(
  '/payment-accounts/:id',
  asyncRoute(async (req, res) => {
    await deletePaymentAccount(id(req));
    res.json({ ok: true, message: 'Account removed' });
  }),
);

router.get(
  '/requests',
  asyncRoute(async (req, res) => {
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : null;
    const kind = ['sponsorship', 'payment'].includes(req.query.kind) ? req.query.kind : null;
    res.json(await adminRequests({ status, kind }));
  }),
);
router.post(
  '/requests/:id/approve',
  asyncRoute(async (req, res) => {
    const r = await approveRequest(id(req), req.user.id, req.body?.note);
    res.json({ ok: true, ...r, message: `Approved — linked to ${r.sponsorCode}, payment ${r.receiptNo} recorded` });
  }),
);
router.post(
  '/requests/:id/reject',
  asyncRoute(async (req, res) => {
    await rejectRequest(id(req), req.user.id, req.body?.note);
    res.json({ ok: true, message: 'Request rejected' });
  }),
);

router.get(
  '/tickets',
  asyncRoute(async (req, res) => {
    const status = ['pending', 'resolved'].includes(req.query.status) ? req.query.status : null;
    res.json(await listTickets({ status }));
  }),
);
router.get('/tickets/:id', asyncRoute(async (req, res) => res.json(await getTicket(id(req)))));
router.post(
  '/tickets/:id/messages',
  singleFile('attachment'),
  asyncRoute(async (req, res) => {
    const url = await storeUpload(req);
    res.json(
      await replyTicket(id(req), { userId: req.user.id, role: 'admin', body: req.body?.body, attachmentUrl: url, status: req.body?.status }),
    );
  }),
);
router.patch('/tickets/:id', asyncRoute(async (req, res) => res.json(await setTicketStatus(id(req), String(req.body?.status || '')))));

export default router;

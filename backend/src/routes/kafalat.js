import express, { Router } from 'express';
import { query, queryOne } from '../db/index.js';
import { requireAuth, asyncRoute } from '../lib/auth.js';
import { requireAdmin } from '../lib/requireAdmin.js';
import {
  addDonation,
  assignDonation,
  unmatchedDonations,
  importDonations,
  importEvents,
  importOrphans,
  importSponsors,
  kafalatMonthReport,
  orphanKafalatProfile,
  parseCsv,
} from '../services/kafalat.js';
import {
  createInvoices,
  deleteInvoice,
  setReceiptStatus,
  ensureInvoiceToken,
  monthReceivables,
  receivePayment,
  sponsorLedger,
  updateInvoice,
} from '../services/invoices.js';

const router = Router();
router.use(requireAuth, requireAdmin);

function yearMonth(req) {
  const now = new Date();
  const year = Number.parseInt(String(req.query.year || ''), 10) || now.getFullYear();
  const m = Number.parseInt(String(req.query.month || ''), 10);
  const month = m >= 1 && m <= 12 ? m : now.getMonth() + 1;
  return { year, month };
}

/** GET /admin/kafalat/report?year=&month=&kind= — paid / partial / pending per child. */
router.get(
  '/report',
  asyncRoute(async (req, res) => {
    const { year, month } = yearMonth(req);
    const kind = req.query.kind === 'student' ? 'student' : 'orphan';
    res.json(await kafalatMonthReport({ year, month, kind }));
  }),
);

/** GET /admin/kafalat/orphans/:id?year= — full child profile + donations. */
router.get(
  '/orphans/:id',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const { year } = yearMonth(req);
    const profile = await orphanKafalatProfile(id, year);
    if (!profile) return res.status(404).json({ error: 'Child not found' });
    res.json(profile);
  }),
);

/** POST /admin/kafalat/orphans/:id/donations — record a donation by hand. */
router.post(
  '/orphans/:id/donations',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const row = await addDonation(id, req.body || {});
    res.status(201).json({ id: String(row.id), message: 'Donation recorded' });
  }),
);

/** GET /admin/kafalat/unmatched — submissions not linked to any child. */
router.get(
  '/unmatched',
  asyncRoute(async (_req, res) => {
    res.json({ donations: await unmatchedDonations() });
  }),
);

/** POST /admin/kafalat/donations/:id/assign { code } */
router.post(
  '/donations/:id/assign',
  asyncRoute(async (req, res) => {
    const o = await assignDonation(Number.parseInt(req.params.id, 10), req.body?.code);
    res.json({ ok: true, message: `Linked to ${o.code}` });
  }),
);

/** PATCH /admin/kafalat/donations/:id { status } */
router.patch(
  '/donations/:id',
  asyncRoute(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const status = String(req.body?.status || '');
    if (!['received', 'verified', 'rejected'].includes(status)) {
      return res.status(422).json({ error: 'Status must be received, verified or rejected' });
    }
    const row = await queryOne(
      'UPDATE kafalat_donations SET status = $1 WHERE id = $2 RETURNING id',
      [status, id],
    );
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, message: `Donation marked ${status}` });
  }),
);

// Received money is never deleted — a wrong entry is marked rejected (PATCH above).

/**
 * POST /admin/kafalat/import/:type — body is CSV text (Excel → Save As CSV).
 * type = orphans | sponsors | donations
 */
router.post(
  '/import/:type',
  express.text({ type: () => true, limit: '20mb' }),
  asyncRoute(async (req, res) => {
    const rows = parseCsv(typeof req.body === 'string' ? req.body : '');
    if (rows.length === 0) return res.status(422).json({ error: 'The file has no rows' });
    const type = req.params.type;
    let result;
    if (type === 'orphans') result = await importOrphans(rows);
    else if (type === 'sponsors') result = await importSponsors(rows);
    else if (type === 'donations') result = await importDonations(rows);
    else if (type === 'events') result = await importEvents(rows);
    else return res.status(404).json({ error: 'Unknown import type' });
    res.json({ ok: true, rows: rows.length, ...result });
  }),
);

// ---------------------------------------------------------------------------
// Fee collection — receivables (invoices) and receipts
// ---------------------------------------------------------------------------

/** GET /admin/kafalat/receivables?year=&month=&status=&q= — every invoice for a month. */
router.get(
  '/receivables',
  asyncRoute(async (req, res) => {
    const { year, month } = yearMonth(req);
    const status = ['paid', 'unpaid', 'partial'].includes(req.query.status) ? req.query.status : null;
    res.json(await monthReceivables({ year, month, status, q: req.query.q ? String(req.query.q) : null }));
  }),
);

/**
 * POST /admin/kafalat/invoices — create fee.
 * { year, month, sponsorCode?, orphanIds?, amountPkr?, dueDate?, note? }
 * No sponsorCode / orphanIds = every sponsored child (bulk).
 */
router.post(
  '/invoices',
  asyncRoute(async (req, res) => {
    const b = req.body || {};
    const result = await createInvoices({
      year: Number.parseInt(String(b.year ?? ''), 10),
      month: Number.parseInt(String(b.month ?? ''), 10),
      sponsorCode: b.sponsorCode || null,
      orphanIds: b.orphanIds,
      amountPkr: b.amountPkr,
      dueDate: b.dueDate || null,
      note: b.note,
      userId: req.user?.id,
    });
    const extra = result.existing ? ` · ${result.existing} already existed` : '';
    res.status(201).json({
      ok: true,
      ...result,
      message: `${result.created} invoice${result.created === 1 ? '' : 's'} created for ${result.monthLabel}${extra}`,
    });
  }),
);

router.patch(
  '/invoices/:id',
  asyncRoute(async (req, res) => {
    const invoice = await updateInvoice(Number.parseInt(req.params.id, 10), req.body || {});
    res.json({ ok: true, invoice, message: 'Invoice updated' });
  }),
);

router.delete(
  '/invoices/:id',
  asyncRoute(async (req, res) => {
    await deleteInvoice(Number.parseInt(req.params.id, 10));
    res.json({ ok: true, message: 'Invoice removed' });
  }),
);

/** GET /admin/kafalat/sponsors/:code/ledger — receivables, payment history, ledger. */
router.get(
  '/sponsors/:code/ledger',
  asyncRoute(async (req, res) => {
    res.json(await sponsorLedger(req.params.code));
  }),
);

/** POST /admin/kafalat/sponsors/:code/receipts — receive payment. */
router.post(
  '/sponsors/:code/receipts',
  asyncRoute(async (req, res) => {
    const result = await receivePayment(req.params.code, req.body || {}, req.user?.id);
    res.status(201).json({
      ok: true,
      ...result,
      message: `Payment ${result.receipt.receiptNo} received · PKR ${result.receipt.amountPkr.toLocaleString('en-US')}`,
    });
  }),
);

/** POST /admin/kafalat/receipts/:id/status { status: 'rejected' | 'verified' } — reject or restore a receipt. */
router.post(
  '/receipts/:id/status',
  asyncRoute(async (req, res) => {
    const status = req.body?.status === 'rejected' ? 'rejected' : 'verified';
    await setReceiptStatus(Number.parseInt(req.params.id, 10), status);
    res.json({
      ok: true,
      message: status === 'rejected' ? 'Receipt rejected — its invoices are open again' : 'Receipt restored',
    });
  }),
);

/** POST /admin/kafalat/sponsors/:code/invoice-link — token for the public invoice page. */
router.post(
  '/sponsors/:code/invoice-link',
  asyncRoute(async (req, res) => {
    res.json({ token: await ensureInvoiceToken(req.params.code) });
  }),
);

export default router;

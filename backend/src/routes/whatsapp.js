/**
 * WhatsApp connection (Meta WhatsApp Cloud API).
 *
 * Connected when WHATSAPP_TOKEN and WHATSAPP_PHONE_ID are set (Vercel env).
 * Until then the app keeps opening WhatsApp (wa.me) with the message ready.
 *
 *   GET  /admin/whatsapp/status        → { connected, mode, displayNumber, verifiedName, error }
 *   POST /admin/whatsapp/test { to }   → sends the approved "hello_world" template
 */
import { Router } from 'express';
import { requireAuth, asyncRoute } from '../lib/auth.js';
import { requireAdmin } from '../lib/requireAdmin.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const GRAPH = 'https://graph.facebook.com/v20.0';
const cfg = () => ({ token: process.env.WHATSAPP_TOKEN || '', phoneId: process.env.WHATSAPP_PHONE_ID || '' });

function waDigits(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('03')) d = `92${d.slice(1)}`;
  return d.length >= 10 ? d : null;
}

router.get(
  '/status',
  asyncRoute(async (_req, res) => {
    const { token, phoneId } = cfg();
    if (!token || !phoneId) {
      return res.json({ connected: false, mode: 'app', displayNumber: null, verifiedName: null, error: null });
    }
    try {
      const r = await fetch(`${GRAPH}/${encodeURIComponent(phoneId)}?fields=display_phone_number,verified_name`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        return res.json({ connected: false, mode: 'cloud', displayNumber: null, verifiedName: null, error: d?.error?.message || `WhatsApp returned ${r.status}` });
      }
      res.json({ connected: true, mode: 'cloud', displayNumber: d.display_phone_number || null, verifiedName: d.verified_name || null, error: null });
    } catch (e) {
      res.json({ connected: false, mode: 'cloud', displayNumber: null, verifiedName: null, error: `Could not reach WhatsApp: ${e.message}` });
    }
  }),
);

router.post(
  '/test',
  asyncRoute(async (req, res) => {
    const { token, phoneId } = cfg();
    if (!token || !phoneId) return res.status(409).json({ error: 'WhatsApp is not connected yet' });
    const to = waDigits(req.body?.to);
    if (!to) return res.status(422).json({ error: 'Enter a WhatsApp number with country code, e.g. 923001234567' });
    const r = await fetch(`${GRAPH}/${encodeURIComponent(phoneId)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name: 'hello_world', language: { code: 'en_US' } } }),
      signal: AbortSignal.timeout(15_000),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: d?.error?.message || `WhatsApp returned ${r.status}` });
    res.json({ ok: true, message: `Test message sent to +${to}` });
  }),
);

export default router;

import { CheckCircle2, Loader2, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { WhatsAppIcon } from '@/components/WhatsAppPhone';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';

type Status = {
  connected: boolean;
  mode: 'app' | 'cloud';
  displayNumber: string | null;
  verifiedName: string | null;
  error: string | null;
};

function useWhatsAppStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(false);
  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      setStatus(await apiRequest<Status>('/admin/whatsapp/status'));
    } catch {
      setStatus({ connected: false, mode: 'app', displayNumber: null, verifiedName: null, error: 'Could not check status' });
    } finally {
      setChecking(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { status, checking, refresh };
}

/**
 * Header pill: "Connect WhatsApp" + status dot + refresh.
 * compact = icon-only (mobile header).
 */
export function WhatsAppConnectButton({ compact = false }: { compact?: boolean }) {
  const { status, checking, refresh } = useWhatsAppStatus();
  const [open, setOpen] = useState(false);
  const connected = Boolean(status?.connected);
  const label = connected ? 'WhatsApp connected' : 'Connect WhatsApp';

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#128C7E] hover:bg-gva-canvas"
        >
          <WhatsAppIcon className="h-5 w-5" />
          <span className={cn('absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-gva-surface', connected ? 'bg-emerald-500' : 'bg-slate-400')} />
        </button>
      ) : (
        <div className="inline-flex h-9 items-center rounded-full border border-[#25D366]/60 bg-gva-surface pl-1 pr-1.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-[#128C7E] hover:bg-[#25D366]/10 dark:text-[#4ade80]"
          >
            <WhatsAppIcon className="h-4 w-4" />
            {connected ? status?.displayNumber || 'Connected' : 'Connect WhatsApp'}
          </button>
          <span
            className={cn('mx-1 h-2 w-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-slate-400')}
            title={connected ? 'Connected' : 'Not connected'}
          />
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="Check WhatsApp status again"
            className="rounded-full p-1 text-gva-muted hover:bg-gva-canvas hover:text-gva-ink"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', checking && 'animate-spin')} />
          </button>
        </div>
      )}
      {open ? <WhatsAppDialog status={status} checking={checking} onRefresh={refresh} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function WhatsAppDialog({
  status,
  checking,
  onRefresh,
  onClose,
}: {
  status: Status | null;
  checking: boolean;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}) {
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function sendTest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await apiRequest<{ message: string }>('/admin/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });
      setMsg({ ok: true, text: r.message });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const connected = Boolean(status?.connected);
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="WhatsApp">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/50" />
      <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-gva-surface p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#128C7E]">
              <WhatsAppIcon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gva-ink">WhatsApp</h2>
              <p className={cn('text-xs font-semibold', connected ? 'text-emerald-700' : 'text-gva-muted')}>
                {checking ? 'Checking…' : connected ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gva-muted hover:bg-gva-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>

        {connected ? (
          <>
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              <p className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> {status?.verifiedName || 'Business number'}
              </p>
              <p className="mt-0.5 tabular-nums">{status?.displayNumber}</p>
            </div>
            <form onSubmit={sendTest} className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-gva-ink-2">
                Send a test message to
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="923001234567"
                  inputMode="tel"
                  className="mt-1 h-10 w-full rounded-lg border border-gva-hairline bg-gva-surface px-3 text-sm text-gva-ink outline-none focus:border-gva-green"
                />
              </label>
              <button type="submit" disabled={busy || !to.trim()} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-semibold text-white hover:bg-[#1fb257] disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon className="h-4 w-4" />} Send test
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-3 text-sm text-gva-ink-2">
            {status?.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800">{status.error}</p> : null}
            <p>
              Right now reminders and invoices open <b className="text-gva-ink">WhatsApp on this device</b> with the message
              ready — you press send.
            </p>
            <p className="font-semibold text-gva-ink">To send automatically from the app:</p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                Create a WhatsApp Business account in{' '}
                <a href="https://business.facebook.com/" target="_blank" rel="noreferrer" className="font-semibold text-gva-green-deep underline">
                  Meta Business
                </a>{' '}
                and add your number under <b>WhatsApp → API Setup</b>.
              </li>
              <li>
                Copy the <b>Phone number ID</b> and a <b>permanent access token</b>.
              </li>
              <li>
                In Vercel → gva-app → Settings → Environment Variables add <code className="rounded bg-gva-canvas px-1">WHATSAPP_PHONE_ID</code> and{' '}
                <code className="rounded bg-gva-canvas px-1">WHATSAPP_TOKEN</code>, then redeploy.
              </li>
              <li>Come back here and press refresh — the dot turns green.</li>
            </ol>
          </div>
        )}

        {msg ? (
          <p className={cn('mt-3 rounded-lg px-3 py-2 text-sm', msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800')}>{msg.text}</p>
        ) : null}

        <button
          type="button"
          onClick={() => void onRefresh()}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gva-hairline text-sm font-semibold text-gva-ink hover:bg-gva-canvas"
        >
          <RefreshCw className={cn('h-4 w-4', checking && 'animate-spin')} /> Check again
        </button>
      </div>
    </div>,
    document.body,
  );
}

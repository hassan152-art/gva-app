import {
  AlertTriangle,
  CalendarDays,
  Check,
  ExternalLink,
  FileText,
  Inbox,
  Landmark,
  Loader2,
  Mail,
  MessageSquareText,
  RefreshCw,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChildAvatar } from '@/components/kafalat/KafalatBits';
import { WhatsAppPhone } from '@/components/WhatsAppPhone';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import {
  donorAppApi,
  looksLikeImage,
  type AppRequest,
  type RequestCounts,
  type RequestKind,
  type RequestStatus,
} from '@/lib/donorAppApi';
import { fmtDate, fmtTime, pkr } from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';
import { slipViewUrl } from '@/lib/whatsapp';
import { EmptyState, Label, LoadingBlock, Modal, Notice, btn, btnDark, btnGreen, btnRose, textarea } from './appUi';

const STATUS_TABS: { id: RequestStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const KIND_FILTERS: { id: RequestKind | null; label: string }[] = [
  { id: null, label: 'All' },
  { id: 'sponsorship', label: 'New sponsorship' },
  { id: 'payment', label: 'Monthly payment' },
];

export function ApprovalsPage() {
  useMobilePageChrome({ title: 'Sponsorship Approvals' });
  const [status, setStatus] = useState<RequestStatus>('pending');
  const [kind, setKind] = useState<RequestKind | null>(null);
  const [requests, setRequests] = useState<AppRequest[] | null>(null);
  const [counts, setCounts] = useState<RequestCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ request: AppRequest; action: 'approve' | 'reject' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await donorAppApi.listRequests({ status, kind });
      setRequests(res.requests);
      setCounts(res.counts);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load requests.');
      setRequests((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  }, [status, kind]);

  useEffect(() => {
    setRequests(null);
    void load();
  }, [load]);

  function countFor(id: RequestStatus): number | null {
    if (!counts) return null;
    return counts[id];
  }

  function kindCount(id: RequestKind | null): number | null {
    if (!counts || status !== 'pending') return null;
    if (id === 'sponsorship') return counts.pending_sponsorship;
    if (id === 'payment') return counts.pending_payment;
    return counts.pending;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-gva-ink">Sponsorship Approvals</h1>
          <p className="text-sm text-gva-muted">
            Requests from the mobile app — new sponsorships and monthly payment slips waiting for your check.
          </p>
        </div>
        <button type="button" className={btn} onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gva-hairline bg-gva-surface p-1">
        {STATUS_TABS.map((t) => {
          const c = countFor(t.id);
          const activeTab = status === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setStatus(t.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                activeTab ? 'bg-gva-green text-white' : 'text-gva-ink-2 hover:bg-gva-canvas',
              )}
            >
              {t.label}
              {c !== null ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums',
                    activeTab
                      ? 'bg-white/25 text-white'
                      : t.id === 'pending' && c > 0
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-700',
                  )}
                >
                  {c}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Kind chips */}
      <div className="flex flex-wrap gap-2">
        {KIND_FILTERS.map((k) => {
          const c = kindCount(k.id);
          const activeChip = kind === k.id;
          return (
            <button
              key={k.label}
              type="button"
              onClick={() => setKind(k.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                activeChip
                  ? 'border-gva-green bg-gva-tint text-gva-green-deep'
                  : 'border-gva-hairline bg-gva-surface text-gva-ink-2 hover:bg-gva-canvas',
              )}
            >
              {k.label}
              {c !== null ? <span className="tabular-nums opacity-80">({c})</span> : null}
            </button>
          );
        })}
      </div>

      {message ? <Notice tone="success" onClose={() => setMessage(null)}>{message}</Notice> : null}
      {error ? <Notice tone="error" onClose={() => setError(null)}>{error}</Notice> : null}

      {requests === null ? (
        <LoadingBlock />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={status === 'pending' ? 'Nothing waiting for approval' : `No ${status} requests`}
          text={status === 'pending' ? 'New requests from the mobile app will appear here.' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              onApprove={() => setDialog({ request: r, action: 'approve' })}
              onReject={() => setDialog({ request: r, action: 'reject' })}
            />
          ))}
        </div>
      )}

      {dialog ? (
        <DecisionDialog
          request={dialog.request}
          action={dialog.action}
          onClose={() => setDialog(null)}
          onDone={async (m) => {
            setDialog(null);
            setMessage(m);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function KindBadge({ kind }: { kind: RequestKind }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold',
        kind === 'sponsorship' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-700',
      )}
    >
      {kind === 'sponsorship' ? 'New sponsorship' : 'Monthly payment'}
    </span>
  );
}

function StatusPill({ status }: { status: RequestStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold',
        status === 'pending' && 'bg-amber-50 text-amber-700',
        status === 'approved' && 'bg-emerald-50 text-emerald-700',
        status === 'rejected' && 'bg-rose-50 text-rose-700',
      )}
    >
      {status === 'pending' ? 'Pending' : status === 'approved' ? 'Approved' : 'Rejected'}
    </span>
  );
}

function SlipPreview({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-gva-hairline text-xs text-gva-muted sm:w-40">
        No slip attached
      </div>
    );
  }
  const href = slipViewUrl(url);
  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-40">
      {looksLikeImage(url) ? (
        <a href={href} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-gva-hairline bg-gva-canvas">
          <img src={url} alt="Payment slip" className="h-36 w-full object-cover sm:h-28" loading="lazy" />
        </a>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="flex h-28 items-center justify-center rounded-xl border border-gva-hairline bg-gva-canvas text-gva-muted"
        >
          <FileText className="h-8 w-8" />
        </a>
      )}
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-gva-green-deep hover:underline"
      >
        View slip <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function RequestCard({
  request: r,
  onApprove,
  onReject,
}: {
  request: AppRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const conflicts = r.children.filter(
    (c) => c.sponsorCode && (!r.donor.sponsorCode || c.sponsorCode !== r.donor.sponsorCode),
  );
  const months = r.monthLabels.length ? r.monthLabels.join(', ') : r.months.join(', ');

  return (
    <article className="rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={r.kind} />
          <StatusPill status={r.status} />
        </div>
        <p className="text-xs text-gva-muted">
          {fmtDate(r.createdAt)} · {fmtTime(r.createdAt)}
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          {/* Children */}
          <div className="flex flex-wrap gap-2">
            {r.children.map((c) => (
              <Link
                key={c.id}
                to={`/organization/orphans/${c.id}`}
                className="flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-gva-hairline bg-gva-canvas py-1.5 pl-1.5 pr-3 hover:border-gva-green"
              >
                <ChildAvatar name={c.name ?? c.code ?? 'Child'} photoUrl={c.photoUrl} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gva-ink">{c.name ?? 'Unnamed child'}</span>
                  <span className="block truncate font-mono text-[11px] text-gva-muted">{c.code ?? '—'}</span>
                </span>
              </Link>
            ))}
            {r.children.length === 0 ? <p className="text-sm text-gva-muted">No child linked.</p> : null}
          </div>

          {conflicts.length > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
              <span>
                {conflicts.map((c) => `${c.code ?? c.name ?? 'Child'} is already sponsored by ${c.sponsorCode}`).join('; ')}
                {r.donor.sponsorCode ? ` (this donor is ${r.donor.sponsorCode}).` : '.'}
              </span>
            </div>
          ) : null}

          {/* Donor */}
          <div className="rounded-xl border border-gva-hairline px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gva-muted">Donor</p>
            <p className="break-words text-sm font-semibold text-gva-ink">
              {r.donor.name ?? 'Unknown donor'}
              {r.donor.sponsorCode ? (
                <span className="ml-2 rounded bg-gva-tint px-1.5 py-px font-mono text-[11px] text-gva-green-deep">{r.donor.sponsorCode}</span>
              ) : null}
            </p>
            <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-gva-ink-2 sm:flex-row sm:flex-wrap sm:gap-x-4">
              {r.donor.email ? (
                <a href={`mailto:${r.donor.email}`} className="inline-flex min-w-0 items-center gap-1 break-all hover:underline">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {r.donor.email}
                </a>
              ) : null}
              <WhatsAppPhone phone={r.donor.phone} />
            </div>
          </div>

          {/* Payment */}
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-gva-muted">Amount</dt>
              <dd className="font-bold tabular-nums text-gva-ink">{pkr(r.amountPkr)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gva-muted">
                <CalendarDays className="h-3 w-3" /> Months
              </dt>
              <dd className="break-words text-gva-ink">
                {months || '—'} {r.year}
              </dd>
            </div>
            {r.account ? (
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gva-muted">
                  <Landmark className="h-3 w-3" /> Sent to
                </dt>
                <dd className="whitespace-pre-wrap break-words text-xs text-gva-ink-2">{r.account}</dd>
              </div>
            ) : null}
          </dl>

          {r.note ? (
            <div className="flex items-start gap-2 rounded-lg bg-gva-canvas px-3 py-2 text-sm text-gva-ink-2">
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-gva-muted" />
              <p className="min-w-0 whitespace-pre-wrap break-words">
                <span className="font-semibold text-gva-ink">Donor note: </span>
                {r.note}
              </p>
            </div>
          ) : null}

          {r.status !== 'pending' ? (
            <div
              className={cn(
                'rounded-lg border px-3 py-2 text-sm',
                r.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700',
              )}
            >
              <p className="font-semibold">
                {r.status === 'approved' ? 'Approved' : 'Rejected'}
                {r.decidedAt ? ` on ${fmtDate(r.decidedAt)} · ${fmtTime(r.decidedAt)}` : ''}
              </p>
              {r.adminNote ? <p className="mt-0.5 whitespace-pre-wrap break-words">{r.adminNote}</p> : null}
            </div>
          ) : null}
        </div>

        <SlipPreview url={r.slipUrl} />
      </div>

      {r.status === 'pending' ? (
        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-gva-hairline pt-3 sm:flex-row sm:justify-end">
          <button type="button" className={btnRose} onClick={onReject}>
            <X className="h-4 w-4" /> Reject
          </button>
          <button type="button" className={btnGreen} onClick={onApprove}>
            <Check className="h-4 w-4" /> Approve
          </button>
        </div>
      ) : null}
    </article>
  );
}

function DecisionDialog({
  request,
  action,
  onClose,
  onDone,
}: {
  request: AppRequest;
  action: 'approve' | 'reject';
  onClose: () => void;
  onDone: (message: string) => void | Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const approve = action === 'approve';
  const childList = request.children.map((c) => c.code ?? c.name).filter(Boolean).join(', ');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = note.trim();
    if (!approve && !trimmed) {
      setError('Please give a reason — the donor will see it.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (approve) {
        const res = await donorAppApi.approveRequest(request.id, trimmed || undefined);
        const extra = [res.sponsorCode ? `Sponsor ${res.sponsorCode}` : null, res.receiptNo ? `Receipt ${res.receiptNo}` : null]
          .filter(Boolean)
          .join(' · ');
        await onDone(extra ? `${res.message} (${extra})` : res.message);
      } else {
        const res = await donorAppApi.rejectRequest(request.id, trimmed);
        await onDone(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <Modal
      title={approve ? 'Approve request?' : 'Reject request?'}
      subtitle={`${request.donor.name ?? 'Donor'} · ${pkr(request.amountPkr)}${childList ? ` · ${childList}` : ''}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-gva-ink-2">
          {approve
            ? request.kind === 'sponsorship'
              ? 'The child will be linked to this donor and the payment will be recorded.'
              : 'The payment will be recorded against the selected months.'
            : 'The donor will see your reason in the app.'}
        </p>
        <Label>
          <span>{approve ? 'Note (optional)' : 'Reason *'}</span>
          <textarea
            className={textarea}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={approve ? 'e.g. Slip verified with bank statement.' : 'e.g. The slip is not readable, please upload a clearer photo.'}
            autoFocus
          />
        </Label>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={btn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={approve ? btnGreen : btnDark} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : approve ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {approve ? 'Approve' : 'Reject'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

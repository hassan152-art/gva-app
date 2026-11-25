import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Lock,
  MessagesSquare,
  Paperclip,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { WhatsAppPhone } from '@/components/WhatsAppPhone';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import {
  TICKET_CATEGORY_LABEL,
  TICKET_STATUS_LABEL,
  donorAppApi,
  looksLikeImage,
  type TicketCounts,
  type TicketDetail,
  type TicketStatus,
  type TicketSummary,
} from '@/lib/donorAppApi';
import { fmtDate, fmtTime } from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';
import { slipViewUrl } from '@/lib/whatsapp';
import { EmptyState, LoadingBlock, Notice, btn, btnDark, btnSm, field, textarea } from './appUi';

type Filter = 'pending' | 'resolved' | null;

function TicketStatusPill({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
        status === 'open' && 'bg-amber-50 text-amber-700',
        status === 'in_progress' && 'bg-sky-50 text-sky-700',
        status === 'resolved' && 'bg-emerald-50 text-emerald-700',
        status === 'closed' && 'bg-slate-100 text-slate-700',
      )}
    >
      {TICKET_STATUS_LABEL[status]}
    </span>
  );
}

export function ComplaintsPage() {
  useMobilePageChrome({ title: 'Complaints' });
  const [params, setParams] = useSearchParams();
  const openId = params.get('ticket');
  const [filter, setFilter] = useState<Filter>('pending');
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [counts, setCounts] = useState<TicketCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await donorAppApi.listTickets(filter);
      setTickets(res.tickets);
      setCounts(res.counts);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load complaints.');
      setTickets((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setTickets(null);
    void load();
  }, [load]);

  const openTicket = useCallback(
    (id: string | null) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set('ticket', id);
          else next.delete('ticket');
          return next;
        },
        { replace: false },
      );
    },
    [setParams],
  );

  const tiles: { id: Filter; label: string; value: number | undefined; icon: typeof Inbox; tone: string }[] = [
    { id: null, label: 'Total', value: counts?.total, icon: MessagesSquare, tone: 'bg-slate-100 text-slate-700' },
    { id: 'pending', label: 'Pending', value: counts?.pending, icon: Clock, tone: 'bg-amber-50 text-amber-700' },
    { id: 'resolved', label: 'Resolved', value: counts?.resolved, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-8">
      <div className={cn('flex flex-wrap items-start justify-between gap-3', openId && 'hidden lg:flex')}>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-gva-ink">Complaints</h1>
          <p className="text-sm text-gva-muted">Tickets donors raised from the mobile app.</p>
        </div>
        <button type="button" className={btn} onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      <div className={cn('grid grid-cols-3 gap-2 sm:gap-3', openId && 'hidden lg:grid')}>
        {tiles.map((t) => {
          const active = filter === t.id;
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => setFilter(t.id)}
              aria-pressed={active}
              className={cn(
                'flex min-w-0 flex-col items-start gap-2 rounded-xl border bg-gva-surface px-3 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors sm:flex-row sm:items-center',
                active ? 'border-gva-green ring-1 ring-gva-green/30' : 'border-gva-hairline hover:bg-gva-canvas',
              )}
            >
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', t.tone)}>
                <t.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] text-gva-muted">{t.label}</span>
                <span className="block text-lg font-bold tabular-nums text-gva-ink">{t.value ?? '—'}</span>
              </span>
            </button>
          );
        })}
      </div>

      {error ? <Notice tone="error" onClose={() => setError(null)}>{error}</Notice> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className={cn('min-w-0', openId && 'hidden lg:block')}>
          {tickets === null ? (
            <LoadingBlock />
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={filter === 'pending' ? 'No pending complaints' : 'No complaints'}
              text="Complaints donors send from the app will show up here."
            />
          ) : (
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li key={t.id}>
                  <TicketRow ticket={t} active={t.id === openId} onOpen={() => openTicket(t.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cn('min-w-0', !openId && 'hidden lg:block')}>
          {openId ? (
            <TicketPanel
              key={openId}
              id={openId}
              onClose={() => openTicket(null)}
              onChanged={() => void load()}
            />
          ) : (
            <div className="sticky top-4 flex h-64 flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-gva-hairline bg-gva-surface text-sm text-gva-muted">
              <MessagesSquare className="mb-2 h-6 w-6" />
              Select a complaint to read and reply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketRow({ ticket: t, active, onOpen }: { ticket: TicketSummary; active: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'block w-full min-w-0 rounded-[var(--radius-card)] border bg-gva-surface p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors',
        active ? 'border-gva-green ring-1 ring-gva-green/30' : 'border-gva-hairline hover:bg-gva-canvas',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-gva-muted">{t.ticketNo}</p>
          <p className="truncate text-sm font-bold text-gva-ink">{t.subject}</p>
        </div>
        <TicketStatusPill status={t.status} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gva-ink-2">
        <span className="rounded bg-gva-canvas px-1.5 py-px font-semibold">{TICKET_CATEGORY_LABEL[t.category] ?? t.category}</span>
        <span className="truncate">{t.donor.name ?? 'Donor'}</span>
        {t.child?.code ? <span className="font-mono text-gva-muted">· {t.child.code}</span> : null}
      </div>
      {t.lastMessage ? (
        <p className="mt-1.5 line-clamp-2 break-words text-xs text-gva-muted">
          <span className="font-semibold">{t.lastMessage.role === 'admin' ? 'You: ' : 'Donor: '}</span>
          {t.lastMessage.body}
        </p>
      ) : null}
      <p className="mt-1.5 text-[11px] text-gva-muted">
        Updated {fmtDate(t.updatedAt ?? t.createdAt)} · {fmtTime(t.updatedAt ?? t.createdAt)}
        {t.messages ? ` · ${t.messages} message${t.messages === 1 ? '' : 's'}` : ''}
      </p>
    </button>
  );
}

function Attachment({ url, mine }: { url: string; mine: boolean }) {
  const href = slipViewUrl(url);
  if (looksLikeImage(url)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-lg border border-gva-hairline">
        <img src={url} alt="Attachment" className="max-h-48 w-full object-cover" loading="lazy" />
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'mt-2 inline-flex items-center gap-1 text-xs font-semibold underline',
        mine ? 'text-white' : 'text-gva-green-deep',
      )}
    >
      <FileText className="h-3.5 w-3.5" /> View attachment <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function TicketPanel({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [replyStatus, setReplyStatus] = useState<TicketStatus>('resolved');
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const threadEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    donorAppApi
      .getTicket(id)
      .then((t) => {
        if (!cancelled) setTicket(t);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not open the complaint.');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [ticket?.thread.length]);

  async function setStatus(status: TicketStatus) {
    setBusy(status);
    setError(null);
    try {
      const t = await donorAppApi.setTicketStatus(id, status);
      setTicket(t);
      setMessage(`Marked as ${TICKET_STATUS_LABEL[status].toLowerCase()}.`);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the status.');
    } finally {
      setBusy(null);
    }
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError('Write a reply first.');
      return;
    }
    setBusy('reply');
    setError(null);
    try {
      const t = await donorAppApi.replyTicket(id, { body: body.trim(), status: replyStatus, attachment: file });
      setTicket(t);
      setBody('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setMessage('Reply sent.');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reply.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex min-w-0 flex-col rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:sticky lg:top-4">
      {/* Header */}
      <div className="flex items-start gap-2 border-b border-gva-hairline p-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gva-ink-2 hover:bg-gva-canvas lg:hidden"
          aria-label="Back to complaints"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          {ticket ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-gva-muted">{ticket.ticketNo}</span>
                <TicketStatusPill status={ticket.status} />
                <span className="rounded bg-gva-canvas px-1.5 py-px text-[11px] font-semibold text-gva-ink-2">
                  {TICKET_CATEGORY_LABEL[ticket.category] ?? ticket.category}
                </span>
              </div>
              <h2 className="mt-1 break-words text-base font-bold text-gva-ink">{ticket.subject}</h2>
              <div className="mt-1 flex flex-col gap-0.5 text-xs text-gva-ink-2 sm:flex-row sm:flex-wrap sm:gap-x-3">
                <span className="font-semibold">
                  {ticket.donor.name ?? 'Donor'}
                  {ticket.donor.sponsorCode ? <span className="ml-1 font-mono text-gva-muted">({ticket.donor.sponsorCode})</span> : null}
                </span>
                {ticket.donor.email ? <span className="break-all">{ticket.donor.email}</span> : null}
                <WhatsAppPhone phone={ticket.donor.phone} />
                {ticket.child ? (
                  <Link to={`/organization/orphans/${ticket.child.id}`} className="font-mono text-gva-green-deep hover:underline">
                    Child {ticket.child.code ?? ''}
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-gva-muted">Loading…</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="hidden rounded p-1 text-gva-muted hover:text-gva-ink lg:block"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {ticket ? (
        <div className="flex flex-wrap gap-2 border-b border-gva-hairline px-4 py-2.5">
          <button
            type="button"
            className={btnSm}
            disabled={busy !== null || ticket.status === 'in_progress'}
            onClick={() => void setStatus('in_progress')}
          >
            {busy === 'in_progress' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
            Mark in progress
          </button>
          <button
            type="button"
            className={cn(btnSm, 'text-emerald-700')}
            disabled={busy !== null || ticket.status === 'resolved'}
            onClick={() => void setStatus('resolved')}
          >
            {busy === 'resolved' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Resolve
          </button>
          <button
            type="button"
            className={btnSm}
            disabled={busy !== null || ticket.status === 'closed'}
            onClick={() => void setStatus('closed')}
          >
            {busy === 'closed' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            Close
          </button>
        </div>
      ) : null}

      {/* Thread */}
      <div className="max-h-[55vh] min-h-[12rem] space-y-3 overflow-y-auto bg-gva-canvas p-4">
        {!ticket && !error ? (
          <div className="flex h-40 items-center justify-center text-gva-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : null}
        {ticket?.thread.map((m) => {
          const mine = m.role === 'admin';
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] min-w-0 rounded-2xl px-3 py-2 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.06)]',
                  mine ? 'rounded-br-md bg-gva-green text-white' : 'rounded-bl-md border border-gva-hairline bg-gva-surface text-gva-ink',
                )}
              >
                <p className={cn('mb-0.5 text-[11px] font-semibold', mine ? 'text-white/80' : 'text-gva-muted')}>
                  {m.author ?? (mine ? 'Admin' : 'Donor')}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                {m.attachmentUrl ? <Attachment url={m.attachmentUrl} mine={mine} /> : null}
                <p className={cn('mt-1 text-right text-[10px]', mine ? 'text-white/70' : 'text-gva-muted')}>
                  {fmtDate(m.createdAt)} · {fmtTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        {ticket && ticket.thread.length === 0 ? <p className="text-center text-sm text-gva-muted">No messages yet.</p> : null}
        <div ref={threadEnd} />
      </div>

      <div className="space-y-2 p-4">
        {message ? <Notice tone="success" onClose={() => setMessage(null)}>{message}</Notice> : null}
        {error ? <Notice tone="error" onClose={() => setError(null)}>{error}</Notice> : null}

        {ticket ? (
          <form onSubmit={sendReply} className="space-y-2">
            <textarea
              className={textarea}
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a reply to the donor…"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className={cn(btnSm, 'h-10 min-w-0 cursor-pointer sm:max-w-[14rem]')}>
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{file ? file.name : 'Attach image / PDF'}</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {file ? (
                <button
                  type="button"
                  className="self-start text-xs font-semibold text-rose-700 hover:underline sm:self-center"
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  Remove
                </button>
              ) : null}
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:justify-end">
                <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-gva-ink-2 sm:flex-none">
                  <span className="shrink-0">Set status</span>
                  <select
                    className={cn(field, 'min-w-0 sm:w-36')}
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value as TicketStatus)}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <button type="submit" className={cn(btnDark, 'shrink-0')} disabled={busy !== null}>
                  {busy === 'reply' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}

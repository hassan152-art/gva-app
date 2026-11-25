import {
  ArrowLeft,
  BadgePercent,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { SponsorStatement, downloadText, statementCsv, statementXls, type StatementData } from '@/components/donation/SponsorStatement';
import { ChildAvatar } from '@/components/kafalat/KafalatBits';
import { WhatsAppIcon, WhatsAppPhone } from '@/components/WhatsAppPhone';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import {
  METHOD_LABEL,
  donationApi,
  invoiceUrl,
  type Invoice,
  type MonthReceivables,
  type SponsorLedger,
  type SponsorOption,
} from '@/lib/donationApi';
import { MONTHS, fmtDate, fmtTime, nowLocalInput, pkr } from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';
import { toWhatsApp, slipViewUrl } from '@/lib/whatsapp';
import { listAdminOrphans } from '@/lib/adminApi';
import { Pager } from '@/components/ui/pager';

const field =
  'h-10 w-full rounded-lg border border-gva-hairline bg-gva-surface px-3 text-sm text-gva-ink outline-none focus:border-gva-green focus:ring-2 focus:ring-gva-green/20';
const btn =
  'inline-flex h-10 items-center gap-2 rounded-lg border border-gva-hairline bg-gva-surface px-3.5 text-sm font-semibold text-gva-ink hover:bg-gva-canvas disabled:opacity-50';
const btnDark =
  'inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50';

/**
 * Donation Collection — Edspire-style receivables for kafalat.
 * Search a sponsor → their invoices (one per child per month), payment
 * history, receive payment, print / WhatsApp the invoice.
 * Without a sponsor: the month's receivables for everyone (paid vs unpaid).
 */
export function DonationCollectionPage() {
  useMobilePageChrome({ title: 'Donation Collection' });
  const [params, setParams] = useSearchParams();
  const sponsorCode = params.get('sponsor') || '';
  const childId = params.get('child') || '';
  const searchMode = params.get('by') === 'child' ? 'child' : 'sponsor';
  const now = new Date();
  const year = Number(params.get('year')) || now.getFullYear();
  const month = Number(params.get('month')) || now.getMonth() + 1;

  const [ledger, setLedger] = useState<SponsorLedger | null>(null);
  const [overview, setOverview] = useState<MonthReceivables | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | 'receive' | 'create' | 'reports' | 'report' | 'sponsor'>(null);
  const [reportChild, setReportChild] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Month view: server-side filter, search and page.
  const [ovFilter, setOvFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [ovQ, setOvQ] = useState('');
  const [ovQDebounced, setOvQDebounced] = useState('');
  const [ovPage, setOvPage] = useState(1);
  useEffect(() => {
    const t = window.setTimeout(() => setOvQDebounced(ovQ.trim()), 300);
    return () => window.clearTimeout(t);
  }, [ovQ]);
  useEffect(() => setOvPage(1), [ovFilter, ovQDebounced, year, month]);

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      setParams(next, { replace: false });
    },
    [params, setParams],
  );

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (sponsorCode) {
        setLedger(await donationApi.ledger(sponsorCode));
      } else {
        setLedger(null);
        setOverview(
          await donationApi.receivables(year, month, ovFilter === 'all' ? undefined : ovFilter, ovQDebounced || undefined, ovPage, 50),
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sponsorCode, year, month, ovFilter, ovQDebounced, ovPage]);

  useEffect(() => {
    setSelected(new Set());
    void load();
  }, [load]);

  const flash = (m: string) => {
    setMessage(m);
    window.setTimeout(() => setMessage((cur) => (cur === m ? null : cur)), 6000);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {sponsorCode ? (
            <button type="button" onClick={() => setParam({ sponsor: null, child: null })} className="mt-1 rounded-md p-1 text-gva-ink-2 hover:bg-gva-canvas" aria-label="Back to month view">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div>
            <h1 className="font-display text-2xl font-bold text-gva-ink">Donation Collection</h1>
            <p className="text-sm text-gva-muted">Search a sponsor to view their kafalat ledger, or see who has paid this month.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => setDialog('sponsor')}>
            <UserPlus className="h-4 w-4" /> Add sponsor
          </button>
          <button type="button" className={btn} disabled={!ledger} onClick={() => setDialog('reports')} title={ledger ? 'Donation reports' : 'Select a sponsor first'}>
            <FileText className="h-4 w-4" /> Reports
          </button>
          <button type="button" className={btn} onClick={() => setDialog('create')}>
            <Plus className="h-4 w-4" /> Create Donation
          </button>
          <button type="button" className={btnDark} disabled={!ledger} onClick={() => setDialog('receive')} title={ledger ? undefined : 'Select a sponsor first'}>
            <Wallet className="h-4 w-4" /> Receive Payment
          </button>
        </div>
      </div>

      <SponsorSearch
        value={searchMode === 'child' ? (ledger?.children.find((c) => c.id === childId)?.code ?? '') : sponsorCode}
        mode={searchMode}
        onMode={(m) => setParam({ by: m === 'child' ? 'child' : null })}
        onPick={(hit) => {
          if (!hit.sponsorCode) {
            setError(`${hit.title} has no sponsor yet — link a sponsor first (Add sponsor, or edit the orphan).`);
            return;
          }
          setError(null);
          setParam({ sponsor: hit.sponsorCode, child: hit.childId ?? null });
        }}
        onClear={() => setParam({ sponsor: null, child: null })}
      />

      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800" role="status">{message}</p> : null}
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{error}</p> : null}

      {sponsorCode ? (
        ledger && ledger.sponsor.code.toUpperCase() === sponsorCode.toUpperCase() ? (
          <SponsorView
            ledger={ledger}
            childId={childId}
            onShowAll={() => setParam({ child: null })}
            selected={selected}
            setSelected={setSelected}
            reload={load}
            flash={flash}
            onError={setError}
            onReceive={() => setDialog('receive')}
            onReport={() => {
              setReportChild(childId);
              setDialog('report');
            }}
          />
        ) : error && !loading ? (
          <div className="rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface px-6 py-12 text-center">
            <p className="font-semibold text-gva-ink">Nothing to show for “{sponsorCode}”</p>
            <p className="mt-1 text-sm text-gva-muted">Search a sponsor by name, code (SP601) or phone, or switch to Child wise.</p>
          </div>
        ) : (
          <LoadingBlock />
        )
      ) : overview ? (
        <MonthOverview
          data={overview}
          loading={loading}
          filter={ovFilter}
          onFilter={setOvFilter}
          q={ovQ}
          onQ={setOvQ}
          onPage={setOvPage}
          onMonth={(y, m) => setParam({ year: String(y), month: String(m) })}
          onSponsor={(code) => setParam({ sponsor: code })}
          onCreate={() => setDialog('create')}
        />
      ) : (
        <LoadingBlock />
      )}

      {dialog === 'receive' && ledger ? (
        <ReceiveDialog
          ledger={ledger}
          selectedIds={[...selected]}
          onClose={() => setDialog(null)}
          onDone={async (m) => {
            setDialog(null);
            setSelected(new Set());
            flash(m);
            await load();
          }}
        />
      ) : null}
      {dialog === 'create' ? (
        <CreateFeeDialog
          ledger={ledger}
          defaultYear={year}
          defaultMonth={month}
          onClose={() => setDialog(null)}
          onDone={async (m) => {
            setDialog(null);
            flash(m);
            await load();
          }}
        />
      ) : null}
      {dialog === 'sponsor' ? (
        <SponsorDialog
          onClose={() => setDialog(null)}
          onDone={(code, m) => {
            setDialog(null);
            flash(m);
            setParam({ sponsor: code });
          }}
        />
      ) : null}
      {dialog === 'reports' && ledger ? (
        <ReportsDialog
          ledger={ledger}
          defaultChild={childId}
          onClose={() => setDialog(null)}
          onGenerate={(child) => {
            setReportChild(child);
            setDialog('report');
          }}
        />
      ) : null}
      {dialog === 'report' && ledger ? <ReportOverlay ledger={ledger} childId={reportChild} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex h-48 items-center justify-center rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface text-gva-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sponsor search
// ---------------------------------------------------------------------------

type SearchHit = { key: string; title: string; sub: string; sponsorCode: string | null; childId?: string; photoUrl?: string | null };

/** Edspire-style search: "Sponsor wise" (donor) or "Child wise" (orphan). */
function SponsorSearch({
  value,
  mode,
  onMode,
  onPick,
  onClear,
}: {
  value: string;
  mode: 'sponsor' | 'child';
  onMode: (m: 'sponsor' | 'child') => void;
  onPick: (hit: SearchHit) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState(value);
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setQ(value), [value]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(async () => {
      setBusy(true);
      try {
        if (mode === 'sponsor') {
          const r = await donationApi.sponsorOptions(q.trim());
          setOpts(
            r.sponsors.map((o: SponsorOption) => ({
              key: o.code,
              title: o.name,
              sub: `${o.code} · ${o.children} child${o.children === 1 ? '' : 'ren'}${o.phone ? ` · ${o.phone}` : ''}`,
              sponsorCode: o.code,
            })),
          );
        } else {
          const r = await listAdminOrphans({ kind: 'orphan', q: q.trim(), pageSize: 20 });
          setOpts(
            r.orphans.slice(0, 30).map((o) => ({
              key: o.id,
              title: o.nameEn || o.nameAr || o.code || 'Orphan',
              sub: `${o.code ?? ''} · ${o.rosterSponsor ? `Sponsor: ${o.rosterSponsor.name} (${o.rosterSponsor.code})` : 'No sponsor'}`,
              sponsorCode: o.rosterSponsor?.code ?? null,
              childId: o.id,
              photoUrl: o.photoThumbnailUrl ?? o.photoUrl,
            })),
          );
        }
      } catch {
        setOpts([]);
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, open, mode]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (h: SearchHit) => {
    onPick(h);
    setOpen(false);
  };

  return (
    <div ref={box} className="relative flex max-w-2xl flex-wrap items-center gap-2">
      <div className="flex shrink-0 gap-1">
        {(['sponsor', 'child'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              onMode(m);
              setOpts([]);
            }}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold',
              mode === m ? 'bg-slate-900 text-white' : 'text-gva-ink-2 hover:bg-gva-canvas',
            )}
          >
            {m === 'sponsor' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {m === 'sponsor' ? 'Sponsor wise' : 'Child wise'}
          </button>
        ))}
      </div>
      <div className="relative min-w-[240px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gva-muted" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && opts[0]) pick(opts[0]);
          }}
          placeholder={mode === 'sponsor' ? 'Search sponsor — name, code (SP601) or phone' : 'Search orphan — code (OR015) or name'}
          className={cn(field, 'pl-9 pr-9')}
          aria-label={mode === 'sponsor' ? 'Search sponsor' : 'Search orphan'}
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ('');
              onClear();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gva-muted hover:text-gva-ink"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        {open ? (
          <div className="absolute left-0 right-0 top-11 z-30 max-h-80 overflow-y-auto rounded-xl border border-gva-hairline bg-gva-surface p-1 shadow-xl">
            {busy && !opts.length ? (
              <p className="px-3 py-3 text-sm text-gva-muted">Searching…</p>
            ) : opts.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gva-muted">{mode === 'sponsor' ? 'No sponsor found.' : 'No orphan found.'}</p>
            ) : (
              opts.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => pick(o)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-gva-canvas"
                >
                  <ChildAvatar name={o.title} photoUrl={o.photoUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gva-ink">{o.title}</span>
                    <span className="block truncate text-xs text-gva-muted">{o.sub}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards / pills
// ---------------------------------------------------------------------------

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Wallet; label: string; value: string; tone: 'slate' | 'green' | 'rose' | 'amber' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-gva-hairline bg-gva-surface px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-gva-muted" title={label}>{label}</p>
        <p className="whitespace-nowrap text-[15px] font-bold tabular-nums text-gva-ink 2xl:text-lg">{value}</p>
      </div>
    </div>
  );
}

function InvoicePill({ status, overdue }: { status: Invoice['status']; overdue?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold',
        status === 'paid' && 'bg-emerald-50 text-emerald-700',
        status === 'partial' && 'bg-amber-50 text-amber-700',
        status === 'unpaid' && 'bg-rose-50 text-rose-600',
      )}
      title={overdue ? 'Past due date' : undefined}
    >
      {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : overdue ? 'Overdue' : 'Unpaid'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Month overview (no sponsor selected)
// ---------------------------------------------------------------------------

function MonthOverview({
  data,
  loading,
  filter,
  onFilter: setFilter,
  q,
  onQ: setQ,
  onPage,
  onMonth,
  onSponsor,
  onCreate,
}: {
  data: MonthReceivables;
  loading: boolean;
  filter: 'all' | 'unpaid' | 'paid';
  onFilter: (f: 'all' | 'unpaid' | 'paid') => void;
  q: string;
  onQ: (q: string) => void;
  onPage: (p: number) => void;
  onMonth: (y: number, m: number) => void;
  onSponsor: (code: string) => void;
  onCreate: () => void;
}) {
  const now = new Date();
  const years = [now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
  const rows = data.invoices;
  const t = data.totals;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <select value={data.month} onChange={(e) => onMonth(data.year, Number(e.target.value))} className={cn(field, 'w-40')} aria-label="Month">
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select value={data.year} onChange={(e) => onMonth(Number(e.target.value), data.month)} className={cn(field, 'w-28')} aria-label="Year">
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-gva-muted" /> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Wallet} label={`Total receivable · ${data.monthLabel}`} value={pkr(t.netPkr)} tone="slate" />
        <StatCard icon={TrendingUp} label={`Received · ${t.paid} paid`} value={pkr(t.paidPkr)} tone="green" />
        <StatCard icon={TrendingDown} label={`Balance due · ${t.unpaid + t.partial} unpaid`} value={pkr(t.balancePkr)} tone="rose" />
        <StatCard icon={BadgePercent} label="Total discount" value={pkr(t.discountPkr)} tone="amber" />
      </div>

      {data.notInvoiced > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            <b>{data.notInvoiced}</b> sponsored child{data.notInvoiced === 1 ? ' has' : 'ren have'} no invoice for {data.monthLabel} {data.year} yet.
          </span>
          <button type="button" onClick={onCreate} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-600 px-3 font-semibold text-white hover:bg-amber-700">
            <Plus className="h-4 w-4" /> Create donation invoices for all
          </button>
        </div>
      ) : null}

      <section className="rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gva-hairline px-4 py-3">
          <div className="flex gap-1 rounded-lg bg-gva-canvas p-1 text-sm font-semibold">
            {(['all', 'unpaid', 'paid'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn('rounded-md px-3 py-1.5', filter === f ? 'bg-gva-surface text-gva-ink shadow-sm' : 'text-gva-muted')}
              >
                {f === 'all' ? `All (${t.invoices})` : f === 'unpaid' ? `Unpaid (${t.unpaid + t.partial})` : `Paid (${t.paid})`}
              </button>
            ))}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by child, sponsor, invoice…" className={cn(field, 'h-9 w-64')} />
        </div>
        {data.totals.invoices === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="font-semibold text-gva-ink">No invoices for {data.monthLabel} {data.year} yet</p>
            <p className="mt-1 text-sm text-gva-muted">Create this month's donation invoices — every sponsored child gets an unpaid invoice.</p>
            <button type="button" onClick={onCreate} className={cn(btnDark, 'mt-4')}>
              <Plus className="h-4 w-4" /> Create Donation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-gva-hairline text-xs text-gva-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Invoice #</th>
                  <th className="px-3 py-2.5 font-semibold">Child</th>
                  <th className="px-3 py-2.5 font-semibold">Sponsor</th>
                  <th className="px-3 py-2.5 font-semibold">Period</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Net Donation</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Paid</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Balance</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gva-muted">No invoice matches this filter.</td>
                  </tr>
                ) : null}
                {rows.map((i) => (
                  <tr key={i.id} className="border-b border-gva-hairline/70 last:border-0 hover:bg-gva-canvas/60">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-gva-ink-2">{i.invoiceNo}</td>
                    <td className="px-3 py-2.5">
                      <Link to={`/organization/orphans/${i.orphanId}`} className="hover:underline">
                        <span className="mr-1.5 font-mono text-xs font-bold text-gva-muted">{i.childCode}</span>
                        <span className="font-medium text-gva-ink">{i.childName}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      {i.sponsorCode ? (
                        <button type="button" onClick={() => onSponsor(i.sponsorCode!)} className="text-left hover:underline">
                          <span className="block font-medium text-gva-ink">{i.sponsorName}</span>
                          <span className="block font-mono text-[11px] text-gva-muted">{i.sponsorCode}</span>
                        </button>
                      ) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gva-ink-2">{i.period}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{i.netPkr.toLocaleString('en-US')}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{i.paidPkr.toLocaleString('en-US')}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{i.balancePkr.toLocaleString('en-US')}</td>
                    <td className="px-3 py-2.5"><InvoicePill status={i.status} overdue={i.overdue} /></td>
                    <td className="px-3 py-2.5 text-xs text-gva-muted">{i.dueDate ? fmtDate(i.dueDate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={onPage} className="border-t border-gva-hairline px-4" />
          </div>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sponsor view
// ---------------------------------------------------------------------------

function SponsorView({
  ledger,
  childId,
  onShowAll,
  selected,
  setSelected,
  reload,
  flash,
  onError,
  onReceive,
  onReport,
}: {
  ledger: SponsorLedger;
  childId: string;
  onShowAll: () => void;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  reload: () => Promise<void>;
  flash: (m: string) => void;
  onError: (m: string | null) => void;
  onReceive: () => void;
  onReport: () => void;
}) {
  const [tab, setTab] = useState<'receivables' | 'history'>('receivables');
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const { sponsor: s } = ledger;
  const child = childId ? ledger.children.find((c) => c.id === childId) ?? null : null;
  const invoices = useMemo(
    () =>
      ledger.invoices
        .filter((i) => !child || i.orphanId === child.id)
        .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month) || a.childCode.localeCompare(b.childCode)),
    [ledger.invoices, child],
  );
  const history = useMemo(
    () => (child ? ledger.history.filter((h) => h.allocations.some((a) => a.childCode === child.code)) : ledger.history),
    [ledger.history, child],
  );
  const t = useMemo(() => {
    if (!child) return ledger.totals;
    return invoices.reduce(
      (acc, i) => ({ ...acc, netPkr: acc.netPkr + i.netPkr, paidPkr: acc.paidPkr + i.paidPkr, balancePkr: acc.balancePkr + i.balancePkr, discountPkr: acc.discountPkr + i.discountPkr }),
      { ...ledger.totals, netPkr: 0, paidPkr: 0, balancePkr: 0, discountPkr: 0 },
    );
  }, [child, invoices, ledger.totals]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  async function removeInvoice(i: Invoice) {
    if (!window.confirm(`Remove invoice ${i.invoiceNo} (${i.childCode} · ${i.period})? Payments already received stay recorded.`)) return;
    try {
      flash((await donationApi.deleteInvoice(i.id)).message);
      await reload();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  async function setReceipt(id: string, no: string, status: 'rejected' | 'verified') {
    if (status === 'rejected' && !window.confirm(`Reject receipt ${no}? It stays on record but no longer counts — the invoices it paid show as unpaid again.`)) return;
    try {
      flash((await donationApi.setReceiptStatus(id, status)).message);
      await reload();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard icon={Wallet} label="Total Net Donation" value={pkr(t.netPkr)} tone="slate" />
          <StatCard icon={TrendingUp} label="Total Paid" value={pkr(t.paidPkr)} tone="green" />
          <StatCard icon={TrendingDown} label="Balance Due" value={pkr(t.balancePkr)} tone="rose" />
          <StatCard icon={BadgePercent} label="Total Discount" value={pkr(t.discountPkr)} tone="amber" />
        </div>

        <section className="rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gva-hairline px-4">
            <div className="flex gap-5 text-sm font-semibold">
              {(['receivables', 'history'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={cn('-mb-px border-b-2 py-3', tab === k ? 'border-slate-900 text-gva-ink' : 'border-transparent text-gva-muted hover:text-gva-ink')}
                >
                  {k === 'receivables' ? 'Donation Receivables' : `Payment History (${history.length})`}
                </button>
              ))}
            </div>
            {tab === 'receivables' && selected.size ? (
              <button type="button" onClick={onReceive} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white">
                <Wallet className="h-3.5 w-3.5" /> Receive for {selected.size} selected
              </button>
            ) : null}
          </div>

          {tab === 'receivables' ? (
            invoices.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gva-muted">
                No invoices yet. Use <b>Create Donation</b> to raise this month's kafalat for {s.name}'s children.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-gva-hairline text-xs text-gva-muted">
                    <tr>
                      <th className="w-10 px-4 py-2.5" />
                      <th className="px-2 py-2.5 font-semibold">Invoice #</th>
                      <th className="px-2 py-2.5 font-semibold">Donation Type</th>
                      <th className="px-2 py-2.5 font-semibold">Period</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Net Donation</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Paid</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Balance</th>
                      <th className="px-2 py-2.5 font-semibold">Status</th>
                      <th className="px-2 py-2.5 font-semibold">Due Date</th>
                      <th className="px-2 py-2.5 font-semibold">Slip</th>
                      <th className="px-2 py-2.5 font-semibold">Note</th>
                      <th className="w-16 px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((i) => (
                      <tr key={i.id} className={cn('border-b border-gva-hairline/70 last:border-0', selected.has(i.id) && 'bg-sky-50/60')}>
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            disabled={i.balancePkr === 0}
                            checked={selected.has(i.id)}
                            onChange={() => toggle(i.id)}
                            className="h-4 w-4 accent-slate-900"
                            aria-label={`Select ${i.invoiceNo}`}
                          />
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs text-gva-ink-2">{i.invoiceNo}</td>
                        <td className="px-2 py-2.5">
                          <p className="font-medium text-gva-ink">Kafalat · {i.childCode}</p>
                          <p className="max-w-[180px] truncate text-xs text-gva-muted">{i.childName}</p>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-gva-ink-2">{i.period}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{i.netPkr.toLocaleString('en-US')}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-emerald-700">{i.paidPkr.toLocaleString('en-US')}</td>
                        <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{i.balancePkr.toLocaleString('en-US')}</td>
                        <td className="px-2 py-2.5"><InvoicePill status={i.status} overdue={i.overdue} /></td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-xs text-gva-muted">{i.dueDate ? fmtDate(i.dueDate) : '—'}</td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-xs">
                          {i.slips?.length
                            ? i.slips.map((u, n) => (
                                <a key={u} href={slipViewUrl(u)} target="_blank" rel="noreferrer" className="mr-1.5 font-semibold text-gva-green-deep hover:underline">
                                  Slip{i.slips.length > 1 ? ` ${n + 1}` : ''}
                                </a>
                              ))
                            : <span className="text-gva-muted">—</span>}
                        </td>
                        <td className="max-w-[140px] truncate px-2 py-2.5 text-xs text-gva-muted" title={i.note || ''}>{i.note || ''}</td>
                        <td className="px-2 py-2.5 text-right">
                          <button type="button" onClick={() => setEditing(i)} className="rounded p-1 text-gva-muted hover:bg-gva-canvas hover:text-gva-ink" aria-label="Edit invoice">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => void removeInvoice(i)} className="rounded p-1 text-gva-muted hover:bg-rose-50 hover:text-rose-600" aria-label="Delete invoice">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : history.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gva-muted">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-gva-hairline text-xs text-gva-muted">
                  <tr>
                    <th className="w-10 px-4 py-2.5" />
                    <th className="px-2 py-2.5 font-semibold">Receipt #</th>
                    <th className="px-2 py-2.5 font-semibold">Date received</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Amount</th>
                    <th className="px-2 py-2.5 font-semibold">Method</th>
                    <th className="px-2 py-2.5 font-semibold">Status</th>
                    <th className="px-2 py-2.5 font-semibold">Received By</th>
                    <th className="px-2 py-2.5 font-semibold">Account / Note</th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <HistoryRow key={h.id} h={h} open={open === h.id} onToggle={() => setOpen(open === h.id ? null : h.id)} onStatus={(st) => void setReceipt(h.id, h.receiptNo, st)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Sponsor card */}
      <aside className="space-y-4">
        {child ? (
          <section className="rounded-[var(--radius-card)] border border-sky-200 bg-sky-50/50 p-4">
            <div className="flex items-center gap-3">
              <ChildAvatar name={child.name} photoUrl={child.photoUrl} size="md" />
              <div className="min-w-0">
                <p className="font-mono text-xs font-bold text-gva-muted">{child.code}</p>
                <p className="truncate font-semibold text-gva-ink">{child.name}</p>
                {child.nameAr && child.nameAr !== child.name ? (
                  <p dir="rtl" className="truncate text-sm text-gva-ink-2">{child.nameAr}</p>
                ) : null}
              </div>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Monthly kafalat">{pkr(ledger.rules.monthlyPkr)}</Row>
              <Row label="Child dues">{pkr(t.balancePkr)}</Row>
            </dl>
            <div className="mt-3 flex gap-2">
              <Link to={`/organization/orphans/${child.id}`} className={cn(btn, 'h-8 flex-1 justify-center text-xs')}>Profile</Link>
              <button type="button" onClick={onShowAll} className={cn(btn, 'h-8 flex-1 justify-center text-xs')}>All of sponsor</button>
            </div>
          </section>
        ) : null}
        <section className="rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface p-4">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600">
              {s.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            </span>
            <p className="mt-2 font-display text-base font-bold uppercase text-gva-ink">{s.name}</p>
            <p className="text-xs text-gva-muted">{s.area || 'Sponsor'}</p>
          </div>
          <dl className="mt-4 space-y-1.5 text-sm">
            <Row label="Sponsor ID">{s.code}</Row>
            <Row label="Phone"><WhatsAppPhone phone={s.phone} className="justify-end" /></Row>
            <Row label="Children">{ledger.children.length}</Row>
            <Row label="Monthly kafalat">{pkr(s.monthlyPkr)}</Row>
            <Row label="Sponsor since">{s.addedOn ? fmtDate(s.addedOn) : '—'}</Row>
            <Row label="Status">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{s.status || 'Active'}</span>
            </Row>
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={onReport} className={cn(btn, 'h-9 justify-center px-2 text-xs')}>
              <Printer className="h-4 w-4" /> Print Invoice
            </button>
            <WhatsAppInvoiceButton ledger={ledger} onError={onError} />
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gva-ink">Children ({ledger.children.length})</h3>
            <button type="button" onClick={() => setLinking(true)} className="text-xs font-semibold text-gva-green-deep hover:underline">
              + Link orphan
            </button>
          </div>
          {ledger.children.length === 0 ? (
            <p className="text-sm text-gva-muted">No orphan linked yet.</p>
          ) : (
            <ul className="space-y-2">
              {ledger.children.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <ChildAvatar name={c.name} photoUrl={c.photoUrl} size="sm" />
                  <Link to={`/organization/orphans/${c.id}`} className="min-w-0 flex-1 hover:underline">
                    <span className="block font-mono text-xs font-bold text-gva-muted">{c.code}</span>
                    <span className="block truncate text-sm text-gva-ink">{c.name}</span>
                    {c.nameAr && c.nameAr !== c.name ? <span dir="rtl" className="block truncate text-xs text-gva-muted">{c.nameAr}</span> : null}
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`Unlink ${c.code} from ${s.name}?`)) return;
                      try {
                        flash((await donationApi.linkChildren(s.code, { remove: [c.code] })).message);
                        await reload();
                      } catch (e) {
                        onError((e as Error).message);
                      }
                    }}
                    className="rounded p-1 text-gva-muted hover:text-rose-600"
                    aria-label={`Unlink ${c.code}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      {editing ? (
        <EditInvoiceDialog
          invoice={editing}
          onClose={() => setEditing(null)}
          onDone={async (m) => {
            setEditing(null);
            flash(m);
            await reload();
          }}
        />
      ) : null}
      {linking ? (
        <LinkChildDialog
          sponsorCode={s.code}
          sponsorName={s.name}
          onClose={() => setLinking(false)}
          onDone={async (m) => {
            setLinking(false);
            flash(m);
            await reload();
          }}
        />
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gva-muted">{label}</dt>
      <dd className="text-right font-medium text-gva-ink">{children}</dd>
    </div>
  );
}

function HistoryRow({ h, open, onToggle, onStatus }: { h: SponsorLedger['history'][number]; open: boolean; onToggle: () => void; onStatus: (s: 'rejected' | 'verified') => void }) {
  const isReceipt = !h.id.startsWith('d');
  return (
    <>
      <tr className={cn('border-b border-gva-hairline/70', h.status === 'rejected' && 'opacity-50')}>
        <td className="px-4 py-2.5">
          <button type="button" onClick={onToggle} className="rounded p-0.5 text-gva-muted hover:text-gva-ink" aria-label="Show applied invoices">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs">{h.receiptNo}</td>
        <td className="px-2 py-2.5">
          <p className="font-medium text-gva-ink">{fmtDate(h.receivedAt)}</p>
          <p className="text-xs text-gva-muted">{fmtTime(h.receivedAt)}</p>
        </td>
        <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{h.amountPkr.toLocaleString('en-US')}</td>
        <td className="px-2 py-2.5 text-gva-ink-2">{METHOD_LABEL[h.method] || h.method}</td>
        <td className="px-2 py-2.5">
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', h.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700')}>
            {h.status === 'rejected' ? 'Rejected' : 'Completed'}
          </span>
        </td>
        <td className="px-2 py-2.5 text-gva-ink-2">{h.receivedBy || '—'}</td>
        <td className="max-w-[200px] px-2 py-2.5 text-xs text-gva-muted">
          <p className="truncate">{[h.bank, h.reference].filter(Boolean).join(' · ') || '—'}</p>
          {h.note ? <p className="truncate" title={h.note}>{h.note}</p> : null}
          {h.attachments.map((a, i) => (
            <a key={a} href={slipViewUrl(a)} target="_blank" rel="noreferrer" className="mr-2 font-semibold text-gva-green-deep hover:underline">Slip {i + 1}</a>
          ))}
        </td>
        <td className="px-2 py-2.5 text-right">
          {isReceipt ? (
            h.status === 'rejected' ? (
              <button type="button" onClick={() => onStatus('verified')} className="rounded px-1.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50" title="Count this receipt again">
                Restore
              </button>
            ) : (
              <button type="button" onClick={() => onStatus('rejected')} className="rounded p-1 text-gva-muted hover:bg-amber-50 hover:text-amber-700" aria-label="Reject receipt" title="Reject (wrong entry) — nothing is deleted">
                <XCircle className="h-4 w-4" />
              </button>
            )
          ) : null}
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-gva-hairline/70 bg-gva-canvas/50">
          <td />
          <td colSpan={8} className="px-2 py-2">
            <p className="mb-1 text-xs font-semibold text-gva-muted">Applied to</p>
            <table className="w-full text-xs">
              <thead className="text-gva-muted">
                <tr>
                  <th className="py-1 text-left font-semibold">Invoice #</th>
                  <th className="py-1 text-left font-semibold">Child</th>
                  <th className="py-1 text-left font-semibold">Period</th>
                  <th className="py-1 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {h.allocations.map((a, i) => (
                  <tr key={i}>
                    <td className="py-1 font-mono">{a.invoiceNo || '—'}</td>
                    <td className="py-1">{a.childCode} {a.childName ? `· ${a.childName}` : ''}</td>
                    <td className="py-1">{a.period}</td>
                    <td className="py-1 text-right tabular-nums">{a.amountPkr.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// WhatsApp invoice
// ---------------------------------------------------------------------------

export function whatsappInvoiceText(ledger: SponsorLedger, link: string) {
  const s = ledger.sponsor;
  const open = ledger.invoices.filter((i) => i.balancePkr > 0);
  const lines = open
    .slice(-12)
    .map((i) => `• ${i.childCode} – ${i.period}: PKR ${i.balancePkr.toLocaleString('en-US')}`)
    .join('\n');
  return [
    `Assalam-o-Alaikum ${s.name},`,
    '',
    open.length
      ? `Your kafalat invoice (${s.code}) — balance due PKR ${ledger.totals.balancePkr.toLocaleString('en-US')}:`
      : `JazakAllah khair — your kafalat account (${s.code}) is fully paid.`,
    lines,
    '',
    `View / print your invoice: ${link}`,
    '',
    'Gaza Virtual Adoption · Friends of Palestine',
  ]
    .filter((l, idx, arr) => !(l === '' && arr[idx - 1] === ''))
    .join('\n');
}

function WhatsAppInvoiceButton({ ledger, onError, label = 'WhatsApp' }: { ledger: SponsorLedger; onError: (m: string | null) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const wa = toWhatsApp(ledger.sponsor.phone);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        // Open the tab synchronously so the popup blocker allows it.
        const win = window.open('', '_blank');
        try {
          const token = ledger.sponsor.invoiceToken || (await donationApi.invoiceLink(ledger.sponsor.code)).token;
          const text = whatsappInvoiceText(ledger, invoiceUrl(token));
          const url = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
          if (win) win.location.href = url;
          else window.location.href = url;
        } catch (e) {
          win?.close();
          onError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      title={wa ? `Send invoice to +${wa}` : 'No valid WhatsApp number — choose the chat yourself'}
      className={cn(btn, 'h-9 justify-center border-[#25D366]/40 px-2 text-xs text-[#128C7E] hover:bg-[#25D366]/10')}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon className="h-4 w-4" />} {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

function Modal({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-[2px] md:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cn('w-full rounded-2xl bg-gva-surface p-5 shadow-2xl', wide ? 'max-w-2xl' : 'max-w-md')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gva-ink">{title}</h2>
            {subtitle ? <p className="text-xs text-gva-muted">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gva-muted hover:text-gva-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cn('block space-y-1 text-xs font-semibold text-gva-ink-2', className)}>{children}</label>;
}

function ReceiveDialog({
  ledger,
  selectedIds,
  onClose,
  onDone,
}: {
  ledger: SponsorLedger;
  selectedIds: string[];
  onClose: () => void;
  onDone: (msg: string) => void | Promise<void>;
}) {
  const open = ledger.invoices
    .filter((i) => i.balancePkr > 0)
    .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month) || a.childCode.localeCompare(b.childCode));
  const target = selectedIds.length ? open.filter((i) => selectedIds.includes(i.id)) : open;
  const due = target.reduce((s, i) => s + i.balancePkr, 0);
  const [amount, setAmount] = useState(String(due || ''));
  const [when, setWhen] = useState(nowLocalInput());
  const [method, setMethod] = useState('bank');
  const [bank, setBank] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [slip, setSlip] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const amt = Number(amount.replace(/[^\d]/g, '')) || 0;
  const preview = useMemo(() => {
    let left = amt;
    return target.map((i) => {
      const part = Math.min(left, i.balancePkr);
      left -= part;
      return { ...i, part };
    });
  }, [amt, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await donationApi.receive(ledger.sponsor.code, {
        amountPkr: amt,
        receivedAt: new Date(when).toISOString(),
        method,
        bank: bank || undefined,
        reference: reference || undefined,
        note: note || undefined,
        attachmentUrl: slip || undefined,
        invoiceIds: selectedIds.length ? selectedIds : undefined,
      });
      await onDone(res.message);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Receive Payment" subtitle={`${ledger.sponsor.name} · ${ledger.sponsor.code}`} onClose={onClose} wide>
      {open.length === 0 ? (
        <div className="space-y-3 text-sm">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">Nothing is due for this sponsor. Create this month's donation invoice first, then receive the payment.</p>
          <button type="button" className={btn} onClick={onClose}>Close</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Label>
              Amount received (PKR)
              <input autoFocus inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} required />
              <span className="font-normal text-gva-muted">Due on {selectedIds.length ? 'selected' : 'all open'} invoices: {pkr(due)}</span>
            </Label>
            <Label>
              Date money was received
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={field} required />
            </Label>
            <Label>
              Method
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={field}>
                <option value="bank">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="other">Other</option>
              </select>
            </Label>
            <Label>
              Bank / account
              <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. Meezan, Al Baraka" className={field} />
            </Label>
            <Label>
              Reference / transaction no.
              <input value={reference} onChange={(e) => setReference(e.target.value)} className={field} />
            </Label>
            <Label>
              Slip link (optional)
              <input value={slip} onChange={(e) => setSlip(e.target.value)} placeholder="https://drive.google.com/…" className={field} />
            </Label>
            <Label className="sm:col-span-2">
              Note
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={cn(field, 'h-auto py-2')} placeholder="e.g. Paid for November and December" />
            </Label>
          </div>

          <div className="rounded-xl border border-gva-hairline">
            <p className="border-b border-gva-hairline px-3 py-2 text-xs font-semibold text-gva-muted">Will be applied to (oldest first)</p>
            <ul className="max-h-48 divide-y divide-gva-hairline/70 overflow-y-auto text-sm">
              {preview.map((i) => (
                <li key={i.id} className={cn('flex items-center justify-between gap-3 px-3 py-1.5', !i.part && 'opacity-40')}>
                  <span>
                    <span className="font-mono text-xs font-bold">{i.childCode}</span> · {i.period}
                    <span className="ml-2 text-xs text-gva-muted">due {i.balancePkr.toLocaleString('en-US')}</span>
                  </span>
                  <span className={cn('font-semibold tabular-nums', i.part === i.balancePkr ? 'text-emerald-700' : i.part ? 'text-amber-700' : '')}>
                    {i.part.toLocaleString('en-US')}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {amt > due ? <p className="text-sm text-rose-700">Amount is more than the dues ({pkr(due)}). Create the next month's donation invoice first, or reduce the amount.</p> : null}
          {err ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" className={btn} onClick={onClose}>Cancel</button>
            <button type="submit" className={btnDark} disabled={busy || amt <= 0 || amt > due}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />} Receive {amt ? pkr(amt) : ''}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function CreateFeeDialog({
  ledger,
  defaultYear,
  defaultMonth,
  onClose,
  onDone,
}: {
  ledger: SponsorLedger | null;
  defaultYear: number;
  defaultMonth: number;
  onClose: () => void;
  onDone: (msg: string) => void | Promise<void>;
}) {
  const [scope, setScope] = useState<'all' | 'sponsor' | 'child'>(ledger ? 'sponsor' : 'all');
  const [year, setYear] = useState(defaultYear);
  const [fromMonth, setFromMonth] = useState(defaultMonth);
  const [toMonth, setToMonth] = useState(defaultMonth);
  const [childId, setChildId] = useState(ledger?.children[0]?.id || '');
  const [amount, setAmount] = useState(String(ledger?.rules.monthlyPkr || 30000));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const now = new Date();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const msgs: string[] = [];
      for (let m = Math.min(fromMonth, toMonth); m <= Math.max(fromMonth, toMonth); m += 1) {
        const res = await donationApi.createInvoices({
          year,
          month: m,
          sponsorCode: scope !== 'all' ? ledger?.sponsor.code : undefined,
          orphanIds: scope === 'child' && childId ? [childId] : undefined,
          amountPkr: Number(amount) || undefined,
          note: note || undefined,
        });
        msgs.push(res.message);
      }
      await onDone(msgs.join(' · '));
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Create Donation" subtitle="Raise kafalat invoices — they start as unpaid" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <fieldset className="space-y-1.5 text-sm">
          <legend className="mb-1 text-xs font-semibold text-gva-ink-2">For</legend>
          <label className="flex items-center gap-2">
            <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} className="accent-slate-900" />
            All sponsored orphans (bulk)
          </label>
          <label className={cn('flex items-center gap-2', !ledger && 'opacity-40')}>
            <input type="radio" disabled={!ledger} checked={scope === 'sponsor'} onChange={() => setScope('sponsor')} className="accent-slate-900" />
            {ledger ? `All children of ${ledger.sponsor.name} (${ledger.children.length})` : 'One sponsor — search a sponsor first'}
          </label>
          <label className={cn('flex items-center gap-2', !ledger?.children.length && 'opacity-40')}>
            <input type="radio" disabled={!ledger?.children.length} checked={scope === 'child'} onChange={() => setScope('child')} className="accent-slate-900" />
            One child
          </label>
          {scope === 'child' && ledger ? (
            <select value={childId} onChange={(e) => setChildId(e.target.value)} className={field}>
              {ledger.children.map((c) => (
                <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
              ))}
            </select>
          ) : null}
        </fieldset>
        <div className="grid grid-cols-3 gap-2">
          <Label>
            From
            <select value={fromMonth} onChange={(e) => setFromMonth(Number(e.target.value))} className={field}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m.slice(0, 3)}</option>)}
            </select>
          </Label>
          <Label>
            To
            <select value={toMonth} onChange={(e) => setToMonth(Number(e.target.value))} className={field}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m.slice(0, 3)}</option>)}
            </select>
          </Label>
          <Label>
            Year
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={field}>
              {[now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Label>
        </div>
        <Label>
          Amount per child per month (PKR)
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} className={field} />
        </Label>
        <Label>
          Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} className={field} />
        </Label>
        <p className="text-xs text-gva-muted">
          Children that already have an invoice for a month are skipped. Payments already received for that month (imported
          history, online form) mark the new invoice paid straight away.
        </p>
        {err ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={btn} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnDark} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Donation
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditInvoiceDialog({ invoice, onClose, onDone }: { invoice: Invoice; onClose: () => void; onDone: (m: string) => void | Promise<void> }) {
  const [amount, setAmount] = useState(String(invoice.amountPkr));
  const [discount, setDiscount] = useState(String(invoice.discountPkr));
  const [due, setDue] = useState(invoice.dueDate || '');
  const [note, setNote] = useState(invoice.note || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal title={`Edit ${invoice.invoiceNo}`} subtitle={`${invoice.childCode} · ${invoice.period}`} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            const r = await donationApi.updateInvoice(invoice.id, { amountPkr: Number(amount), discountPkr: Number(discount) || 0, dueDate: due || undefined, note });
            await onDone(r.message);
          } catch (e2) {
            setErr((e2 as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Label>Amount<input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} className={field} /></Label>
          <Label>Discount<input inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^\d]/g, ''))} className={field} /></Label>
        </div>
        <Label>Due date<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} /></Label>
        <Label>Note<input value={note} onChange={(e) => setNote(e.target.value)} className={field} /></Label>
        {err ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={btn} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnDark} disabled={busy}>Save</button>
        </div>
      </form>
    </Modal>
  );
}

function LinkChildDialog({ sponsorCode, sponsorName, onClose, onDone }: { sponsorCode: string; sponsorName: string; onClose: () => void; onDone: (m: string) => void | Promise<void> }) {
  const [codes, setCodes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal title="Link orphan to sponsor" subtitle={`${sponsorName} · ${sponsorCode}`} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            const list = codes.split(/[\s,]+/).map((c) => c.trim()).filter(Boolean);
            const r = await donationApi.linkChildren(sponsorCode, { add: list });
            await onDone(r.message);
          } catch (e2) {
            setErr((e2 as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Label>
          Orphan code(s)
          <input autoFocus value={codes} onChange={(e) => setCodes(e.target.value)} placeholder="OR015, OR023" className={field} required />
          <span className="font-normal text-gva-muted">If the orphan has another sponsor, it moves to {sponsorName}.</span>
        </Label>
        {err ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={btn} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnDark} disabled={busy}>Link</button>
        </div>
      </form>
    </Modal>
  );
}

export function SponsorDialog({ onClose, onDone }: { onClose: () => void; onDone: (code: string, m: string) => void }) {
  const [form, setForm] = useState({ name: '', code: '', phone: '', email: '', area: '', reference: '', addedOn: new Date().toISOString().slice(0, 10), childCodes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Modal title="Add sponsor" subtitle="Donor who pays kafalat for one or more orphans" onClose={onClose} wide>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            const r = await donationApi.createSponsor({
              name: form.name,
              code: form.code || undefined,
              phone: form.phone || undefined,
              email: form.email || undefined,
              area: form.area || undefined,
              reference: form.reference || undefined,
              addedOn: form.addedOn || undefined,
              childCodes: form.childCodes.split(/[\s,]+/).map((c) => c.trim()).filter(Boolean),
            });
            onDone(r.code, r.message);
          } catch (e2) {
            setErr((e2 as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Label>Full name *<input autoFocus value={form.name} onChange={set('name')} className={field} required /></Label>
          <Label>Sponsor code<input value={form.code} onChange={set('code')} placeholder="Leave empty → next SP number" className={field} /></Label>
          <Label>WhatsApp / phone<input value={form.phone} onChange={set('phone')} placeholder="0300 1234567" className={field} /></Label>
          <Label>Email<input type="email" value={form.email} onChange={set('email')} className={field} /></Label>
          <Label>Area / city<input value={form.area} onChange={set('area')} className={field} /></Label>
          <Label>Reference<input value={form.reference} onChange={set('reference')} className={field} /></Label>
          <Label>Sponsor since<input type="date" value={form.addedOn} onChange={set('addedOn')} className={field} /></Label>
          <Label>Orphan code(s) to link<input value={form.childCodes} onChange={set('childCodes')} placeholder="OR015, OR023" className={field} /></Label>
        </div>
        {err ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={btn} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnDark} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Save sponsor
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Report overlay (print / CSV / WhatsApp)
// ---------------------------------------------------------------------------

export function ledgerToStatement(l: SponsorLedger): StatementData {
  return {
    sponsor: { code: l.sponsor.code, name: l.sponsor.name, area: l.sponsor.area, phone: l.sponsor.phone, addedOn: l.sponsor.addedOn },
    children: l.children.map((c) => ({ code: c.code, name: c.name })),
    totals: l.totals,
    invoices: l.invoices,
    ledger: l.ledger,
    monthlyPkr: l.rules.monthlyPkr,
  };
}

/** Edspire "Donation Reports": choose report type, then Generate Report. */
function ReportsDialog({
  ledger,
  defaultChild,
  onClose,
  onGenerate,
}: {
  ledger: SponsorLedger;
  defaultChild: string;
  onClose: () => void;
  onGenerate: (childId: string) => void;
}) {
  const [type, setType] = useState<'sponsor' | 'child'>(defaultChild ? 'child' : 'sponsor');
  const [child, setChild] = useState(defaultChild || ledger.children[0]?.id || '');
  return (
    <Modal title="Donation Reports" subtitle="Select report type and filters" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onGenerate(type === 'child' ? child : '');
        }}
      >
        <Label>
          Report Type
          <select value={type} onChange={(e) => setType(e.target.value as 'sponsor' | 'child')} className={field}>
            <option value="sponsor">Sponsor Ledger (all children)</option>
            <option value="child" disabled={!ledger.children.length}>Child Ledger</option>
          </select>
        </Label>
        {type === 'child' ? (
          <Label>
            Child
            <select value={child} onChange={(e) => setChild(e.target.value)} className={field}>
              {ledger.children.map((c) => (
                <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
              ))}
            </select>
          </Label>
        ) : (
          <Label>
            Sponsor
            <input readOnly value={`${ledger.sponsor.name} (${ledger.sponsor.code})`} className={cn(field, 'bg-gva-canvas')} />
          </Label>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className={btn} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnDark}>Generate Report</button>
        </div>
      </form>
    </Modal>
  );
}

function ReportOverlay({ ledger, childId, onClose }: { ledger: SponsorLedger; childId?: string; onClose: () => void }) {
  const child = childId ? ledger.children.find((c) => c.id === childId) ?? null : null;
  const base = ledgerToStatement(ledger);
  const data: StatementData = child
    ? {
        ...base,
        child: { code: child.code, name: child.name, nameAr: child.nameAr },
        sponsorChildCount: ledger.children.length,
        children: [{ code: child.code, name: child.name }],
        invoices: ledger.invoices.filter((i) => i.orphanId === child.id),
        ledger: undefined,
      }
    : base;
  const title = child ? `Child Ledger · ${child.code} ${child.name}` : `Sponsor Ledger · ${ledger.sponsor.name}`;
  const fileBase = child ? `${child.code}-ledger` : `${ledger.sponsor.code}-ledger`;
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('printing-report');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('printing-report');
    };
  }, [onClose]);
  return createPortal(
    <div className="print-report fixed inset-0 z-[100] overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 print:hidden">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => window.print()} className={cn(btn, 'h-9')}>
            <Printer className="h-4 w-4" /> Print
          </button>
          <button type="button" onClick={() => downloadText(`${fileBase}.xls`, statementXls(data), 'application/vnd.ms-excel')} className={cn(btn, 'h-9')}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
          <button type="button" onClick={() => downloadText(`${fileBase}.csv`, statementCsv(data))} className={cn(btn, 'h-9')}>
            <FileText className="h-4 w-4" /> CSV
          </button>
          <WhatsAppInvoiceButton ledger={ledger} onError={setErr} label="Send via WhatsApp" />
          <button type="button" onClick={onClose} className="rounded p-2 text-slate-500 hover:text-slate-900" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      {err ? <p className="mx-auto mt-3 max-w-[960px] rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 print:hidden">{err}</p> : null}
      <SponsorStatement data={data} />
    </div>,
    document.body,
  );
}

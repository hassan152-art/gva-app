import { AlertTriangle, ChevronRight, Download, Eye, FileUp, Link2, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChildAvatar, MiniStat, Panel, StateBadge } from '@/components/kafalat/KafalatBits';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import {
  MONTHS,
  assignKafalatDonation,
  downloadCsv,
  getUnmatchedDonations,
  fmtDate,
  getKafalatReport,
  importKafalatCsv,
  pkr,
  usd,
  type KafalatReport,
  type MonthState,
  type UnmatchedDonation,
} from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';
import { WhatsAppButton, WhatsAppPhone } from '@/components/WhatsAppPhone';

type Filter = 'all' | 'paid' | 'partial' | 'pending' | 'not_due' | 'unsponsored';

const PAGE = 50;

export function KafalatReportPage() {
  useMobilePageChrome({ title: 'Kafalat report', backTo: '/' });
  const now = new Date();
  const [params] = useSearchParams();
  const [year, setYear] = useState(() => Number(params.get('year')) || now.getFullYear());
  const [month, setMonth] = useState(() => {
    const m = Number(params.get('month'));
    return m >= 1 && m <= 12 ? m : now.getMonth() + 1;
  });
  const [data, setData] = useState<KafalatReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await getKafalatReport(year, month));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load report');
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => setShown(PAGE), [filter, q, year, month]);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.rows.filter((r) => {
      const st: MonthState = r.state === 'upcoming' ? 'pending' : r.state;
      if (filter !== 'all' && st !== filter) return false;
      if (!needle) return true;
      return [r.code, r.nameEn, r.nameAr, r.sponsorName, r.sponsorPhone, r.listName, ...r.donors]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [data, filter, q]);

  function exportCsv() {
    if (!data) return;
    downloadCsv(`kafalat-report-${data.year}-${String(data.month).padStart(2, '0')}.csv`, [
      ['Code', 'Child', 'List', 'Organization', 'Sponsor', 'Sponsor phone', 'Status', 'Received PKR', 'Approx USD', 'Donations', 'Donors', 'Last donation'],
      ...rows.map((r) => [
        r.code,
        r.nameEn || r.nameAr,
        r.listName,
        r.organization,
        r.sponsorName,
        r.sponsorPhone,
        r.state,
        r.paidPkr,
        r.paidUsd,
        r.donations,
        r.donors.join(' / '),
        r.lastDonationAt ? fmtDate(r.lastDonationAt) : '',
      ]),
    ]);
  }

  const t = data?.totals;
  const due = t ? t.sponsored - t.notDue : 0;
  const pct = t && due > 0 ? Math.round(((t.paid + t.partial) / due) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-gva-ink md:text-2xl">Kafalat report</h1>
          <p className="mt-1 text-sm text-gva-muted">
            Who has paid and who is pending, per child, for the selected month.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-10 rounded-lg border border-gva-hairline bg-gva-surface px-3 text-sm font-semibold"
            aria-label="Month"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-10 rounded-lg border border-gva-hairline bg-gva-surface px-3 text-sm font-semibold"
            aria-label="Year"
          >
            {[now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gva-hairline bg-gva-surface px-3.5 text-sm font-semibold hover:bg-gva-canvas"
          >
            <Download className="h-4 w-4" aria-hidden /> CSV
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      {!t ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <section className="rounded-[var(--radius-card)] border border-gva-hairline bg-gradient-to-br from-gva-green-deep to-gva-green p-5 text-white shadow-sm">
            <p className="text-sm font-semibold text-white/80">
              {data!.monthLabel} {data!.year}
            </p>
            <p className="mt-1 font-display text-3xl font-bold md:text-4xl">
              {t.paid + t.partial} <span className="text-white/70">of</span> {due}
              <span className="ml-2 text-base font-semibold text-white/80">children have received payment</span>
            </p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm text-white/85">
              {pct}% · {pkr(t.receivedPkr)} received (≈ {usd(t.receivedUsd)}) of {pkr(due * data!.rules.monthlyPkr)} expected
            </p>
          </section>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <FilterStat active={filter === 'all'} onClick={() => setFilter('all')} label="All children" value={t.children} />
            <FilterStat active={filter === 'paid'} onClick={() => setFilter('paid')} label="Paid" value={t.paid} tone="green" />
            <FilterStat active={filter === 'partial'} onClick={() => setFilter('partial')} label="Partial" value={t.partial} tone="amber" />
            <FilterStat active={filter === 'pending'} onClick={() => setFilter('pending')} label="Pending" value={t.pending} tone="rose" />
            <FilterStat active={filter === 'not_due'} onClick={() => setFilter('not_due')} label="Not due yet" value={t.notDue} />
            <FilterStat active={filter === 'unsponsored'} onClick={() => setFilter('unsponsored')} label="No sponsor" value={t.unsponsored} tone="sky" />
          </div>
        </>
      )}

      <Panel
        title={`Children (${rows.length})`}
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gva-muted" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Code, child, sponsor, donor…"
              className="h-9 w-48 rounded-lg border border-gva-hairline bg-gva-surface pl-8 pr-3 text-sm sm:w-64"
            />
          </div>
        }
      >
        {!data ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gva-muted">No children match.</p>
        ) : (
          <>
            <ul className="divide-y divide-gva-hairline">
              {rows.slice(0, shown).map((r) => (
                <li key={r.id} className="flex items-center gap-1">
                  <Link
                    to={`/organization/orphans/${r.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-3 hover:bg-gva-canvas md:px-2"
                  >
                    <ChildAvatar name={r.nameEn || r.nameAr || r.code || '?'} photoUrl={r.photoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gva-ink">
                        <span className="mr-2 font-mono text-xs text-gva-muted">{r.code}</span>
                        {r.nameEn || r.nameAr || '—'}
                      </p>
                      <p className="truncate text-xs text-gva-muted">
                        Sponsor: {r.sponsorName || '—'}
                        {r.donors.length ? ` · Paid by ${r.donors.join(', ')}` : ''}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-bold tabular-nums text-gva-ink">{r.paidPkr ? pkr(r.paidPkr) : '—'}</p>
                      <p className="text-[11px] text-gva-muted">
                        {r.lastDonationAt ? fmtDate(r.lastDonationAt) : 'No payment'}
                      </p>
                    </div>
                    <StateBadge state={r.state === 'upcoming' ? 'pending' : r.state} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-gva-muted-2" aria-hidden />
                  </Link>
                  <span className="w-7 text-center">
                    <WhatsAppButton phone={r.sponsorPhone} />
                  </span>
                </li>
              ))}
            </ul>
            {rows.length > shown ? (
              <button
                type="button"
                onClick={() => setShown((s) => s + PAGE * 2)}
                className="mt-3 h-10 w-full rounded-lg border border-gva-hairline text-sm font-semibold text-gva-ink-2 hover:bg-gva-canvas"
              >
                Show more ({rows.length - shown} left)
              </button>
            ) : null}
          </>
        )}
      </Panel>

      <UnmatchedPanel onChange={load} />

      <ImportPanel onDone={load} />
    </div>
  );
}

function UnmatchedPanel({ onChange }: { onChange: () => void | Promise<void> }) {
  const [items, setItems] = useState<UnmatchedDonation[] | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await getUnmatchedDonations()).donations);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function assign(d: UnmatchedDonation) {
    const code = (codes[d.id] || '').trim();
    if (!code) return;
    try {
      const res = await assignKafalatDonation(d.id, code);
      setMsg(`${d.sponsorName}: ${res.message}`);
      await load();
      await onChange();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not link');
    }
  }

  if (!items || items.length === 0) return null;
  const shown = open ? items : items.slice(0, 5);

  return (
    <Panel
      title={`Submissions not matched to a child (${items.length})`}
      icon={AlertTriangle}
      action={
        items.length > 5 ? (
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-sm font-semibold text-gva-green-deep hover:underline">
            {open ? 'Show less' : 'Show all'}
          </button>
        ) : null
      }
    >
      <p className="mb-3 text-xs text-gva-muted">
        The orphan code typed on the form could not be read (e.g. “List 21”, “test”, “Dont know”). Type the right
        child code and press Link — the payment then appears on that child’s profile.
      </p>
      {msg ? <p className="mb-2 text-sm font-medium text-gva-ink">{msg}</p> : null}
      <ul className="divide-y divide-gva-hairline">
        {shown.map((d) => (
          <li key={d.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gva-ink">
                {d.sponsorName}{' '}
                <span className="font-normal text-gva-muted">· </span>
                <WhatsAppPhone phone={d.sponsorPhone} empty="no phone" className="text-xs font-normal text-gva-muted" />
              </p>
              <p className="truncate text-xs text-gva-muted" title={d.rawCode ?? ''}>
                Typed code: <b className="text-amber-800">{d.rawCode || '—'}</b>
                {d.orphanName ? ` · ${d.orphanName}` : ''} · {d.monthLabels.join(', ')} {d.year} ·{' '}
                {fmtDate(d.submittedAt)}
              </p>
              {d.note ? <p className="truncate text-xs text-gva-muted" title={d.note}>{d.note}</p> : null}
            </div>
            <p className="text-sm font-bold tabular-nums">{pkr(d.amountPkr)}</p>
            <div className="flex gap-2">
              <input
                value={codes[d.id] ?? ''}
                onChange={(e) => setCodes((c) => ({ ...c, [d.id]: e.target.value.toUpperCase() }))}
                placeholder="OR123"
                className="h-9 w-24 rounded-lg border border-gva-hairline px-2 font-mono text-sm"
                aria-label="Child code"
              />
              <button
                type="button"
                onClick={() => assign(d)}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-gva-green px-3 text-sm font-semibold text-white hover:bg-gva-green-deep"
              >
                <Link2 className="h-4 w-4" aria-hidden /> Link
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function FilterStat({
  label,
  value,
  tone = 'default',
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: 'default' | 'green' | 'amber' | 'rose' | 'sky';
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('rounded-2xl text-left transition', active ? 'ring-2 ring-gva-green ring-offset-2' : 'hover:-translate-y-0.5')}
      aria-pressed={active}
    >
      <MiniStat label={label} value={value} tone={tone} />
    </button>
  );
}

function ImportPanel({ onDone }: { onDone: () => void | Promise<void> }) {
  const [type, setType] = useState<'donations' | 'orphans' | 'sponsors'>('donations');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setBusy(true);
    setResult(null);
    setProblems([]);
    try {
      if (!/\.(csv|txt)$/i.test(file.name)) {
        throw new Error('Please save the Excel export as CSV (File → Save As → CSV UTF-8) and upload that.');
      }
      const res = await importKafalatCsv(type, await file.text());
      const parts = [
        `${res.rows} rows read`,
        res.imported != null ? `${res.imported} imported` : null,
        res.created != null ? `${res.created} new` : null,
        res.updated != null ? `${res.updated} updated` : null,
        res.duplicates ? `${res.duplicates} already present` : null,
        res.skipped ? `${res.skipped} skipped` : null,
      ].filter(Boolean);
      setResult(parts.join(' · '));
      setProblems(res.problems ?? []);
      await onDone();
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <Panel title="Import from back-office export" icon={FileUp}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="h-10 rounded-lg border border-gva-hairline bg-gva-surface px-3 text-sm font-semibold"
        >
          <option value="donations">Kafalat submissions (donations)</option>
          <option value="orphans">Orphans export</option>
          <option value="sponsors">Sponsors export</option>
        </select>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="text-sm file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-gva-tint file:px-4 file:font-semibold file:text-gva-green-deep"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
        {busy ? <span className="text-sm text-gva-muted">Importing…</span> : null}
      </div>
      <p className="mt-2 text-xs text-gva-muted">
        Open the .xls export in Excel → Save As → <b>CSV UTF-8</b>, then upload. Donation columns understood:
        Orphan Code, Sponsor Name, Sponsor Phone, Months (e.g. “October, November”), Year, Amount / Payment,
        Date (date + time), ID, Attachment, Note, Status. Re-importing the same file skips rows with the same ID.
      </p>
      {result ? <p className="mt-3 text-sm font-medium text-gva-ink">{result}</p> : null}
      {problems.length ? (
        <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-xs text-amber-800">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 flex items-center gap-1 text-xs text-gva-muted">
        <Eye className="h-3.5 w-3.5" aria-hidden /> Tap any child above to open their full profile and donation history.
      </p>
    </Panel>
  );
}

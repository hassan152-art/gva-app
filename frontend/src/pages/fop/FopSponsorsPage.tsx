import { ChevronRight, Download, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChildAvatar, MiniStat, Panel } from '@/components/kafalat/KafalatBits';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import { fopApi, type FopSponsorList } from '@/lib/fopApi';
import { downloadCsv, fmtDate, pkr } from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';
import { WhatsAppButton } from '@/components/WhatsAppPhone';

type Filter = 'all' | 'pending' | 'paid' | 'none';
const PAGE = 60;

export function FopSponsorsPage() {
  useMobilePageChrome({ title: 'Sponsors', backTo: '/' });
  const [data, setData] = useState<FopSponsorList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    fopApi.sponsors().then(setData).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => setShown(PAGE), [q, filter]);

  const rows = useMemo(() => {
    if (!data) return [];
    const n = q.trim().toLowerCase();
    return data.sponsors.filter((s) => {
      if (filter === 'pending' && !(s.children > s.paidChildrenThisMonth)) return false;
      if (filter === 'paid' && !(s.children > 0 && s.paidChildrenThisMonth >= s.children)) return false;
      if (filter === 'none' && s.children > 0) return false;
      if (!n) return true;
      return [s.code, s.name, s.phone, s.email, s.area, ...s.childCodes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(n));
    });
  }, [data, q, filter]);

  function exportCsv() {
    downloadCsv('sponsors.csv', [
      ['Code', 'Name', 'Phone', 'Email', 'Area', 'Children', 'Child codes', `Paid ${data?.monthLabel ?? ''}`, 'Total received PKR', 'Last donation', 'Added on'],
      ...rows.map((s) => [
        s.code, s.name, s.phone, s.email, s.area, s.children, s.childCodes.join(' '),
        s.paidChildrenThisMonth, s.totalPkr, s.lastDonationAt ? fmtDate(s.lastDonationAt) : '', s.addedOn ? fmtDate(s.addedOn) : '',
      ]),
    ]);
  }

  const t = data?.totals;
  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-gva-ink md:text-2xl">Sponsors</h1>
          <p className="mt-1 text-sm text-gva-muted">Every sponsor, their children and whether this month is paid.</p>
        </div>
        <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gva-hairline bg-gva-surface px-3.5 text-sm font-semibold hover:bg-gva-canvas">
          <Download className="h-4 w-4" aria-hidden /> CSV
        </button>
      </div>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      {!t ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FilterTile active={filter === 'all'} onClick={() => setFilter('all')}><MiniStat label="Total sponsors" value={t.sponsors} sub={`${t.children} children sponsored`} /></FilterTile>
          <FilterTile active={filter === 'paid'} onClick={() => setFilter('paid')}><MiniStat label={`Fully paid · ${data!.monthLabel}`} value={t.fullyPaid} tone="green" /></FilterTile>
          <FilterTile active={filter === 'pending'} onClick={() => setFilter('pending')}><MiniStat label={`Pending · ${data!.monthLabel}`} value={t.pending} tone="rose" sub="at least one child unpaid" /></FilterTile>
          <FilterTile active={filter === 'none'} onClick={() => setFilter('none')}><MiniStat label="No child linked" value={data!.sponsors.filter((s) => s.children === 0).length} tone="sky" /></FilterTile>
        </div>
      )}

      <Panel
        title={`Sponsors (${rows.length})`}
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gva-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, code, phone, child code…" className="h-9 w-48 rounded-lg border border-gva-hairline bg-gva-surface pl-8 pr-3 text-sm sm:w-72" />
          </div>
        }
      >
        {!data ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <>
            <ul className="divide-y divide-gva-hairline">
              {rows.slice(0, shown).map((s) => {
                const all = s.children > 0 && s.paidChildrenThisMonth >= s.children;
                return (
                  <li key={s.code} className="flex items-center gap-2">
                    <Link to={`/fop/sponsors/${encodeURIComponent(s.code)}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-3 hover:bg-gva-canvas md:px-2">
                      <ChildAvatar name={s.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gva-ink">
                          <span className="mr-2 font-mono text-xs text-gva-muted">{s.code}</span>
                          {s.name}
                        </p>
                        <p className="truncate text-xs text-gva-muted">
                          {s.phone || 'No phone'}{s.area ? ` · ${s.area}` : ''}
                          {s.childCodes.length ? ` · ${s.childCodes.join(', ')}` : ''}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-bold tabular-nums">{s.totalPkr ? pkr(s.totalPkr) : '—'}</p>
                        <p className="text-[11px] text-gva-muted">{s.lastDonationAt ? `last ${fmtDate(s.lastDonationAt)}` : 'No donation yet'}</p>
                      </div>
                      {s.children > 0 ? (
                        <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', all ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                          {s.paidChildrenThisMonth}/{s.children} paid
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">No child</span>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-gva-muted-2" aria-hidden />
                    </Link>
                    <span className="w-8 text-center">
                      <WhatsAppButton phone={s.phone} />
                    </span>
                  </li>
                );
              })}
            </ul>
            {rows.length > shown ? (
              <button type="button" onClick={() => setShown((n) => n + PAGE * 2)} className="mt-3 h-10 w-full rounded-lg border border-gva-hairline text-sm font-semibold text-gva-ink-2 hover:bg-gva-canvas">
                Show more ({rows.length - shown} left)
              </button>
            ) : null}
          </>
        )}
      </Panel>
    </div>
  );
}

export function FilterTile({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn('rounded-2xl text-left transition', active ? 'ring-2 ring-gva-green ring-offset-2' : 'hover:-translate-y-0.5')}>
      {children}
    </button>
  );
}

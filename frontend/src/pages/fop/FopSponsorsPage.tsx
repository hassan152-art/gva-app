import { ChevronRight, Download, Search, UserPlus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SponsorDialog } from '@/pages/fop/DonationCollectionPage';
import { ChildAvatar, MiniStat, Panel } from '@/components/kafalat/KafalatBits';
import { Skeleton } from '@/components/ui/skeleton';
import { Pager } from '@/components/ui/pager';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import { fopApi, type FopSponsorList } from '@/lib/fopApi';
import { downloadCsv, fmtDate } from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';
import { WhatsAppButton } from '@/components/WhatsAppPhone';

type Filter = 'all' | 'pending' | 'paid' | 'none';
const PAGE_SIZE = 50;

export function FopSponsorsPage() {
  useMobilePageChrome({ title: 'Sponsors', backTo: '/' });
  const [data, setData] = useState<FopSponsorList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [qDebounced, setQDebounced] = useState('');
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);
  useEffect(() => setPage(1), [qDebounced, filter]);
  useEffect(() => {
    fopApi.sponsors(qDebounced, filter, page, PAGE_SIZE).then(setData).catch((e: Error) => setError(e.message));
  }, [qDebounced, filter, page]);

  const rows = data?.sponsors ?? [];

  async function exportCsv() {
    const all = (await fopApi.sponsors(qDebounced, filter, 1, 1000)).sponsors;
    downloadCsv('sponsors.csv', [
      ['S.No', 'Sponsor ID', 'Code', 'Name', 'Phone', 'Email', 'Area', 'Organization', 'Reference', 'Status', 'Total orphans', 'Child codes', `Paid ${data?.monthLabel ?? ''}`, 'Total received PKR', 'Last donation', 'Added on'],
      ...all.map((s, i) => [
        i + 1, s.sponsorId ?? '', s.code, s.name, s.phone, s.email, s.area, s.organization ?? '', s.reference ?? '', s.status ?? '', s.children, s.childCodes.join(' '),
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
        <div className="flex gap-2">
          <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gva-hairline bg-gva-surface px-3.5 text-sm font-semibold hover:bg-gva-canvas">
            <Download className="h-4 w-4" aria-hidden /> CSV
          </button>
          <button type="button" onClick={() => setAdding(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gva-green px-4 text-sm font-semibold text-white hover:bg-gva-green-deep">
            <UserPlus className="h-4 w-4" aria-hidden /> Add sponsor
          </button>
        </div>
      </div>
      {adding ? (
        <SponsorDialog
          onClose={() => setAdding(false)}
          onDone={(code) => navigate(`/fop/donation-collection?sponsor=${encodeURIComponent(code)}`)}
        />
      ) : null}
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      {!t ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FilterTile active={filter === 'all'} onClick={() => setFilter('all')}><MiniStat label="Total sponsors" value={t.sponsors} sub={`${t.children} children sponsored`} /></FilterTile>
          <FilterTile active={filter === 'paid'} onClick={() => setFilter('paid')}><MiniStat label={`Fully paid · ${data!.monthLabel}`} value={t.fullyPaid} tone="green" /></FilterTile>
          <FilterTile active={filter === 'pending'} onClick={() => setFilter('pending')}><MiniStat label={`Pending · ${data!.monthLabel}`} value={t.pending} tone="rose" sub="at least one child unpaid" /></FilterTile>
          <FilterTile active={filter === 'none'} onClick={() => setFilter('none')}><MiniStat label="No child linked" value={t.noChild} tone="sky" /></FilterTile>
        </div>
      )}

      <Panel
        title={`Sponsors (${data?.total ?? 0})`}
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gva-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, ID, code, phone, child…" className="h-9 w-48 rounded-lg border border-gva-hairline bg-gva-surface pl-8 pr-3 text-sm sm:w-72" />
          </div>
        }
      >
        {!data ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <>
            {/* Desktop: table like the old admin (S.No, Sponsor ID, Sponsor, Code, …). */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-gva-hairline bg-gva-canvas/80 text-[11px] font-bold uppercase tracking-wide text-gva-muted [&_th]:whitespace-nowrap">
                  <tr>
                    <th className="px-2.5 py-3">S.No</th>
                    <th className="px-2.5 py-3">Sponsor ID</th>
                    <th className="px-2.5 py-3">Sponsor</th>
                    <th className="px-2.5 py-3">Code</th>
                    <th className="px-2.5 py-3">Phone</th>
                    <th className="px-2.5 py-3">Area</th>
                    <th className="px-2.5 py-3">Organization</th>
                    <th className="px-2.5 py-3">Reference</th>
                    <th className="px-2.5 py-3">Status</th>
                    <th className="px-2.5 py-3 text-center leading-tight">Total<br />orphans</th>
                    <th className="px-2 py-3"><span className="sr-only">WhatsApp</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gva-hairline">
                  {rows.length === 0 ? (
                    <tr><td colSpan={11} className="px-3 py-8 text-center text-gva-muted">No sponsors found.</td></tr>
                  ) : null}
                  {rows.map((s, i) => {
                    const all = s.children > 0 && s.paidChildrenThisMonth >= s.children;
                    const href = `/fop/sponsors/${encodeURIComponent(s.code)}`;
                    return (
                      <tr key={s.code} onClick={() => navigate(href)} className="cursor-pointer hover:bg-gva-canvas">
                        <td className="px-2.5 py-3 tabular-nums text-gva-muted">{(data.page - 1) * data.pageSize + i + 1}</td>
                        <td className="px-2.5 py-3 tabular-nums text-gva-ink-2">{s.sponsorId ?? '—'}</td>
                        <td className="px-2.5 py-3">
                          <Link to={href} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2.5">
                            <ChildAvatar name={s.name} size="sm" />
                            <span className="min-w-0">
                              <span className="block max-w-[160px] truncate font-semibold text-gva-ink">{s.name}</span>
                              {s.email ? <span className="block max-w-[160px] truncate text-xs text-gva-muted">{s.email}</span> : null}
                            </span>
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-3 font-semibold text-gva-ink">{s.code}</td>
                        <td className="min-w-[120px] [overflow-wrap:anywhere] px-2.5 py-3 tabular-nums text-gva-ink-2">{s.phone || '—'}</td>
                        <td className="max-w-[150px] px-2.5 py-3 text-gva-ink-2"><span className="line-clamp-2">{s.area || '—'}</span></td>
                        <td className="px-2.5 py-3 text-gva-ink-2">{s.organization || '—'}</td>
                        <td className="px-2.5 py-3 text-gva-ink-2">{s.reference || '—'}</td>
                        <td className="px-2.5 py-3">
                          <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-bold', (s.status || 'Active').toLowerCase() === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600')}>
                            {s.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-2.5 py-3 text-center">
                          <span className="font-semibold tabular-nums">{s.children}</span>
                          {s.children > 0 ? (
                            <span className={cn('mt-1 block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold', all ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                              {s.paidChildrenThisMonth}/{s.children} paid
                            </span>
                          ) : null}
                        </td>
                        <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}><WhatsAppButton phone={s.phone} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phone: compact list. */}
            <ul className="divide-y divide-gva-hairline md:hidden">
              {rows.map((s) => {
                const all = s.children > 0 && s.paidChildrenThisMonth >= s.children;
                return (
                  <li key={s.code} className="flex items-center gap-2">
                    <Link to={`/fop/sponsors/${encodeURIComponent(s.code)}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-3 hover:bg-gva-canvas">
                      <ChildAvatar name={s.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gva-ink">
                          <span className="mr-2 font-mono text-xs text-gva-muted">{s.code}</span>
                          {s.name}
                        </p>
                        <p className="truncate text-xs text-gva-muted">
                          {s.sponsorId ? `ID ${s.sponsorId} · ` : ''}{s.phone || 'No phone'}{s.area ? ` · ${s.area}` : ''}
                        </p>
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
            <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} className="border-t border-gva-hairline" />
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

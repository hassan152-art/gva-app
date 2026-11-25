import {
  BarChart3,
  ChevronRight,
  HandHeart,
  Heart,
  Landmark,
  Paperclip,
  Receipt,
  Table2,
  Trophy,

  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChildAvatar } from '@/components/kafalat/KafalatBits';
import { Skeleton } from '@/components/ui/skeleton';
import { getActiveUser } from '@/lib/api';
import { fopApi, type FopDashboard } from '@/lib/fopApi';
import { fmtDate, pkr } from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';

/** 23,430,000 → "23.4M", 950,000 → "950K". */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

export function HomePage() {
  const user = getActiveUser();
  const location = useLocation();
  const justSignedIn = Boolean((location.state as { justSignedIn?: boolean } | null)?.justSignedIn);
  const name = user?.fullName ?? 'there';
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<FopDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fopApi.dashboard(year).then(setData).catch((e: Error) => setError(e.message));
  }, [year]);

  const t = data?.totals;
  return (
    <div className="mx-auto max-w-[1280px] space-y-4 md:space-y-6">
      <div className="hidden md:block">
        <h1 className="text-xl font-semibold text-gva-ink">{justSignedIn ? `Welcome, ${name}` : `Welcome back, ${name}`}</h1>
        <p className="mt-1 text-sm text-gva-muted">Dashboard overview — Gaza Virtual Adoption</p>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      {/* Totals */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-4">
        {t ? (
          <>
            <Tile icon={Users} tone="green" label="Total Sponsors" value={t.sponsors.toLocaleString('en-US')} sub={`${t.activeSponsors} with children`} to="/fop/sponsors" />
            <Tile icon={Heart} tone="rose" label="Total Orphans" value={t.orphans.toLocaleString('en-US')} sub={`${t.sponsoredOrphans} sponsored`} to="/organization/orphans" />
            <Tile icon={HandHeart} tone="sky" label="Total Volunteers" value={String(t.volunteers)} sub="none recorded yet" />
            <Tile
              icon={Wallet}
              tone="amber"
              label="Total Donations"
              value={`PKR ${compact(t.donationsPkr)}`}
              sub={`${pkr(t.thisMonthPkr)} in ${data!.monthLabel}`}
              to="/fop/donation-collection"
            />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[108px] rounded-2xl" />)
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Top donors */}
        <Card title="Top Donors" icon={Trophy} to="/fop/sponsors" linkLabel="All sponsors">
          {!data ? (
            <ListSkeleton />
          ) : data.topDonors.length === 0 ? (
            <Empty text="No donations yet." />
          ) : (
            <ul className="space-y-3">
              {data.topDonors.map((d, i) => {
                const max = data.topDonors[0].totalPkr || 1;
                return (
                  <li key={`${d.code}-${d.name}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-4 text-xs font-bold tabular-nums text-gva-muted">{i + 1}</span>
                      <ChildAvatar name={d.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gva-ink">
                          {d.name}
                          {d.code ? <span className="ml-1.5 font-mono text-[11px] font-normal text-gva-muted">{d.code}</span> : null}
                        </p>
                        <p className="text-[11px] text-gva-muted">
                          {d.donations} donations · last {fmtDate(d.lastAt)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums text-gva-ink">{pkr(d.totalPkr)}</p>
                    </div>
                    <div className="ml-7 mt-1.5 h-1.5 overflow-hidden rounded-full bg-gva-canvas">
                      <div className="h-full rounded-full bg-gva-chart" style={{ width: `${Math.max(2, (d.totalPkr / max) * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Recent volunteers */}
        <Card title="Recent Volunteers" icon={HandHeart}>
          {!data ? (
            <ListSkeleton />
          ) : data.recentVolunteers.length === 0 ? (
            <div className="flex h-full min-h-[180px] flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gva-canvas text-gva-muted">
                <HandHeart className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-sm font-semibold text-gva-ink">No recent volunteers</p>
              <p className="mt-1 max-w-[240px] text-xs text-gva-muted">Volunteers are not recorded in the system yet.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {data.recentVolunteers.map((v) => (
                <li key={v.name} className="flex justify-between text-sm">
                  <span className="text-gva-ink">{v.name}</span>
                  <span className="text-gva-muted">{fmtDate(v.joinedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Account balances */}
        <Card title="Account Balances" icon={Landmark} to="/fop/banks" linkLabel="Bank details">
          {!data ? (
            <ListSkeleton />
          ) : data.accounts.length === 0 ? (
            <Empty text="No money received yet." />
          ) : (
            <>
              <ul className="divide-y divide-gva-hairline">
                {data.accounts.map((a) => (
                  <li key={`${a.bank}-${a.accountNo}`} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gva-tint text-gva-green-deep">
                      <Landmark className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gva-ink">{a.bank}</p>
                      <p className="truncate font-mono text-[11px] text-gva-muted">{a.accountNo || '—'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums text-gva-ink">{pkr(a.totalPkr)}</p>
                      <p className="text-[11px] text-gva-muted">{a.donations} donations</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-gva-hairline pt-2 text-right text-xs text-gva-muted">
                Total received: <b className="text-gva-ink">{pkr(data.totals.donationsPkr)}</b>
              </p>
            </>
          )}
        </Card>

        {/* Monthly donations */}
        <Card
          title="Monthly Donations"
          icon={BarChart3}
          className="lg:col-span-2 xl:col-span-2"
          action={
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-8 rounded-lg border border-gva-hairline bg-gva-surface px-2 text-xs font-semibold text-gva-ink"
              aria-label="Year"
            >
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          }
        >
          {!data ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <ChartOrTable
              summary={`Total ${data.year}: ${pkr(data.monthly.reduce((s, m) => s + m.totalPkr, 0))}`}
              chart={<MonthlyBars data={data.monthly} />}
              table={
                <SimpleTable
                  head={['Month', 'Donations', 'Amount']}
                  rows={data.monthly.map((m) => [m.label, m.donations.toLocaleString('en-US'), pkr(m.totalPkr)])}
                />
              }
            />
          )}
        </Card>

        {/* Distribution */}
        <Card title="Donation Distribution" icon={BarChart3} className="lg:col-span-2 xl:col-span-1">
          {!data ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <ChartOrTable
              summary={`${data.distribution.reduce((s, b) => s + b.donations, 0).toLocaleString('en-US')} donations in ${data.year}, by amount`}
              chart={<DistributionBars data={data.distribution} />}
              table={
                <SimpleTable
                  head={['Amount (PKR)', 'Donations', 'Total']}
                  rows={data.distribution.map((b) => [b.label, b.donations.toLocaleString('en-US'), pkr(b.totalPkr)])}
                />
              }
            />
          )}
        </Card>
        {/* Recent donations */}
        <Card title="Recent Donations" icon={Receipt} to="/fop/online-donations" linkLabel="View all" className="lg:col-span-2 xl:col-span-3">
          {!data ? (
            <ListSkeleton />
          ) : data.recentDonations.length === 0 ? (
            <Empty text="No donations yet." />
          ) : (
            <ul className="grid divide-y divide-gva-hairline md:grid-cols-2 md:gap-x-8 md:divide-y-0 md:[&>li]:border-b md:[&>li]:border-gva-hairline">
              {data.recentDonations.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gva-ink">{d.sponsorName}</p>
                    <p className="truncate text-[11px] text-gva-muted">
                      {d.childCode ?? '—'} · {d.period} · {fmtDate(d.submittedAt)}
                      {d.slips ? (
                        <span className="ml-1 inline-flex items-center gap-0.5">
                          <Paperclip className="inline h-3 w-3" /> {d.slips}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-gva-ink">{pkr(d.amountPkr)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const TONES = {
  green: 'bg-gva-tint text-gva-green-deep',
  rose: 'bg-rose-50 text-rose-700',
  sky: 'bg-sky-50 text-sky-700',
  amber: 'bg-amber-50 text-amber-700',
} as const;

function Tile({ icon: Icon, tone, label, value, sub, to }: { icon: LucideIcon; tone: keyof typeof TONES; label: string; value: string; sub?: string; to?: string }) {
  const body = (
    <div className="flex h-full min-h-[108px] flex-col justify-between rounded-2xl border border-gva-hairline bg-gva-surface p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md md:p-4">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', TONES[tone])}>
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="mt-2 min-w-0">
        <p className="truncate text-2xl font-bold tabular-nums tracking-tight text-gva-ink md:text-3xl">{value}</p>
        <p className="text-sm font-medium text-gva-ink-2">{label}</p>
        {sub ? <p className="truncate text-xs text-gva-muted">{sub}</p> : null}
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function Card({
  title,
  icon: Icon,
  children,
  action,
  to,
  linkLabel,
  className,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  to?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <section className={cn('flex min-w-0 flex-col rounded-2xl border border-gva-hairline bg-gva-surface p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] md:p-5', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gva-ink md:text-base">
          <Icon className="h-4 w-4 text-gva-green" strokeWidth={2} aria-hidden /> {title}
        </h2>
        {action}
        {to ? (
          <Link to={to} className="inline-flex items-center gap-0.5 text-xs font-semibold text-gva-green-deep hover:underline">
            {linkLabel} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-gva-muted">{text}</p>;
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

/** Chart with a "Table" toggle — the table view is the accessible fallback. */
function ChartOrTable({ chart, table, summary }: { chart: ReactNode; table: ReactNode; summary: string }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-gva-muted">{summary}</p>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-gva-ink-2 hover:bg-gva-canvas"
          aria-pressed={asTable}
        >
          {asTable ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />} {asTable ? 'Chart' : 'Table'}
        </button>
      </div>
      {asTable ? table : chart}
    </div>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gva-hairline text-xs text-gva-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={cn('py-1.5 font-semibold', i > 0 && 'text-right')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-gva-hairline/60 last:border-0">
              {r.map((c, i) => (
                <td key={i} className={cn('py-1.5 tabular-nums', i === 0 ? 'text-gva-ink' : 'text-right text-gva-ink-2')}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Nice round axis max + 3 ticks for a money scale. */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

/** Single-series column chart: money received per month (no legend — the title names it). */
function MonthlyBars({ data }: { data: FopDashboard['monthly'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => niceMax(Math.max(...data.map((d) => d.totalPkr))), [data]);
  const ticks = [max, max / 2, 0];
  const h = 200;
  return (
    <div className="relative">
      <div className="flex gap-2">
        {/* y axis */}
        <div className="flex w-9 shrink-0 flex-col justify-between pb-6 text-right text-[10px] tabular-nums text-gva-muted" style={{ height: h + 24 }}>
          {ticks.map((t) => (
            <span key={t}>{compact(t)}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {/* gridlines */}
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: h }}>
            {ticks.map((t, i) => (
              <div key={t} className={cn('absolute inset-x-0 border-t', i === ticks.length - 1 ? 'border-gva-muted-2/60' : 'border-dashed border-gva-hairline')} style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
            ))}
          </div>
          <div className="relative flex items-end gap-[2px] sm:gap-1.5" style={{ height: h }}>
            {data.map((m, i) => (
              <button
                type="button"
                key={m.month}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => setHover(hover === i ? null : i)}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center"
                aria-label={`${m.label}: ${pkr(m.totalPkr)}, ${m.donations} donations`}
              >
                <span
                  className={cn('w-full max-w-[34px] rounded-t-[4px] bg-gva-chart transition-opacity', hover !== null && hover !== i && 'opacity-40')}
                  style={{ height: `${m.totalPkr ? Math.max(1.5, (m.totalPkr / max) * 100) : 0}%` }}
                />
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex gap-[2px] sm:gap-1.5">
            {data.map((m, i) => (
              <span key={m.month} className={cn('min-w-0 flex-1 text-center text-[10px] text-gva-muted', hover === i && 'font-bold text-gva-ink')}>
                {m.label}
              </span>
            ))}
          </div>
          {hover !== null ? (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-gva-hairline bg-gva-surface px-2.5 py-1.5 text-xs shadow-lg"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              <p className="font-semibold text-gva-ink">{data[hover].label}</p>
              <p className="tabular-nums text-gva-ink-2">{pkr(data[hover].totalPkr)}</p>
              <p className="text-gva-muted">{data[hover].donations.toLocaleString('en-US')} donations</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Horizontal bars: number of donations per amount range (one hue, direct labels). */
function DistributionBars({ data }: { data: FopDashboard['distribution'] }) {
  const max = Math.max(1, ...data.map((d) => d.donations));
  const total = data.reduce((s, d) => s + d.donations, 0) || 1;
  return (
    <ul className="space-y-3.5 pt-1">
      {data.map((b) => (
        <li key={b.label} className="group" title={`${b.label}: ${b.donations} donations · ${pkr(b.totalPkr)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium text-gva-ink-2">PKR {b.label}</span>
            <span className="tabular-nums text-gva-ink">
              <b>{b.donations.toLocaleString('en-US')}</b>
              <span className="ml-1 text-gva-muted">({Math.round((b.donations / total) * 100)}%)</span>
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-[4px] bg-gva-canvas">
            <div className="h-full rounded-[4px] bg-gva-chart transition-opacity group-hover:opacity-80" style={{ width: `${b.donations ? Math.max(1.5, (b.donations / max) * 100) : 0}%` }} />
          </div>
          <p className="mt-0.5 text-right text-[11px] tabular-nums text-gva-muted">{pkr(b.totalPkr)}</p>
        </li>
      ))}
    </ul>
  );
}


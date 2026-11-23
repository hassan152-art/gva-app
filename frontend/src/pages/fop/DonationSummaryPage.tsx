import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MiniStat, Panel } from '@/components/kafalat/KafalatBits';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import { fopApi, type DonationSummaryMonth } from '@/lib/fopApi';
import { downloadCsv, fmtDate, pkr, usd } from '@/lib/kafalatApi';

export function DonationSummaryPage() {
  useMobilePageChrome({ title: 'Donation summary', backTo: '/' });
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [months, setMonths] = useState<DonationSummaryMonth[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    setMonths(null);
    fopApi.donationSummary(year).then((r) => setMonths(r.months)).catch((e: Error) => setError(e.message));
  }, [year]);

  const total = months?.reduce((s, m) => s + m.receivedPkr, 0) ?? 0;
  const subs = months?.reduce((s, m) => s + m.submissions, 0) ?? 0;

  function exportCsv() {
    if (!months) return;
    downloadCsv(`donation-summary-${year}.csv`, [
      ['Month', 'Children due', 'Paid', 'Partial', 'Pending', 'Not due', 'Received PKR', 'Approx USD', 'Expected PKR', 'Submissions'],
      ...months.map((m) => [m.label, m.sponsored - m.notDue, m.paid, m.partial, m.pending, m.notDue, m.receivedPkr, m.receivedUsd, m.expectedPkr, m.submissions]),
    ]);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-gva-ink md:text-2xl">Sponsorship monthly reports</h1>
          <p className="mt-1 text-sm text-gva-muted">One report per kafalat month — how many children were paid and how much came in.</p>
        </div>
        <div className="flex gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 rounded-lg border border-gva-hairline bg-gva-surface px-3 text-sm font-semibold" aria-label="Year">
            {[now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gva-hairline bg-gva-surface px-3.5 text-sm font-semibold hover:bg-gva-canvas">
            <Download className="h-4 w-4" aria-hidden /> CSV
          </button>
        </div>
      </div>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MiniStat label={`Received in ${year}`} value={pkr(total)} sub={`≈ ${usd(total / 280)}`} tone="green" />
        <MiniStat label="Submissions" value={subs.toLocaleString('en-US')} />
        <MiniStat label="Months with reports" value={months?.length ?? '—'} />
      </div>

      <Panel title={`Reports ${year}`}>
        {!months ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : months.length === 0 ? (
          <p className="py-6 text-center text-sm text-gva-muted">No kafalat data for {year}.</p>
        ) : (
          <ul className="divide-y divide-gva-hairline">
            {months.map((m) => {
              const due = m.sponsored - m.notDue;
              const pct = due > 0 ? Math.round(((m.paid + m.partial) / due) * 100) : 0;
              const isOpen = open === m.month;
              return (
                <li key={m.month} className="py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => setOpen(isOpen ? null : m.month)} className="rounded-md p-1 hover:bg-gva-canvas" aria-label="Toggle bank breakdown">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-[140px]">
                      <p className="font-semibold text-gva-ink">{m.label}</p>
                      <p className="text-xs text-gva-muted">{m.submissions} submissions{m.firstSubmissionAt ? ` · from ${fmtDate(m.firstSubmissionAt)}` : ''}</p>
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-emerald-700">{m.paid + m.partial} of {due} paid</span>
                        <span className="text-gva-muted">{pct}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-rose-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-gva-muted">
                        Pending {m.pending}{m.partial ? ` · partial ${m.partial}` : ''}{m.notDue ? ` · not due ${m.notDue}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums">{pkr(m.receivedPkr)}</p>
                      <p className="text-xs text-gva-muted">≈ {usd(m.receivedUsd)}</p>
                    </div>
                    <Link to={`/organization/kafalat?year=${year}&month=${m.month}`} className="rounded-lg border border-gva-hairline px-3 py-1.5 text-xs font-semibold hover:bg-gva-canvas">
                      Open report
                    </Link>
                  </div>
                  {isOpen ? (
                    <div className="mt-3 grid gap-2 pl-9 sm:grid-cols-2 lg:grid-cols-4">
                      {m.byBank.map((b) => (
                        <div key={b.bank} className="rounded-lg border border-gva-hairline p-2.5">
                          <p className="truncate text-xs font-bold uppercase text-gva-muted">{b.bank}</p>
                          <p className="font-bold tabular-nums">{pkr(b.pkr)}</p>
                          <p className="text-[11px] text-gva-muted">{b.submissions} records</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-gva-muted">
          Based on online kafalat submissions (from 25 Mar 2026). Payments made before that through other channels are not in this data.
        </p>
      </Panel>
    </div>
  );
}

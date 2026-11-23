import { Landmark } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import { fopApi, type BankDetail } from '@/lib/fopApi';
import { MONTHS, fmtDate, pkr, usd } from '@/lib/kafalatApi';

export function BankDetailsPage() {
  useMobilePageChrome({ title: 'Bank details', backTo: '/' });
  const [banks, setBanks] = useState<BankDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fopApi.banks().then((r) => setBanks(r.banks)).catch((e: Error) => setError(e.message));
  }, []);

  const grand = banks?.reduce((s, b) => s + b.pkr, 0) ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-gva-ink md:text-2xl">Bank details</h1>
          <p className="mt-1 text-sm text-gva-muted">Accounts that receive kafalat payments and how much each has received.</p>
        </div>
        <p className="rounded-xl bg-gva-tint px-4 py-2 text-sm font-semibold text-gva-green-deep">
          Total received: {pkr(grand)} <span className="font-normal">(≈ {usd(grand / 280)})</span>
        </p>
      </div>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {!banks
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)
          : banks.map((b) => {
              const max = Math.max(1, ...b.monthly.map((m) => m.pkr));
              const share = grand ? Math.round((b.pkr / grand) * 100) : 0;
              return (
                <section key={b.bank} className="rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gva-tint text-gva-green-deep"><Landmark className="h-5 w-5" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-lg font-bold text-gva-ink">{b.bank}</h2>
                      <p className="font-mono text-xs text-gva-muted [overflow-wrap:anywhere]">{b.accounts.length ? b.accounts.join(' · ') : 'No account number on record'}</p>
                    </div>
                    <span className="rounded-full bg-gva-canvas px-2.5 py-0.5 text-xs font-bold text-gva-ink-2">{share}%</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Stat label="Received" value={pkr(b.pkr)} />
                    <Stat label="Records" value={b.records.toLocaleString('en-US')} />
                    <Stat label="Donors" value={b.donors.toLocaleString('en-US')} />
                  </div>
                  <div className="mt-4 flex h-24 items-end gap-1" aria-label="Monthly amounts">
                    {b.monthly.map((m) => {
                      const [y, mo] = m.ym.split('-').map(Number);
                      return (
                        <div key={m.ym} className="flex flex-1 flex-col items-center gap-1" title={`${MONTHS[mo - 1]} ${y}: ${pkr(m.pkr)}`}>
                          <div className="w-full rounded-t bg-gva-green/80" style={{ height: `${Math.max(4, (m.pkr / max) * 72)}px` }} />
                          <span className="text-[9px] font-semibold uppercase text-gva-muted">{MONTHS[mo - 1].slice(0, 3)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gva-muted">
                    <span>{fmtDate(b.firstAt)} – {fmtDate(b.lastAt)}</span>
                    <Link to="/fop/online-donations" className="font-semibold text-gva-green-deep hover:underline">View transfers →</Link>
                  </div>
                </section>
              );
            })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gva-canvas px-2 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gva-muted">{label}</p>
      <p className="truncate text-sm font-bold tabular-nums text-gva-ink">{value}</p>
    </div>
  );
}

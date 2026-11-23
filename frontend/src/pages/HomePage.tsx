import {
  BookOpen,
  Calendar,
  GraduationCap,
  Heart,
  Radio,
  Users,
  Wallet,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { StatCard } from '@/components/dashboard/StatCard';
import { getActiveUser } from '@/lib/api';
import { cn } from '@/lib/utils';

export function HomePage() {
  const user = getActiveUser();
  const location = useLocation();
  const justSignedIn = Boolean(
    (location.state as { justSignedIn?: boolean } | null)?.justSignedIn,
  );
  const name = user?.fullName ?? 'there';

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 md:space-y-6">
      <div className="hidden md:block">
        <h1 className="text-xl font-semibold text-gva-ink">
          {justSignedIn ? `Welcome, ${name}` : `Welcome back, ${name}`}
        </h1>
        <p className="mt-1 text-sm text-gva-muted">Dashboard overview — Gaza Virtual Adoption</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
        <StatCard
          compact
          label="Active sponsors"
          sublabel="346 total"
          value={128}
          icon={Users}
          tint="mint"
        />
        <StatCard compact label="Sponsored children" value={354} icon={Heart} tint="green" />
        <StatCard compact label="Open subjects" value={25} icon={BookOpen} tint="forest" />
        <StatCard
          compact
          label="Total sessions"
          sublabel="0 upcoming"
          value={14}
          icon={Calendar}
          tint="orange"
        />
        <StatCard compact label="Live now" value={0} icon={Radio} tint="pink" />
      </div>

      <section className="rounded-2xl border border-black/[0.06] bg-gva-surface p-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)] md:p-5">
        <h2 className="px-1 text-sm font-semibold text-gva-ink md:text-base">
          App download statistics
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:gap-4">
          <div className="rounded-xl bg-gva-canvas p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gva-muted">
              Total downloads
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gva-ink">25</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gva-hairline">
              <div className="h-full w-[6.2%] rounded-full bg-gva-green" />
            </div>
            <p className="mt-2 text-xs text-gva-muted">Students: 22 · Staff: 3</p>
          </div>
          <div className="rounded-xl bg-[#e8f7ef] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gva-green-deep">
              Active users
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gva-green-deep">26</p>
            <div className="mt-3 flex items-center gap-3 text-sm font-semibold text-gva-green-deep">
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-4 w-4" aria-hidden /> 23
              </span>
              <span className="inline-flex items-center gap-1">
                <Wallet className="h-4 w-4" aria-hidden /> 3
              </span>
              <span className="ml-auto text-xs">100%</span>
            </div>
          </div>
        </div>
      </section>

      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        <section className="rounded-2xl border border-black/[0.06] bg-gva-surface p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] md:p-6">
          <h2 className="text-base font-semibold text-gva-ink">Sponsorship summary</h2>
          <ul className="mt-4 space-y-4">
            {[
              { label: 'Total sponsors (active)', value: 128, pct: 72 },
              { label: 'Children fully funded', value: 210, pct: 59 },
              { label: 'Monthly target (PKR)', value: '1.2M', pct: 48 },
              { label: 'Staff & volunteers', value: 13, pct: 100 },
            ].map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-gva-ink-2">{row.label}</span>
                  <span className="font-semibold tabular-nums text-gva-ink">{row.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gva-canvas">
                  <div
                    className="h-full rounded-full bg-gva-green transition-all"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-black/[0.06] bg-gva-surface p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gva-ink">Calendar</h2>
            <Calendar className="h-5 w-5 text-gva-muted-2" aria-hidden />
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gva-muted">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
            {Array.from({ length: 35 }, (_, i) => {
              const day = i - 6;
              const isCurrent = day === 2;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-lg py-1',
                    day < 1 || day > 30 ? 'text-transparent' : 'text-gva-ink-2',
                    isCurrent && 'bg-gva-green font-semibold text-white',
                  )}
                >
                  {day > 0 && day <= 30 ? day : '·'}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

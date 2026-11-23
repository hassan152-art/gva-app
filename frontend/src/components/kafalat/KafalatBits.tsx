import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { MonthState } from '@/lib/kafalatApi';
import { cn } from '@/lib/utils';

export const STATE_STYLE: Record<MonthState, { label: string; pill: string; dot: string; cell: string }> = {
  paid: {
    label: 'Paid',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dot: 'bg-emerald-500',
    cell: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  partial: {
    label: 'Partial',
    pill: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    dot: 'bg-amber-500',
    cell: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  pending: {
    label: 'Pending',
    pill: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    dot: 'bg-rose-500',
    cell: 'border-rose-200 bg-rose-50/70 text-rose-800',
  },
  upcoming: {
    label: 'Upcoming',
    pill: 'bg-slate-50 text-slate-600 ring-slate-500/20',
    dot: 'bg-slate-300',
    cell: 'border-dashed border-slate-200 bg-white text-slate-400',
  },
  not_due: {
    label: 'Not due',
    pill: 'bg-slate-50 text-slate-500 ring-slate-500/10',
    dot: 'bg-slate-200',
    cell: 'border-slate-100 bg-slate-50 text-slate-400',
  },
  unsponsored: {
    label: 'No sponsor',
    pill: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    dot: 'bg-sky-400',
    cell: 'border-sky-100 bg-sky-50 text-sky-700',
  },
};

export function StateBadge({ state, className }: { state: MonthState; className?: string }) {
  const s = STATE_STYLE[state];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset',
        s.pill,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} aria-hidden />
      {s.label}
    </span>
  );
}

export function ChildAvatar({
  name,
  photoUrl,
  size = 'md',
}: {
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'xl';
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?';
  const dims = {
    sm: 'h-9 w-9 text-xs rounded-xl',
    md: 'h-12 w-12 text-sm rounded-2xl',
    xl: 'h-24 w-24 text-3xl rounded-3xl md:h-28 md:w-28',
  }[size];
  if (photoUrl) {
    return <img src={photoUrl} alt="" className={cn('shrink-0 object-cover', dims)} />;
  }
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center bg-gradient-to-br from-gva-green-light to-gva-green-deep font-display font-bold text-white',
        dims,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] print:break-inside-avoid print:shadow-none',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-gva-hairline px-4 py-3 md:px-5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-gva-ink">
          {Icon ? <Icon className="h-4 w-4 text-gva-green" aria-hidden /> : null}
          {title}
        </h2>
        {action}
      </header>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

export function MiniStat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'green' | 'amber' | 'rose' | 'sky';
}) {
  const toneCls = {
    default: 'text-gva-ink',
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
    sky: 'text-sky-700',
  }[tone];
  return (
    <div className="rounded-2xl border border-gva-hairline bg-gva-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gva-muted">{label}</p>
      <p className={cn('mt-1.5 font-display text-2xl font-bold tabular-nums', toneCls)}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-gva-muted">{sub}</p> : null}
    </div>
  );
}

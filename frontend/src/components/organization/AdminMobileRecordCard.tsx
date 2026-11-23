import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AdminMobileRecordCardProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  meta?: ReactNode;
  actions: ReactNode;
  className?: string;
};

export function AdminMobileRecordCard({
  title,
  subtitle,
  badge,
  meta,
  actions,
  className,
}: AdminMobileRecordCardProps) {
  return (
    <article
      className={cn(
        'rounded-xl border border-gva-hairline bg-gva-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {badge ? (
            <p className="mb-1 font-mono text-[11px] font-bold uppercase tracking-wide text-gva-muted">
              {badge}
            </p>
          ) : null}
          <h3 className="truncate text-[15px] font-semibold text-gva-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 truncate text-sm text-gva-ink-2">{subtitle}</p> : null}
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
      </div>
    </article>
  );
}

export function StatusPill({ status }: { status: 'waiting' | 'sponsored' | string }) {
  const sponsored = status === 'sponsored';
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        sponsored ? 'bg-gva-tint text-gva-green-deep' : 'bg-amber-50 text-amber-800',
      )}
    >
      {sponsored ? 'Sponsored' : 'Waiting'}
    </span>
  );
}

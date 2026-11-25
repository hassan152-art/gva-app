import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Server-side pagination footer: "Showing 26–50 of 781" + prev / numbered / next. */
export function Pager({
  page,
  pageSize,
  total,
  onPage,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const nums: (number | '…')[] = [];
  for (let p = 1; p <= pages; p += 1) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const btn =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-gva-hairline bg-gva-surface px-2 text-sm font-semibold text-gva-ink hover:bg-gva-canvas disabled:opacity-40';
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-sm text-gva-muted', className)}>
      <span>
        Showing <b className="text-gva-ink">{from.toLocaleString('en-US')}</b>–<b className="text-gva-ink">{to.toLocaleString('en-US')}</b> of{' '}
        <b className="text-gva-ink">{total.toLocaleString('en-US')}</b>
      </span>
      {pages > 1 ? (
        <div className="flex items-center gap-1">
          <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {nums.map((n, i) =>
            n === '…' ? (
              <span key={`e${i}`} className="px-1">…</span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onPage(n)}
                className={cn(btn, n === page && 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800')}
                aria-current={n === page ? 'page' : undefined}
              >
                {n}
              </button>
            ),
          )}
          <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

import { Search } from 'lucide-react';
import { useQuickSearch } from '@/components/layout/QuickSearchProvider';
import { cn } from '@/lib/utils';

type ShellSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: 'header' | 'sidebar';
  className?: string;
};

function QuickSearchButton({
  variant = 'header',
  className,
}: {
  variant?: 'header' | 'sidebar';
  className?: string;
}) {
  const { setOpen } = useQuickSearch();
  const isHeader = variant === 'header';

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'inline-flex h-6 shrink-0 items-center justify-center rounded-md border px-1.5',
        'text-xs select-none transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gva-green/25',
        isHeader
          ? 'border-gva-hairline bg-gva-surface text-gva-muted-2 hover:border-gva-green/40 hover:bg-gva-tint hover:text-gva-green-deep shadow-xs'
          : 'border-white/20 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white',
        className,
      )}
      aria-label="Open quick search (Shift + S)"
      title="Quick search (Shift + S / Ctrl + K)"
    >
      <span className="text-[11px] leading-none">⇧</span>
      <span className="ml-0.5 text-[10px] font-semibold leading-none">S</span>
    </button>
  );
}

/** Search input with a Quick search control on the right (inside the bar). */
export function ShellSearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  variant = 'header',
  className,
}: ShellSearchBarProps) {
  const isHeader = variant === 'header';

  return (
    <div className={cn('relative w-full', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-gva-muted-2"
        strokeWidth={1.75}
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-9 w-full rounded-lg pl-8.5 pr-11 text-xs text-gva-ink placeholder:text-gva-muted-2',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-gva-green/20',
          isHeader
            ? 'border border-gva-hairline bg-gva-surface hover:border-gva-muted-2/40 focus:border-gva-green'
            : 'border-0 bg-gva-canvas focus:ring-gva-green/20',
        )}
      />
      <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center">
        <div className="pointer-events-auto">
          <QuickSearchButton variant={variant} />
        </div>
      </div>
    </div>
  );
}

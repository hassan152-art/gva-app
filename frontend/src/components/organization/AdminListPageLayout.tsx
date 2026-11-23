import { ChevronRight, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import { cn } from '@/lib/utils';

type AdminListPageLayoutProps = {
  title: string;
  subtitle: string;
  addLabel: string;
  addTo: string;
  filterArea: ReactNode;
  alerts?: ReactNode;
  desktopTable: ReactNode;
  mobileCards: ReactNode;
};

export function AdminListPageLayout({
  title,
  subtitle,
  addLabel,
  addTo,
  filterArea,
  alerts,
  desktopTable,
  mobileCards,
}: AdminListPageLayoutProps) {
  useMobilePageChrome({ title, backTo: '/' });

  return (
    <div className="mx-auto max-w-6xl pb-2 md:pb-0">
      <nav
        className="mb-3 flex items-center gap-1 text-xs font-medium text-gva-muted md:hidden"
        aria-label="Breadcrumb"
      >
        <Link to="/" className="hover:text-gva-ink">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate text-gva-ink-2">{title}</span>
      </nav>

      <div className="mb-4 hidden flex-wrap items-end justify-between gap-4 md:flex">
        <div>
          <h1 className="text-xl font-bold text-gva-ink md:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-gva-muted">{subtitle}</p>
        </div>
        <Link
          to={addTo}
          className={cn(
            'inline-flex h-11 w-auto items-center justify-center gap-2 rounded-[var(--radius-button)]',
            'bg-gva-green px-5 text-[15px] font-semibold text-white hover:bg-gva-green-deep',
          )}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {addLabel}
        </Link>
      </div>

      <p className="mb-3 text-sm text-gva-muted md:hidden">{subtitle}</p>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{filterArea}</div>

      {alerts}

      <div className="hidden md:block">{desktopTable}</div>
      <div className="space-y-3 md:hidden">{mobileCards}</div>

      <Link
        to={addTo}
        className={cn(
          'fixed right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full',
          'bg-gva-green text-white shadow-[0_8px_24px_rgba(22,163,74,0.35)] hover:bg-gva-green-deep',
          'bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:hidden',
        )}
        aria-label={addLabel}
      >
        <Plus className="h-6 w-6" strokeWidth={2} aria-hidden />
      </Link>
    </div>
  );
}

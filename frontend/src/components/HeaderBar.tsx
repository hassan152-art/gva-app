import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  BellRing,
  Grid3x3,
  HeartHandshake,
  Home,
  ImageUp,
  PanelLeft,
  Play,
  ReceiptText,
  Search,
  UserPlus,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuickSearch } from '@/components/layout/QuickSearchProvider';
import { getNavItems } from '@/lib/navConfig';
import { LogoLockup } from '@/components/LogoLockup';
import { NotificationsBell } from '@/components/NotificationsBell';
import { ProfileMenu } from '@/components/ProfileMenu';
import { ShellSearchBar } from '@/components/QuickSearchField';
import { useSidebar } from '@/components/layout/SidebarProvider';
import { SHELL_SURFACE } from '@/lib/chromeStyles';
import { cn } from '@/lib/utils';

type HeaderBarProps = {
  title?: string;
};

function MobileIconButton({
  label,
  children,
  onClick,
  badge,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gva-ink-2 hover:bg-gva-canvas"
    >
      {children}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gva-heart px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

type SheetItem = { label: string; sub?: string; to: string; icon: LucideIcon };

const QUICK_ACTIONS: SheetItem[] = [
  { label: 'Add orphan', sub: 'New child profile', to: '/organization/orphans/new', icon: HeartHandshake },
  { label: 'Add sponsor', sub: 'New donor', to: '/fop/donation-collection?action=add-sponsor', icon: UserPlus },
  { label: 'Create Donation', sub: "Raise this month's invoices", to: '/fop/donation-collection?action=create', icon: ReceiptText },
  { label: 'Receive Payment', sub: 'Search the sponsor first', to: '/fop/donation-collection', icon: Wallet },
  { label: 'Send Reminder', sub: 'WhatsApp pending sponsors', to: '/fop/send-reminder', icon: BellRing },
  { label: 'Upload photos', sub: 'Files named by code (OR015.jpg)', to: '/organization/orphans', icon: ImageUp },
];

/** Bottom sheet used by the mobile header (quick actions, modules). */
function MobileSheet({ title, items, grid, onClose }: { title: string; items: SheetItem[]; grid?: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      <div className="relative max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-gva-surface px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gva-hairline" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gva-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gva-muted hover:bg-gva-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className={grid ? 'grid grid-cols-3 gap-2' : 'space-y-1'}>
          {items.map((it) => (
            <li key={it.label}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(it.to);
                }}
                className={cn(
                  'w-full rounded-2xl text-left hover:bg-gva-canvas active:bg-gva-tint',
                  grid ? 'flex flex-col items-center gap-2 border border-gva-hairline px-2 py-3 text-center' : 'flex items-center gap-3 px-2 py-2.5',
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gva-tint text-gva-green-deep">
                  <it.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className={cn('block font-semibold text-gva-ink', grid ? 'text-xs leading-tight' : 'text-sm')}>{it.label}</span>
                  {it.sub && !grid ? <span className="block text-xs text-gva-muted">{it.sub}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

export function HeaderBar({ title = 'Home' }: HeaderBarProps) {
  const { isMobile, toggleMobile, openMobile, toggleExpanded } = useSidebar();
  const [headerSearch, setHeaderSearch] = useState('');
  const quickSearch = useQuickSearch();
  const [sheet, setSheet] = useState<null | 'actions' | 'modules'>(null);

  if (isMobile) {
    return (
      <header
        className={cn(
          'sticky top-0 z-30 shrink-0 border-b',
          SHELL_SURFACE,
          'pt-[env(safe-area-inset-top)]',
        )}
      >
        <div className="grid min-h-14 w-full grid-cols-7 items-center px-1 py-2">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={toggleMobile}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gva-green/30 bg-gva-tint text-gva-green-deep"
              aria-label="Open menu"
              aria-expanded={openMobile}
            >
              <PanelLeft className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex justify-center">
            <Link
              to="/"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gva-hairline bg-gva-canvas p-1"
              aria-label="Home"
            >
              <LogoLockup width={32} className="max-h-7 object-contain" />
            </Link>
          </div>

          <div className="flex justify-center">
            <MobileIconButton label="Search" onClick={() => quickSearch.setOpen(true)}>
              <Search className="h-5 w-5" strokeWidth={1.75} />
            </MobileIconButton>
          </div>
          <div className="flex justify-center">
            <MobileIconButton label="Quick actions" onClick={() => setSheet('actions')}>
              <Play className="h-5 w-5" strokeWidth={1.75} />
            </MobileIconButton>
          </div>
          <div className="flex justify-center">
            <MobileIconButton label="Modules" onClick={() => setSheet('modules')}>
              <Grid3x3 className="h-5 w-5" strokeWidth={1.75} />
            </MobileIconButton>
          </div>
          <div className="flex justify-center">
            <NotificationsBell />
          </div>

          <div className="flex justify-center">
            <ProfileMenu variant="mobile" />
          </div>
        </div>
        {sheet === 'actions' ? <MobileSheet title="Quick actions" items={QUICK_ACTIONS} onClose={() => setSheet(null)} /> : null}
        {sheet === 'modules' ? (
          <MobileSheet
            title="Modules"
            grid
            items={getNavItems().map((n) => ({ label: n.label, to: n.to, icon: n.icon }))}
            onClose={() => setSheet(null)}
          />
        ) : null}
      </header>
    );
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex min-h-14 shrink-0 items-center gap-3 border-b px-4 md:px-5',
        SHELL_SURFACE,
        'pt-[env(safe-area-inset-top)]',
      )}
    >
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gva-hairline text-gva-ink-2 hover:bg-gva-canvas hover:text-gva-ink"
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </button>

      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold',
            isActive ? 'text-gva-ink' : 'text-gva-ink-2 hover:bg-gva-canvas hover:text-gva-ink',
          )
        }
      >
        <Home className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span>{title}</span>
      </NavLink>

      <div className="mx-auto hidden max-w-md flex-1 px-4 md:flex">
        <ShellSearchBar
          variant="header"
          value={headerSearch}
          onChange={setHeaderSearch}
          placeholder="Search..."
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationsBell />
        <div className="ml-1">
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

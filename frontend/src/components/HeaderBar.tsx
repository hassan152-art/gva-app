import { useState, type ReactNode } from 'react';
import { Grid3x3, Home, PanelLeft, Play, Search } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
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

export function HeaderBar({ title = 'Home' }: HeaderBarProps) {
  const { isMobile, toggleMobile, openMobile, toggleExpanded } = useSidebar();
  const [headerSearch, setHeaderSearch] = useState('');

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
            <MobileIconButton label="Search">
              <Search className="h-5 w-5" strokeWidth={1.75} />
            </MobileIconButton>
          </div>
          <div className="flex justify-center">
            <MobileIconButton label="Quick actions">
              <Play className="h-5 w-5" strokeWidth={1.75} />
            </MobileIconButton>
          </div>
          <div className="flex justify-center">
            <MobileIconButton label="Modules">
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

import { LogOut, Moon, PanelLeft, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoLockup } from '@/components/LogoLockup';
import { ShellSearchBar } from '@/components/QuickSearchField';
import { ShellIconButton } from '@/components/sidebar/ShellIconButton';
import { SidebarNavEntries } from '@/components/sidebar/SidebarNavEntries';
import { useSidebar } from '@/components/layout/SidebarProvider';
import { getActiveUser } from '@/lib/api';
import { signOut } from '@/lib/signOut';
import { SHELL_NAV_IDLE, SHELL_SURFACE } from '@/lib/chromeStyles';
import { MOBILE_DRAWER_WIDTH } from '@/lib/mobileLayout';
import { cn } from '@/lib/utils';

const SIDEBAR_EXPANDED = '16rem';
const SIDEBAR_ICON = '3.5rem';

export function AppSidebar() {
  const navigate = useNavigate();
  const user = getActiveUser();
  const [menuQuery, setMenuQuery] = useState('');
  const { expanded, isMobile, openMobile, setOpenMobile, toggleExpanded, setExpanded } =
    useSidebar();

  const width = isMobile ? MOBILE_DRAWER_WIDTH : expanded ? SIDEBAR_EXPANDED : SIDEBAR_ICON;
  const showLabels = expanded || isMobile;
  const iconRail = !isMobile && !expanded;

  const initials = (user?.fullName ?? 'U').charAt(0).toUpperCase();
  const roleLabel = user?.role ?? 'user';

  function onSignOut() {
    signOut(navigate);
  }

  if (isMobile) {
    return (
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-svh flex-col border-none bg-gva-drawer text-white',
          'overscroll-contain transition-transform duration-300 ease-in-out md:hidden',
          openMobile ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ width }}
      >
        <div className="flex flex-col gap-2 bg-gva-drawer p-0 pt-[env(safe-area-inset-top)]">
          <div className="flex cursor-pointer items-center justify-center px-4 py-8">
            <LogoLockup width={172} className="!h-16 w-auto max-w-none" />
          </div>
        </div>

        <div className="px-5 pt-2">
          <ShellSearchBar
            variant="sidebar"
            value={menuQuery}
            onChange={setMenuQuery}
            placeholder="Search menu..."
            className="[&_input]:border [&_input]:border-white/20 [&_input]:bg-white/10 [&_input]:text-white [&_input]:placeholder:text-white/50"
          />
        </div>

        <nav
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain',
            'touch-pan-y bg-transparent px-5 pb-8 pt-2',
            '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
          )}
        >
          <SidebarNavEntries
            query={menuQuery}
            variant="drawer"
            showLabels={showLabels}
            iconRail={iconRail}
            onLeafNavigate={() => setOpenMobile(false)}
          />
        </nav>

        <div
          className={cn(
            'flex flex-col gap-2 bg-gva-drawer p-5 pt-4',
            'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          )}
        >
          <div className="space-y-1">
            <button
              type="button"
              className="flex w-full items-center gap-4 border-b border-white/15 px-2 py-3 text-[15px] font-semibold text-white transition-colors hover:text-white/80"
              aria-label="Toggle theme"
            >
              <Moon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span>Dark theme</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-4 px-2 py-3 text-[15px] font-semibold text-white transition-colors hover:text-white/80"
            >
              <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-[width] duration-300 ease-out',
        SHELL_SURFACE,
        'md:translate-x-0',
      )}
      style={{ width }}
    >
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-gva-hairline px-4',
          iconRail && 'justify-center px-0',
        )}
      >
        <LogoLockup
          width={showLabels && !iconRail ? 128 : 36}
          className={iconRail ? 'max-w-[2.25rem]' : undefined}
        />
      </div>

      {showLabels && !iconRail ? (
        <div className="border-b border-gva-hairline px-3 py-3">
          <ShellSearchBar
            variant="sidebar"
            value={menuQuery}
            onChange={setMenuQuery}
            placeholder="Search menu..."
          />
        </div>
      ) : null}

      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin',
          showLabels && !iconRail ? 'px-1 py-1' : 'flex w-full flex-col items-stretch py-0',
        )}
      >
        {iconRail ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={cn(
              'flex h-11 w-full items-center justify-center border-b border-gva-hairline',
              SHELL_NAV_IDLE,
            )}
            aria-label="Search menu"
          >
            <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}

        <SidebarNavEntries
          query={menuQuery}
          variant="shell"
          showLabels={showLabels}
          iconRail={iconRail}
        />
      </nav>

      <div className="mt-auto border-t border-gva-hairline">
        {showLabels && user ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gva-hairline bg-gva-canvas text-sm font-bold text-gva-ink">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gva-ink">{user.fullName}</p>
              <p className="truncate text-xs capitalize text-gva-muted">{roleLabel}</p>
            </div>
          </div>
        ) : null}

        {iconRail ? (
          <div className="flex flex-col items-center gap-2 px-1.5 py-3">
            <ShellIconButton label="Expand sidebar" onClick={toggleExpanded} className="h-9 w-9">
              <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </ShellIconButton>
            <ShellIconButton label="Toggle theme" className="h-9 w-9">
              <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </ShellIconButton>
            <ShellIconButton label="Sign out" onClick={onSignOut} className="h-9 w-9">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </ShellIconButton>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center gap-1.5">
              <ShellIconButton label="Collapse sidebar" onClick={toggleExpanded}>
                <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </ShellIconButton>
              <ShellIconButton label="Toggle theme">
                <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </ShellIconButton>
            </div>
            <ShellIconButton label="Sign out" onClick={onSignOut}>
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </ShellIconButton>
          </div>
        )}
      </div>
    </aside>
  );
}

export function sidebarOffsetPx(isMobile: boolean, expanded: boolean, _openMobile: boolean): string {
  if (isMobile) return '0px';
  return expanded ? SIDEBAR_EXPANDED : SIDEBAR_ICON;
}

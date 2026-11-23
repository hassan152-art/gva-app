import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  NAV_SECTION_TITLE,
  filterNavEntries,
  getNavEntries,
  isNavGroup,
  type NavItem,
  type NavGroup,
} from '@/lib/navConfig';
import { SHELL_NAV_IDLE } from '@/lib/chromeStyles';
import { cn } from '@/lib/utils';

type SidebarNavEntriesProps = {
  query: string;
  variant: 'drawer' | 'shell';
  showLabels: boolean;
  iconRail: boolean;
  onLeafNavigate?: () => void;
};

function groupOpenDefault(pathname: string, id: string): boolean {
  if (id === 'profiles') {
    return pathname.startsWith('/organization') || pathname.startsWith('/fop/sponsors');
  }
  return false;
}

export function SidebarNavEntries({
  query,
  variant,
  showLabels,
  iconRail,
  onLeafNavigate,
}: SidebarNavEntriesProps) {
  const { pathname } = useLocation();
  const entries = useMemo(() => filterNavEntries(getNavEntries(), query), [query]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups((prev) => {
      let next = prev;
      for (const entry of getNavEntries()) {
        if (!isNavGroup(entry)) continue;
        const shouldOpen = groupOpenDefault(pathname, entry.id) || query.trim().length > 0;
        if (shouldOpen && !prev[entry.id]) {
          next = { ...next, [entry.id]: true };
        }
      }
      return next;
    });
  }, [pathname, query]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const isDrawer = variant === 'drawer';

  function renderLeaf(item: NavItem) {
    return (
      <NavLink
        key={item.id}
        to={item.to}
        end={item.to === '/'}
        onClick={onLeafNavigate}
        className={({ isActive }) =>
          cn(
            'transition-colors',
            isDrawer
              ? cn(
                  'group relative flex w-full items-center gap-3 rounded-lg py-1 pl-2 pr-3 text-left text-[13px] font-medium',
                  isActive ? 'text-white' : 'text-white/90 hover:text-white',
                )
              : iconRail
                ? cn(
                    'flex h-11 w-full items-center justify-center border-b border-gva-hairline',
                    isActive ? 'bg-gva-tint text-gva-green-deep' : SHELL_NAV_IDLE,
                  )
                : cn(
                    'mx-2 my-0.5 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium',
                    isActive
                      ? 'bg-gva-green text-white shadow-[0_4px_12px_rgba(20,153,84,0.25)]'
                      : 'text-gva-ink-2 hover:bg-gva-canvas hover:text-gva-ink',
                  ),
          )
        }
        title={iconRail ? item.label : undefined}
      >
        {isDrawer ? (
          <>
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] transition-colors group-hover:bg-white/10">
              <item.icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
            </span>
            {showLabels ? (
              <span className="min-w-0 flex-1 truncate font-semibold">{item.label}</span>
            ) : null}
            {showLabels ? (
              <ChevronDown
                className="h-4 w-4 shrink-0 text-white/70"
                strokeWidth={2}
                aria-hidden
              />
            ) : null}
          </>
        ) : (
          <>
            <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
            {showLabels && !iconRail ? (
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            ) : null}
          </>
        )}
      </NavLink>
    );
  }

  function renderChild(child: NavItem) {
    return (
      <NavLink
        key={child.id}
        to={child.to}
        onClick={onLeafNavigate}
        className={({ isActive }) =>
          cn(
            'rounded-lg text-[13px] font-medium transition-colors',
            isDrawer
              ? cn(
                  'block w-full py-2 pl-3 pr-2',
                  isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white',
                )
              : cn(
                  'mx-2 block w-[calc(100%-1rem)] py-2 pl-11 pr-3 text-[14px]',
                  isActive
                    ? 'bg-gva-tint font-semibold text-gva-green-deep'
                    : 'text-gva-muted hover:bg-gva-canvas hover:text-gva-ink',
                ),
          )
        }
      >
        {child.label}
      </NavLink>
    );
  }

  function renderGroup(group: NavGroup) {
    const isOpen = Boolean(openGroups[group.id]);
    const childActive = group.children.some(
      (c) => pathname === c.to || pathname.startsWith(`${c.to}/`),
    );

    if (iconRail) {
      const first = group.children[0];
      if (first) {
        return renderLeaf({ ...first, id: `${group.id}-rail`, label: group.label, icon: group.icon });
      }
      return null;
    }

    return (
      <div key={group.id} className="w-full">
        <button
          type="button"
          onClick={() => toggleGroup(group.id)}
          className={cn(
            'flex w-full items-center gap-3 text-left transition-colors',
            isDrawer
              ? cn(
                  'rounded-lg py-1 pl-2 pr-3 text-[13px] font-medium',
                  childActive ? 'text-white' : 'text-white/90 hover:text-white',
                )
              : cn(
                  'mx-2 my-0.5 w-[calc(100%-1rem)] rounded-lg px-3 py-2.5 text-[15px] font-medium',
                  childActive ? 'bg-gva-canvas text-gva-ink' : 'text-gva-ink-2 hover:bg-gva-canvas hover:text-gva-ink',
                ),
          )}
          aria-expanded={isOpen}
        >
          {isDrawer ? (
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]">
              <group.icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
            </span>
          ) : (
            <group.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
          )}
          {showLabels ? (
            <>
              <span className={cn('min-w-0 flex-1 truncate', isDrawer && 'font-semibold')}>{group.label}</span>
              {isDrawer ? (
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 text-white/70 transition-transform', isOpen && 'rotate-180')}
                  strokeWidth={2}
                  aria-hidden
                />
              ) : (
                <ChevronRight
                  className={cn('h-4 w-4 shrink-0 text-gva-muted transition-transform', isOpen && 'rotate-90')}
                  strokeWidth={2}
                  aria-hidden
                />
              )}
            </>
          ) : null}
        </button>
        {isOpen && showLabels ? (
          <div
            className={cn(
              isDrawer
                ? 'mb-1 ml-5 flex flex-col gap-0.5 border-l border-white/15 pl-2'
                : 'flex flex-col gap-0.5 py-0.5',
            )}
          >
            {group.children.map((child) => renderChild(child))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {showLabels && !iconRail && !query.trim() ? (
        <p
          className={cn(
            'px-5 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em]',
            isDrawer ? 'text-white/60' : 'text-gva-muted-2',
          )}
        >
          {NAV_SECTION_TITLE}
        </p>
      ) : null}
      {entries.map((entry) => (isNavGroup(entry) ? renderGroup(entry) : renderLeaf(entry)))}
    </>
  );
}

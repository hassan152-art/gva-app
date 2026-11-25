import { FileBarChart, Home, MessageSquare, Receipt } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useSidebar } from '@/components/layout/SidebarProvider';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'home', label: 'Home', to: '/', icon: Home, end: true },
  { id: 'donation', label: 'Donation', to: '/fop/donation-collection', icon: Receipt, end: false },
  { id: 'chat', label: 'Chat', to: '/chat', icon: MessageSquare, end: false },
  { id: 'reports', label: 'Reports', to: '/reports', icon: FileBarChart, end: false },
] as const;

export function MobileBottomNav() {
  const { isMobile, openMobile } = useSidebar();
  if (!isMobile || openMobile) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gva-hairline bg-gva-surface md:hidden"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
      aria-label="Primary"
    >
      <ul className="grid h-[3.75rem] grid-cols-4">
        {TABS.map((tab) => (
          <li key={tab.id}>
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 px-1',
                  isActive ? 'text-gva-green' : 'text-gva-muted-2',
                )
              }
            >
              <tab.icon className="h-[22px] w-[22px] shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="text-[11px] font-semibold leading-none">{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

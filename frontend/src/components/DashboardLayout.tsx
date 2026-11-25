import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PageSkeletonForPath } from '@/components/skeletons/PageSkeletonForPath';
import { AppSidebar, sidebarOffsetPx } from '@/components/AppSidebar';
import { HeaderBar } from '@/components/HeaderBar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { QuickSearchProvider } from '@/components/layout/QuickSearchProvider';
import { SidebarProvider, useSidebar } from '@/components/layout/SidebarProvider';
import { titleForPath } from '@/lib/navConfig';
import { cn } from '@/lib/utils';

function LayoutContent() {
  const { pathname } = useLocation();
  const { isMobile, expanded, openMobile, setOpenMobile } = useSidebar();
  const marginLeft = sidebarOffsetPx(isMobile, expanded, openMobile);
  const title = titleForPath(pathname);

  return (
    <div className="flex min-h-dvh bg-gva-canvas">
      <AppSidebar />
      {/* Mobile: the drawer slides over the page; tapping the dimmed page closes it. */}
      {isMobile ? (
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={openMobile ? 0 : -1}
          onClick={() => setOpenMobile(false)}
          className={cn(
            'fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-[1px] transition-opacity duration-300',
            openMobile ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        />
      ) : null}

      <div
        className={cn(
          'relative flex min-h-dvh min-w-0 flex-1 flex-col bg-gva-canvas transition-[margin] duration-300 ease-in-out',
        )}
        style={{ marginLeft: isMobile ? undefined : marginLeft }}
      >
        <HeaderBar title={title} />
        <main className="flex-1 overflow-y-auto p-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
          <Suspense fallback={<PageSkeletonForPath pathname={pathname} />}>
            <Outlet />
          </Suspense>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <QuickSearchProvider>
        <LayoutContent />
      </QuickSearchProvider>
    </SidebarProvider>
  );
}

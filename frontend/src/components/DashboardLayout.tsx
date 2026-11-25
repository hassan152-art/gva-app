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
    <div
      className={cn(
        'flex min-h-dvh',
        isMobile && openMobile ? 'bg-gva-drawer' : 'bg-gva-canvas',
      )}
    >
      <AppSidebar />

      <div
        className={cn(
          'relative flex min-h-dvh min-w-0 flex-1 flex-col bg-gva-canvas transition-all duration-300 ease-in-out md:transform-none md:scale-100 md:rounded-none md:shadow-none',
          isMobile &&
            openMobile &&
            'origin-left translate-x-[15rem] scale-[0.92] overflow-hidden rounded-2xl shadow-2xl',
        )}
        style={{ marginLeft: isMobile ? undefined : marginLeft }}
      >
        {isMobile && openMobile ? (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpenMobile(false)}
            className="absolute inset-0 z-[60] cursor-default"
          />
        ) : null}
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

import { PageSkeletonFrame } from '@/components/ui/skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function HomePageSkeleton() {
  return (
    <PageSkeletonFrame label="Loading dashboard" className="mx-auto max-w-[1280px] space-y-4 md:space-y-6">
      <div className="hidden space-y-2 md:block">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="min-h-[108px] rounded-2xl" />
        ))}
      </div>

      <Skeleton className="h-[220px] rounded-2xl md:h-[200px]" />

      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        <Skeleton className="min-h-[280px] rounded-2xl" />
        <Skeleton className="min-h-[280px] rounded-2xl" />
      </div>
    </PageSkeletonFrame>
  );
}

import { PageSkeletonFrame } from '@/components/ui/skeleton';
import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder / hub pages using MobilePageShell layout. */
export function ShellPageSkeleton() {
  return (
    <PageSkeletonFrame
      label="Loading page"
      className="mx-auto w-full max-w-2xl"
    >
      <div className="mb-5 flex flex-col items-center md:mb-6 md:items-start">
        <Skeleton className="mb-3 h-10 w-40 md:hidden" />
        <Skeleton className="h-8 w-48 md:h-9 md:w-56" />
        <Skeleton className="mt-2 h-4 w-full max-w-md" />
        <Skeleton className="mt-1.5 h-4 w-[75%] max-w-sm" />
      </div>
      <Skeleton className="min-h-[160px] rounded-2xl md:min-h-[200px]" />
    </PageSkeletonFrame>
  );
}

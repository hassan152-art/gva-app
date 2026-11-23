import { PageSkeletonFrame } from '@/components/ui/skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function WelcomePageSkeleton() {
  return (
    <PageSkeletonFrame
      label="Loading welcome"
      className="flex min-h-dvh items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface p-8">
        <Skeleton className="mx-auto mb-6 h-12 w-44" />
        <Skeleton className="mx-auto mb-4 h-14 w-14 rounded-full" />
        <Skeleton className="mx-auto mb-2 h-7 w-56" />
        <Skeleton className="mx-auto mb-6 h-4 w-40" />
        <Skeleton className="h-12 w-full rounded-[var(--radius-button)]" />
        <Skeleton className="mt-3 h-12 w-full rounded-[var(--radius-button)]" />
      </div>
    </PageSkeletonFrame>
  );
}

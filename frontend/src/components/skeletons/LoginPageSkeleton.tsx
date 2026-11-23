import { PageSkeletonFrame } from '@/components/ui/skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function LoginPageSkeleton() {
  return (
    <PageSkeletonFrame
      label="Loading sign in"
      className="flex min-h-dvh flex-col md:flex-row"
    >
      <Skeleton className="hidden flex-1 md:block md:min-h-dvh md:max-w-[50%] md:rounded-none" />
      <div className="flex min-h-dvh flex-1 items-center justify-center px-5 py-10 md:px-12">
        <div className="w-full max-w-[400px] space-y-6">
          <Skeleton className="mx-auto h-12 w-48" />
          <div className="space-y-5">
            <div>
              <Skeleton className="mb-2 h-4 w-12" />
              <Skeleton className="h-12 w-full rounded-[var(--radius-input)]" />
            </div>
            <div>
              <Skeleton className="mb-2 h-4 w-16" />
              <Skeleton className="h-12 w-full rounded-[var(--radius-input)]" />
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full rounded-[var(--radius-button)]" />
          </div>
        </div>
      </div>
    </PageSkeletonFrame>
  );
}

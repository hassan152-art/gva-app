import { PageSkeletonFrame } from '@/components/ui/skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function ProfilePageSkeleton() {
  return (
    <PageSkeletonFrame label="Loading account details" className="mx-auto w-full max-w-md py-4">
      <div className="rounded-2xl border border-gva-hairline bg-gva-surface p-6 sm:p-7">
        <Skeleton className="mb-4 h-6 w-36" />
        <div className="flex flex-col items-center pb-2">
          <Skeleton className="h-28 w-28 rounded-full" />
          <Skeleton className="mt-2.5 h-3 w-36" />
        </div>
        <div className="mt-5 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-3 pt-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </PageSkeletonFrame>
  );
}

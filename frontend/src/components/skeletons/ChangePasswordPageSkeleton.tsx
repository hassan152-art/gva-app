import { PageSkeletonFrame } from '@/components/ui/skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function ChangePasswordPageSkeleton() {
  return (
    <PageSkeletonFrame label="Loading change password" className="mx-auto w-full max-w-lg">
      <Skeleton className="mb-2 h-8 w-52" />
      <Skeleton className="mb-6 h-4 w-full max-w-md" />
      <div className="rounded-2xl border border-gva-hairline bg-gva-surface p-6 md:p-8">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-12 w-full rounded-[var(--radius-input)]" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-12 w-full rounded-[var(--radius-button)]" />
      </div>
    </PageSkeletonFrame>
  );
}

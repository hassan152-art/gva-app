import { PageSkeletonFrame } from '@/components/ui/skeleton';
import { Skeleton } from '@/components/ui/skeleton';

type EntityEditorPageSkeletonProps = {
  label?: string;
  tabCount?: number;
  withPhoto?: boolean;
  fieldCount?: number;
};

export function EntityEditorPageSkeleton({
  label = 'Loading editor',
  tabCount = 4,
  withPhoto = false,
  fieldCount = 9,
}: EntityEditorPageSkeletonProps) {
  return (
    <PageSkeletonFrame label={label} className="mx-auto max-w-6xl pb-10">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48 md:h-9 md:w-56" />
        </div>
        <Skeleton className="h-11 w-28 rounded-lg" />
      </div>

      <div className="mb-4 flex min-w-max gap-4 border-b border-gva-hairline pb-3">
        {Array.from({ length: tabCount }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>

      <div className="rounded-2xl border border-gva-hairline bg-gva-surface p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] md:p-8">
        {withPhoto ? (
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start">
            <Skeleton className="aspect-square w-full max-w-[200px] shrink-0 rounded-xl" />
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: Math.min(fieldCount, 6) }).map((_, i) => (
                <FieldSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : null}

        <Skeleton className="mb-4 h-3 w-24" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: fieldCount }).map((_, i) => (
            <FieldSkeleton key={i} />
          ))}
        </div>
      </div>
    </PageSkeletonFrame>
  );
}

function FieldSkeleton() {
  return (
    <div>
      <Skeleton className="mb-1.5 h-3 w-20" />
      <Skeleton className="h-11 w-full rounded-[var(--radius-input)]" />
    </div>
  );
}

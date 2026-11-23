import { AdminTableSkeletonRows } from '@/components/skeletons/AdminTableSkeletonRows';
import { PageSkeletonFrame } from '@/components/ui/skeleton';
import { Skeleton } from '@/components/ui/skeleton';

type AdminListPageSkeletonProps = {
  label?: string;
  columns: number;
  filterCount?: number;
};

export function AdminListPageSkeleton({
  label = 'Loading records',
  columns,
  filterCount = 1,
}: AdminListPageSkeletonProps) {
  return (
    <PageSkeletonFrame label={label} className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 md:h-9 md:w-52" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-11 w-40 rounded-[var(--radius-button)]" />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        {Array.from({ length: filterCount }).map((_, i) => (
          <Skeleton
            key={i}
            className={cnFilterWidth(i, filterCount)}
          />
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gva-hairline bg-gva-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-gva-hairline bg-gva-canvas/80">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AdminTableSkeletonRows columns={columns} />
          </tbody>
        </table>
      </div>
    </PageSkeletonFrame>
  );
}

function cnFilterWidth(index: number, total: number) {
  if (total === 1) return 'h-12 w-full max-w-md rounded-lg';
  if (index === 0) return 'h-12 w-full max-w-xs rounded-lg';
  return 'h-12 w-40 rounded-lg';
}

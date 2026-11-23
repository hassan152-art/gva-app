import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type AdminTableSkeletonRowsProps = {
  columns: number;
  rows?: number;
};

export function AdminTableSkeletonRows({ columns, rows = 6 }: AdminTableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-gva-hairline/70 last:border-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <Skeleton
                className={cn(
                  'h-4',
                  colIndex === columns - 1
                    ? 'ml-auto h-8 w-20 rounded-lg'
                    : colIndex === 0
                      ? 'w-24'
                      : 'w-full max-w-[140px]',
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

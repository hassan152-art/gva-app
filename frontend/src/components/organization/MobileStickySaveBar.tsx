import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MobileStickySaveBarProps = {
  children: ReactNode;
  className?: string;
};

/** Fixed save/actions bar above the mobile bottom nav (Edspire-style forms). */
export function MobileStickySaveBar({ children, className }: MobileStickySaveBarProps) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 z-20 border-t border-gva-hairline bg-gva-surface/95 p-3 backdrop-blur-md',
        'bottom-[calc(3.75rem+env(safe-area-inset-bottom))] md:hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}

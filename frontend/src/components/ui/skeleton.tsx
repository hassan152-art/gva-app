import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gva-hairline/90 motion-reduce:animate-none motion-reduce:bg-gva-canvas',
        className,
      )}
      aria-hidden
      {...props}
    />
  );
}

type PageSkeletonFrameProps = {
  children: ReactNode;
  label?: string;
  className?: string;
};

/** Accessible wrapper for full-page loading placeholders. */
export function PageSkeletonFrame({
  children,
  label = 'Loading page',
  className,
}: PageSkeletonFrameProps) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

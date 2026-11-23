import { cn } from '@/lib/utils';
import type { LabelHTMLAttributes } from 'react';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-gva-muted-2',
        'font-[family-name:var(--font-label)]',
        className,
      )}
      {...props}
    />
  );
}

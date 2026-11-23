import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-12 w-full rounded-[var(--radius-input)] border bg-gva-surface px-4',
        'text-[15px] text-gva-ink placeholder:text-gva-muted-2',
        'transition-[border-color,box-shadow] focus-visible:outline-none',
        invalid
          ? 'border-gva-heart focus-visible:border-gva-heart focus-visible:ring-[3px] focus-visible:ring-gva-heart/15'
          : 'border-gva-hairline focus-visible:border-gva-green focus-visible:ring-[3px] focus-visible:ring-gva-green/12',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

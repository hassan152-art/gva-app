import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      loading = false,
      loadingLabel = 'Signing in…',
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isDisabled = Boolean(disabled || loading);

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        className={cn(
          'inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-button)]',
          'px-6 text-[15px] font-semibold text-white font-[family-name:var(--font-label)]',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          loading
            ? 'cursor-wait bg-gva-green-deep focus-visible:ring-gva-green/30'
            : 'bg-gva-green hover:bg-gva-green-deep focus-visible:ring-gva-green/30',
          isDisabled && !loading && 'pointer-events-none opacity-60',
          isDisabled && loading && 'pointer-events-none opacity-90',
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
            <span>{loadingLabel}</span>
            <span className="sr-only">Please wait</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = 'Button';

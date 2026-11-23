import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ShellIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
  variant?: 'light' | 'on-dark';
};

/** Edspire-style square icon control in the sidebar footer. */
export function ShellIconButton({
  children,
  label,
  variant = 'light',
  className,
  type = 'button',
  ...props
}: ShellIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors',
        variant === 'on-dark'
          ? 'border border-white/15 bg-white/5 text-white/90 hover:bg-white/10 hover:text-white'
          : 'border border-gva-hairline bg-gva-surface text-gva-ink-2 hover:bg-gva-canvas hover:text-gva-ink',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

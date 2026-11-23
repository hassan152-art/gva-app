import type { ReactNode } from 'react';
import { LogoLockup } from '@/components/LogoLockup';
import { cn } from '@/lib/utils';

type MobilePageShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

/** Page chrome: compact logo + title on mobile; title only on desktop. */
export function MobilePageShell({ title, subtitle, children, className }: MobilePageShellProps) {
  return (
    <div className={cn('mx-auto w-full max-w-2xl', className)}>
      <div className="mb-5 flex flex-col items-center text-center md:mb-6 md:items-start md:text-left">
        <LogoLockup
          width={160}
          className="mb-3 w-[min(160px,52vw)] md:hidden"
        />
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-gva-ink md:text-2xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-prose text-[14px] leading-relaxed text-gva-muted md:text-[15px]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

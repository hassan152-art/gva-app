import { cn } from '@/lib/utils';

type LogoLockupProps = {
  className?: string;
  width?: number;
  /** Light logo for dark panels; dark/default for light backgrounds */
  variant?: 'default' | 'on-dark';
};

/** Official 606×254 lockup — same asset as mobile `assets/logo.png`. */
export function LogoLockup({ className, width = 280, variant = 'default' }: LogoLockupProps) {
  const aspect = 254 / 606;
  const height = Math.round(width * aspect);

  const src = variant === 'on-dark' ? '/logo-white.png' : '/logo.png';

  return (
    <img
      src={src}
      alt="Gaza Virtual Adoption"
      width={width}
      height={height}
      className={cn('h-auto max-w-full object-contain', className)}
      decoding="async"
    />
  );
}

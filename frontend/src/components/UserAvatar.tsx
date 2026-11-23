import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { userInitials } from '@/lib/userInitials';

type UserAvatarProps = {
  fullName: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-11 w-11 text-sm',
  lg: 'h-28 w-28 text-3xl font-semibold',
} as const;

export function UserAvatar({ fullName, imageUrl, size = 'sm', className }: UserAvatarProps) {
  const initials = userInitials(fullName);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  if (imageUrl && !hasError) {
    return (
      <img
        src={imageUrl}
        alt=""
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setHasError(true)}
        className={cn(
          'shrink-0 rounded-full object-cover bg-gva-canvas',
          SIZE[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gva-canvas font-bold text-gva-ink-2',
        SIZE[size],
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}

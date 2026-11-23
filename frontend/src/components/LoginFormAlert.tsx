import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

type LoginFormAlertProps = {
  message: string;
  className?: string;
};

/** Full-width banner above sign-in fields (edspire-style). */
export function LoginFormAlert({ message, className }: LoginFormAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'mb-6 flex items-start gap-2.5 rounded-md border border-gva-heart/35 bg-red-50 px-3.5 py-3',
        className,
      )}
    >
      <CircleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-gva-heart" aria-hidden />
      <p className="text-[14px] leading-snug text-gva-heart">{message}</p>
    </div>
  );
}

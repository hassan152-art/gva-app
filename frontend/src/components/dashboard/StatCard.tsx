import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tint: 'mint' | 'green' | 'forest' | 'orange' | 'pink';
  sublabel?: string;
  compact?: boolean;
};

const TINT_BG = {
  mint: 'bg-gva-tint',
  green: 'bg-[#e8f7ef]',
  forest: 'bg-[#dcebe1]',
  orange: 'bg-[#fff4e8]',
  pink: 'bg-[#fce8f0]',
} as const;

const TINT_FG = {
  mint: 'text-gva-green',
  green: 'text-gva-green-deep',
  forest: 'text-gva-green-deep',
  orange: 'text-[#c2410c]',
  pink: 'text-[#db2777]',
} as const;

export function StatCard({ label, value, icon: Icon, tint, sublabel, compact }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-2xl border border-black/[0.04] shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        TINT_BG[tint],
        compact ? 'min-h-[108px] p-3.5' : 'min-h-[88px] p-4',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-xl bg-white/80',
            compact ? 'h-10 w-10' : 'h-9 w-9',
            TINT_FG[tint],
          )}
        >
          <Icon className={compact ? 'h-5 w-5' : 'h-[18px] w-[18px]'} strokeWidth={1.75} aria-hidden />
        </span>
      </div>
      <div className="mt-2">
        <p
          className={cn(
            'font-bold tabular-nums tracking-tight',
            TINT_FG[tint],
            compact ? 'text-3xl' : 'text-2xl',
          )}
        >
          {value}
        </p>
        <p
          className={cn(
            'font-semibold text-gva-ink-2',
            compact ? 'text-[13px] leading-tight' : 'text-[13px]',
          )}
        >
          {label}
        </p>
        {sublabel ? <p className="mt-0.5 text-[11px] text-gva-muted">{sublabel}</p> : null}
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
};

export function Checkbox({ checked, onCheckedChange, id, className, disabled }: CheckboxProps) {
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
        checked ? 'border-gva-green bg-gva-green text-white' : 'border-gva-muted-2/60 bg-white',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
    </button>
  );
}

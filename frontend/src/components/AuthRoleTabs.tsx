import { cn } from '@/lib/utils';

export type AuthRole = 'admin' | 'sponsor' | 'volunteer';

const ROLES: { id: AuthRole; label: string }[] = [
  { id: 'admin', label: 'Admin' },
  { id: 'sponsor', label: 'Sponsor' },
  { id: 'volunteer', label: 'Volunteer' },
];

type AuthRoleTabsProps = {
  value: AuthRole;
  onChange: (role: AuthRole) => void;
  className?: string;
  disabled?: boolean;
};

export function AuthRoleTabs({ value, onChange, className, disabled }: AuthRoleTabsProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-3 overflow-hidden rounded-lg border border-gva-hairline bg-gva-surface',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
      role="tablist"
      aria-label="Sign in as"
    >
      {ROLES.map((role) => {
        const selected = value === role.id;
        return (
          <button
            key={role.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(role.id)}
            className={cn(
              'relative py-3 text-[14px] font-semibold transition-colors font-[family-name:var(--font-label)]',
              selected ? 'text-gva-green-deep' : 'text-gva-muted hover:text-gva-ink-2',
            )}
          >
            {role.label}
            {selected ? (
              <span
                className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gva-green"
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function demoEmailForRole(role: AuthRole): string {
  switch (role) {
    case 'admin':
      return 'rauf@appick.com';
    case 'volunteer':
      return 'fardeen@gazavirtualadoption.org';
    default:
      return 'fardeen@gazavirtualadoption.org';
  }
}

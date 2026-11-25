import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/** Small shared UI bits for the Mobile App admin pages. */

export const field =
  'h-10 w-full rounded-lg border border-gva-hairline bg-gva-surface px-3 text-sm text-gva-ink outline-none focus:border-gva-green focus:ring-2 focus:ring-gva-green/20';
export const textarea =
  'w-full rounded-lg border border-gva-hairline bg-gva-surface px-3 py-2 text-sm text-gva-ink outline-none focus:border-gva-green focus:ring-2 focus:ring-gva-green/20';
export const btn =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gva-hairline bg-gva-surface px-3.5 text-sm font-semibold text-gva-ink hover:bg-gva-canvas disabled:opacity-50';
export const btnSm =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gva-hairline bg-gva-surface px-2.5 text-xs font-semibold text-gva-ink hover:bg-gva-canvas disabled:opacity-50';
export const btnDark =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50';
export const btnGreen =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gva-green px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50';
export const btnRose =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 text-sm font-semibold text-rose-700 hover:opacity-90 disabled:opacity-50';

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-[2px] md:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={cn('w-full rounded-2xl bg-gva-surface p-5 shadow-2xl', wide ? 'max-w-2xl' : 'max-w-md')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gva-ink">{title}</h2>
            {subtitle ? <p className="text-xs text-gva-muted">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gva-muted hover:text-gva-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cn('block space-y-1 text-xs font-semibold text-gva-ink-2', className)}>{children}</label>;
}

export function LoadingBlock() {
  return (
    <div className="flex h-48 items-center justify-center rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface text-gva-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

export function Notice({
  tone,
  children,
  onClose,
}: {
  tone: 'success' | 'error';
  children: ReactNode;
  onClose?: () => void;
}) {
  const Icon = tone === 'success' ? CheckCircle2 : XCircle;
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm',
        tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-rose-200 bg-rose-50 text-rose-700',
      )}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
      {onClose ? (
        <button type="button" onClick={onClose} className="rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: typeof X; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-gva-hairline bg-gva-surface px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gva-tint text-gva-green-deep">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-base font-bold text-gva-ink">{title}</p>
      {text ? <p className="mt-1 max-w-sm text-sm text-gva-muted">{text}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

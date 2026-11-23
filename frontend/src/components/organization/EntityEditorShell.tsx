import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MobileStickySaveBar } from '@/components/organization/MobileStickySaveBar';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import { cn } from '@/lib/utils';

export type EditorTab = {
  id: string;
  label: string;
  icon?: ReactNode;
};

type EntityEditorShellProps = {
  breadcrumbs: { label: string; to?: string }[];
  title: string;
  backTo: string;
  tabs: EditorTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onSave: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  children: ReactNode;
};

export function EntityEditorShell({
  breadcrumbs,
  title,
  backTo,
  tabs,
  activeTab,
  onTabChange,
  onSave,
  saving,
  saveDisabled,
  children,
}: EntityEditorShellProps) {
  useMobilePageChrome({ title, backTo });

  return (
    <div className="mx-auto max-w-6xl pb-28 md:pb-10">
      <nav
        className="mb-4 hidden flex-wrap items-center gap-1 text-sm text-gva-muted md:flex"
        aria-label="Breadcrumb"
      >
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.label} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3.5 w-3.5" aria-hidden /> : null}
            {crumb.to ? (
              <Link to={crumb.to} className="hover:text-gva-ink">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-gva-ink-2">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="mb-4 hidden flex-wrap items-center justify-between gap-4 md:flex">
        <div className="flex items-center gap-3">
          <Link
            to={backTo}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gva-hairline text-gva-ink-2 hover:bg-gva-canvas"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-gva-ink md:text-2xl">{title}</h1>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled || saving}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#151b3d] px-5 text-sm font-semibold text-white hover:bg-[#151b3d]/90 disabled:opacity-60"
        >
          <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="-mx-1 mb-4 overflow-x-auto border-b border-gva-hairline px-1 scrollbar-thin">
        <div className="flex min-w-max gap-0.5 pb-px">
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold transition-colors sm:gap-2 sm:px-4 sm:py-3 sm:text-sm',
                  active ? 'text-[#151b3d]' : 'text-gva-muted hover:text-gva-ink-2',
                )}
              >
                {tab.icon}
                {tab.label}
                {active ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#151b3d]" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gva-hairline bg-gva-surface p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:p-5 md:p-8">
        {children}
      </div>

      <MobileStickySaveBar>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled || saving}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#151b3d] text-[15px] font-semibold text-white hover:bg-[#151b3d]/90 disabled:opacity-60"
        >
          <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </MobileStickySaveBar>
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 border-t border-gva-hairline pt-6 first:mt-0 first:border-0 first:pt-0">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gva-ink">{title}</h2>
      {children}
    </section>
  );
}

export function FormGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const colClass =
    cols === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : cols === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-2 lg:grid-cols-3';
  return <div className={cn('grid gap-4', colClass)}>{children}</div>;
}

export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-gva-muted">
      {children}
      {required ? <span className="text-gva-heart"> *</span> : null}
    </label>
  );
}

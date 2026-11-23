import { ChevronDown, MoreHorizontal, Plus } from 'lucide-react';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FieldLabel } from '@/components/organization/EntityEditorShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { createAdminSponsor, listAdminSponsors, type AdminSponsor } from '@/lib/adminApi';
import { cn } from '@/lib/utils';

type SponsorSelectFieldProps = {
  value: AdminSponsor | null;
  onChange: (next: AdminSponsor | null) => void;
  disabled?: boolean;
  onNotice?: (message: string | null) => void;
};

export function SponsorSelectField({
  value,
  onChange,
  disabled,
  onNotice,
}: SponsorSelectFieldProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelSearch, setPanelSearch] = useState('');
  const [options, setOptions] = useState<AdminSponsor[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newSponsor, setNewSponsor] = useState({ fullName: '', email: '', phone: '' });

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setLoading(true);
      listAdminSponsors(panelSearch.trim())
        .then((res) => setOptions(res.sponsors))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(t);
  }, [open, panelSearch]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setMenuId(null);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function openAddPanel() {
    setShowAdd(true);
    setOpen(false);
    setAddError(null);
    setNewSponsor({
      fullName: panelSearch.trim(),
      email: panelSearch.includes('@') ? panelSearch.trim() : '',
      phone: '',
    });
  }

  async function submitNewSponsor(e: FormEvent) {
    e.preventDefault();
    if (creating || disabled) return;
    setAddError(null);
    setCreating(true);
    try {
      const res = await createAdminSponsor({
        fullName: newSponsor.fullName.trim(),
        email: newSponsor.email.trim(),
        phone: newSponsor.phone.trim() || undefined,
      });
      onChange(res.sponsor);
      setShowAdd(false);
      onNotice?.(
        `${res.message}. Temporary password: ${res.tempPassword} (share with the sponsor once).`,
      );
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not create sponsor');
    } finally {
      setCreating(false);
    }
  }

  function pick(opt: AdminSponsor | null) {
    onChange(opt);
    setOpen(false);
    setPanelSearch('');
    setMenuId(null);
  }

  return (
    <div ref={rootRef} className="relative">
      <FieldLabel htmlFor={listId}>Sponsor</FieldLabel>
      <div className="flex gap-2">
        <button
          id={listId}
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => {
            if (disabled) return;
            setShowAdd(false);
            setOpen((v) => !v);
          }}
          className={cn(
            'flex h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-gva-hairline',
            'bg-gva-canvas/80 px-3 text-left text-sm transition-colors hover:bg-gva-canvas',
            disabled && 'opacity-60',
          )}
        >
          <span className={cn('truncate', value ? 'font-medium text-gva-ink' : 'text-gva-muted')}>
            {value ? value.fullName : 'Select sponsor…'}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-gva-muted transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={openAddPanel}
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gva-hairline',
            'bg-gva-surface text-gva-ink-2 hover:bg-gva-canvas disabled:opacity-60',
          )}
          aria-label="Add new sponsor"
          title="Add new sponsor"
        >
          <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      {open ? (
        <div className="absolute z-30 mt-1 w-full min-w-[280px] overflow-hidden rounded-xl border border-gva-hairline bg-gva-surface shadow-lg">
          <div className="border-b border-gva-hairline p-2">
            <Input
              value={panelSearch}
              onChange={(e) => setPanelSearch(e.target.value)}
              placeholder="Search sponsor…"
              autoComplete="off"
              className="h-10 bg-gva-canvas/80"
              autoFocus
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1" role="listbox">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="px-3 py-2.5">
                  <Skeleton className="mb-1.5 h-4 w-3/4 max-w-[200px]" />
                  <Skeleton className="h-3 w-1/2 max-w-[160px]" />
                </li>
              ))
            ) : (
              <>
                <li>
                  <button
                    type="button"
                    className="flex w-full px-3 py-2.5 text-left text-sm text-gva-muted hover:bg-gva-canvas"
                    onClick={() => pick(null)}
                  >
                    No sponsor
                  </button>
                </li>
                {options.map((opt) => (
                  <li key={opt.id} className="relative flex items-center">
                    <button
                      type="button"
                      role="option"
                      aria-selected={value?.id === opt.id}
                      className={cn(
                        'min-w-0 flex-1 px-3 py-2.5 text-left text-sm hover:bg-gva-canvas',
                        value?.id === opt.id && 'bg-gva-tint/40 font-semibold text-gva-ink',
                      )}
                      onClick={() => pick(opt)}
                    >
                      <span className="block truncate">{opt.fullName}</span>
                      <span className="block truncate text-xs font-normal text-gva-muted">
                        {opt.email}
                      </span>
                    </button>
                    <div className="relative shrink-0 pr-1">
                      <button
                        type="button"
                        className="rounded-md p-2 text-gva-muted hover:bg-gva-canvas hover:text-gva-ink"
                        aria-label={`Actions for ${opt.fullName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuId((id) => (id === opt.id ? null : opt.id));
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </button>
                      {menuId === opt.id ? (
                        <div className="absolute right-0 top-full z-10 mt-0.5 min-w-[9rem] rounded-lg border border-gva-hairline bg-gva-surface py-1 shadow-md">
                          <Link
                            to={`/organization/sponsors/${opt.id}/edit`}
                            className="block px-3 py-2 text-sm font-medium text-gva-ink hover:bg-gva-canvas"
                            onClick={() => setOpen(false)}
                          >
                            Edit sponsor
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
                {!loading && options.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-gva-muted">No sponsors found</li>
                ) : null}
              </>
            )}
          </ul>
        </div>
      ) : null}

      {showAdd ? (
        <form
          onSubmit={submitNewSponsor}
          className="mt-3 space-y-3 rounded-xl border border-gva-hairline bg-gva-canvas/60 p-4"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-gva-muted">New sponsor</p>
          <div>
            <Label htmlFor="org-new-sponsor-name" className="mb-1 text-xs text-gva-muted">
              Full name
            </Label>
            <Input
              id="org-new-sponsor-name"
              value={newSponsor.fullName}
              onChange={(e) => setNewSponsor((s) => ({ ...s, fullName: e.target.value }))}
              required
              className="h-10 bg-gva-surface"
            />
          </div>
          <div>
            <Label htmlFor="org-new-sponsor-email" className="mb-1 text-xs text-gva-muted">
              Email
            </Label>
            <Input
              id="org-new-sponsor-email"
              type="email"
              value={newSponsor.email}
              onChange={(e) => setNewSponsor((s) => ({ ...s, email: e.target.value }))}
              required
              className="h-10 bg-gva-surface"
            />
          </div>
          <div>
            <Label htmlFor="org-new-sponsor-phone" className="mb-1 text-xs text-gva-muted">
              Phone (optional)
            </Label>
            <Input
              id="org-new-sponsor-phone"
              type="tel"
              value={newSponsor.phone}
              onChange={(e) => setNewSponsor((s) => ({ ...s, phone: e.target.value }))}
              className="h-10 bg-gva-surface"
            />
          </div>
          {addError ? (
            <p className="text-sm text-gva-heart" role="alert">
              {addError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" loading={creating} loadingLabel="Creating…" className="h-10 flex-1">
              Create sponsor
            </Button>
            <button
              type="button"
              className="rounded-lg border border-gva-hairline px-4 text-sm font-semibold"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

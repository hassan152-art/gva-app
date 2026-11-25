import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { donationApi, type SponsorOption } from '@/lib/donationApi';
import { cn } from '@/lib/utils';

/**
 * Pick the FOP sponsor (donor, SP601 …) who pays this orphan's kafalat.
 * value = sponsor code or '' for none.
 */
export function FopSponsorPicker({
  value,
  label,
  onChange,
  disabled,
}: {
  value: string;
  label: string | null;
  onChange: (code: string, label: string | null) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<SponsorOption[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      donationApi
        .sponsorOptions(q.trim())
        .then((r) => setOpts(r.sponsors))
        .catch(() => setOpts([]));
    }, 200);
    return () => window.clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={box} className="relative">
      <p className="mb-1.5 text-sm font-medium text-gva-ink">Sponsor (donor)</p>
      {value ? (
        <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-gva-hairline bg-gva-canvas/80 px-3 text-sm">
          <span className="truncate">
            <span className="mr-2 font-mono text-xs font-bold text-gva-muted">{value}</span>
            {label && label !== value ? label : ''}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('', null)}
            className="rounded p-0.5 text-gva-muted hover:text-rose-600"
            aria-label="Remove sponsor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gva-muted" />
          <input
            value={q}
            disabled={disabled}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search sponsor by name, code or phone"
            className="h-10 w-full rounded-lg border border-gva-hairline bg-gva-canvas/80 pl-9 pr-3 text-sm outline-none focus:border-gva-green"
          />
        </div>
      )}
      {open && !value ? (
        <div className="absolute left-0 right-0 top-[4.5rem] z-30 max-h-64 overflow-y-auto rounded-xl border border-gva-hairline bg-gva-surface p-1 shadow-xl">
          {opts.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gva-muted">No sponsor found — add one under Donation Collection → Add sponsor.</p>
          ) : (
            opts.map((o) => (
              <button
                key={o.code}
                type="button"
                onClick={() => {
                  onChange(o.code, o.name);
                  setOpen(false);
                  setQ('');
                }}
                className={cn('flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-gva-canvas')}
              >
                <span className="text-sm font-semibold text-gva-ink">{o.name}</span>
                <span className="text-xs text-gva-muted">
                  {o.code} · {o.children} child{o.children === 1 ? '' : 'ren'}
                  {o.phone ? ` · ${o.phone}` : ''}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
      <p className="mt-1 text-xs text-gva-muted">Every month this child's kafalat invoice goes to this sponsor.</p>
    </div>
  );
}

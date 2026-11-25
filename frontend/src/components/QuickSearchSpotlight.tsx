import { Heart, Loader2, Search, UserRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  filterQuickSearchItems,
  getQuickSearchItems,
  groupQuickSearchItems,
  type QuickSearchItem,
} from '@/lib/quickSearch';
import { cn } from '@/lib/utils';
import { listAdminOrphans } from '@/lib/adminApi';
import { ChildAvatar } from '@/components/kafalat/KafalatBits';
import { donationApi } from '@/lib/donationApi';

type ResultItem = QuickSearchItem & { sub?: string; photoUrl?: string | null; avatarName?: string };

type QuickSearchSpotlightProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ResultRow({
  item,
  selected,
  onSelect,
  onHover,
}: {
  item: ResultItem;
  selected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={cn(
        'mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
        selected ? 'bg-gva-green/12 ring-1 ring-gva-green/25' : 'hover:bg-gva-canvas/90',
      )}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      {item.avatarName ? (
        <ChildAvatar name={item.avatarName} photoUrl={item.photoUrl} size="md" />
      ) : (
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            selected ? 'bg-gva-green/15 text-gva-green-deep' : 'bg-gva-canvas text-gva-green-deep',
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-gva-ink">{item.label}</span>
        {item.sub || !selected ? (
          <span className="block truncate text-xs text-gva-muted">{item.sub ?? item.to}</span>
        ) : null}
      </span>
    </button>
  );
}

export function QuickSearchSpotlight({ open, onOpenChange }: QuickSearchSpotlightProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const allItems = useMemo(() => getQuickSearchItems(), [open]);
  const [records, setRecords] = useState<ResultItem[]>([]);
  const [searching, setSearching] = useState(false);

  // Live records: orphans (code / name) and sponsors (name / code / phone).
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setRecords([]);
      return;
    }
    let alive = true;
    const t = window.setTimeout(async () => {
      setSearching(true);
      const [orphans, sponsors] = await Promise.all([
        listAdminOrphans({ kind: 'orphan', q, pageSize: 8 }).then((r) => r.orphans).catch(() => []),
        donationApi.sponsorOptions(q).then((r) => r.sponsors).catch(() => []),
      ]);
      if (!alive) return;
      setRecords([
        ...orphans.slice(0, 8).map((o) => ({
          id: `orphan-${o.id}`,
          label: `${o.code ?? ''} · ${o.nameEn || o.nameAr || 'Orphan'}`,
          to: `/organization/orphans/${o.id}`,
          group: 'Orphans',
          icon: Heart,
          keywords: '',
          sub: o.rosterSponsor ? `Sponsor: ${o.rosterSponsor.name} (${o.rosterSponsor.code})` : 'No sponsor',
          photoUrl: o.photoThumbnailUrl ?? o.photoUrl,
          avatarName: o.nameEn || o.nameAr || o.code || '?',
        })),
        ...sponsors.slice(0, 8).map((sp) => ({
          id: `sponsor-${sp.code}`,
          label: `${sp.name} · ${sp.code}`,
          to: `/fop/donation-collection?sponsor=${encodeURIComponent(sp.code)}`,
          group: 'Sponsors',
          icon: UserRound,
          keywords: '',
          avatarName: sp.name,
          sub: `${sp.children} child${sp.children === 1 ? '' : 'ren'}${sp.phone ? ` · ${sp.phone}` : ''} · open donation collection`,
        })),
      ]);
      setSearching(false);
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query, open]);

  const filtered = useMemo<ResultItem[]>(
    () => [...records, ...filterQuickSearchItems(allItems, query)],
    [allItems, query, records],
  );
  const grouped = useMemo(
    () => (query.trim() && !records.length ? null : (groupQuickSearchItems(filtered) as [string, ResultItem[]][])),
    [filtered, query, records.length],
  );

  // Keyboard order must match what is on screen (grouped or flat).
  const ordered = useMemo(() => (grouped ? grouped.flatMap(([, items]) => items) : filtered), [grouped, filtered]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function go(item: ResultItem) {
    onOpenChange(false);
    navigate(item.to);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (ordered.length ? (i + 1) % ordered.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (ordered.length ? (i - 1 + ordered.length) % ordered.length : 0));
      return;
    }
    if (e.key === 'Enter' && ordered[activeIndex]) {
      e.preventDefault();
      go(ordered[activeIndex]);
    }
  }

  if (!open) return null;

  let rowIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:items-start md:pt-[10vh]"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#151b3d]/50 backdrop-blur-2xl backdrop-saturate-150 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
        aria-label="Close search"
        onClick={() => onOpenChange(false)}
      />

      <div
        className={cn(
          'relative z-[1] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/25',
          'bg-white/95 shadow-[0_28px_100px_rgba(15,23,42,0.35)] ring-1 ring-black/5',
          'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Quick search"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-gva-hairline/80 px-5 py-4">
          <Search className="h-5 w-5 shrink-0 text-gva-muted" strokeWidth={1.75} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orphan (OR015), sponsor (name / SP601 / phone) or a page…"
            className="min-w-0 flex-1 bg-transparent text-base text-gva-ink placeholder:text-gva-muted-2 focus:outline-none"
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="quick-search-results"
          />
          <kbd className="hidden shrink-0 rounded-md border border-gva-hairline bg-gva-canvas/80 px-2 py-1 text-[11px] font-medium text-gva-muted sm:inline">
            Esc
          </kbd>
        </div>

        <div
          id="quick-search-results"
          className="max-h-[min(58vh,380px)] overflow-y-auto overscroll-contain py-2"
          role="listbox"
        >
          {searching && filtered.length === 0 ? (
            <p className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-gva-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gva-muted">No matches found</p>
          ) : grouped ? (
            grouped.map(([group, items]) => (
              <div key={group} className="pb-1">
                <p className="px-5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-gva-muted">
                  {group}
                </p>
                <ul>
                  {items.map((item) => {
                    const index = rowIndex++;
                    const selected = index === activeIndex;
                    return (
                      <li key={item.id} role="option" aria-selected={selected}>
                        <ResultRow
                          item={item}
                          selected={selected}
                          onSelect={() => go(item)}
                          onHover={() => setActiveIndex(index)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          ) : (
            <ul>
              {filtered.map((item, index) => (
                <li key={item.id} role="option" aria-selected={index === activeIndex}>
                  <ResultRow
                    item={item}
                    selected={index === activeIndex}
                    onSelect={() => go(item)}
                    onHover={() => setActiveIndex(index)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gva-hairline/80 bg-gva-canvas/50 px-5 py-2.5 text-[11px] text-gva-muted">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-gva-hairline bg-gva-surface px-1.5 py-0.5">↑</kbd>
            <kbd className="rounded border border-gva-hairline bg-gva-surface px-1.5 py-0.5">↓</kbd>
            <span>to navigate</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-gva-hairline bg-gva-surface px-1.5 py-0.5">↵</kbd>
            <span>to open</span>
          </span>
          <span className="hidden sm:flex sm:items-center sm:gap-1.5">
            <kbd className="rounded border border-gva-hairline bg-gva-surface px-1.5 py-0.5">⇧</kbd>
            <kbd className="rounded border border-gva-hairline bg-gva-surface px-1.5 py-0.5">S</kbd>
            <span className="text-[10px] text-gva-muted-2">or</span>
            <kbd className="rounded border border-gva-hairline bg-gva-surface px-1.5 py-0.5">⌘</kbd>
            <kbd className="rounded border border-gva-hairline bg-gva-surface px-1.5 py-0.5">K</kbd>
            <span>toggle</span>
          </span>
        </div>
      </div>
    </div>
  );
}

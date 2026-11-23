import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { WhatsAppPhone } from '@/components/WhatsAppPhone';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobilePageChrome } from '@/hooks/useMobilePageChrome';
import { deleteAdminOrganization, listAdminOrganizations, type OrganizationRecord } from '@/lib/adminApi';
import { cn } from '@/lib/utils';

type SortKey = 'name' | 'type' | 'email' | 'address' | 'phone';
const PAGE_SIZES = [10, 25, 50];

export function OrganizationsPage() {
  useMobilePageChrome({ title: 'Organizations', backTo: '/' });
  const [filter, setFilter] = useState('');
  const [rows, setRows] = useState<OrganizationRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listAdminOrganizations(filter);
      setRows(res.organizations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load organizations');
    }
  }, [filter]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  useEffect(() => setPage(1), [filter, pageSize, sort]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    if (!sort) return rows;
    const val = (r: OrganizationRecord) => String((sort.key === 'type' ? r.type : r[sort.key]) ?? '').toLowerCase();
    return [...rows].sort((a, b) => val(a).localeCompare(val(b)) * sort.dir);
  }, [rows, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const start = (page - 1) * pageSize;
  const shown = sorted.slice(start, start + pageSize);

  function toggleSort(key: SortKey) {
    setSort((cur) => (!cur || cur.key !== key ? { key, dir: 1 } : cur.dir === 1 ? { key, dir: -1 } : null));
  }

  async function remove(row: OrganizationRecord) {
    if (!window.confirm(`Delete ${row.name}?`)) return;
    try {
      const res = await deleteAdminOrganization(row.id);
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const Th = ({ k, children }: { k: SortKey; children: string }) => {
    const active = sort?.key === k;
    const Icon = !active ? ArrowUpDown : sort!.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <th className="px-4 py-3">
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className={cn('inline-flex items-center gap-1 uppercase', active ? 'text-gva-green-deep' : 'hover:text-gva-ink')}
          title={`Click to sort ${active && sort!.dir === 1 ? 'descending' : 'ascending'}`}
        >
          {children}
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </button>
      </th>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-gva-ink md:text-2xl">Organizations</h1>
          <p className="mt-1 text-sm text-gva-muted">Partner organizations and individuals who bring sponsors.</p>
        </div>
        <Link
          to="/organization/organizations/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gva-green px-4 text-sm font-semibold text-white hover:bg-gva-green-deep"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add organization
        </Link>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}

      <section className="rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gva-hairline p-4">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gva-muted" aria-hidden />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search Organizations..."
              className="h-10 w-full rounded-lg border border-gva-hairline bg-gva-surface pl-9 pr-3 text-sm outline-none focus:border-gva-green"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gva-muted">
            Show
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-9 rounded-lg border border-gva-hairline px-2 text-sm text-gva-ink">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-gva-hairline bg-gva-canvas/80 text-xs font-bold tracking-wide text-gva-muted">
              <tr>
                <th className="w-16 px-4 py-3 uppercase">S.No</th>
                <Th k="name">Name</Th>
                <Th k="type">Type</Th>
                <Th k="email">Email</Th>
                <Th k="address">Address</Th>
                <Th k="phone">Phone #</Th>
                <th className="px-4 py-3 text-center uppercase">Orphans</th>
                <th className="px-4 py-3 text-right uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!rows ? (
                <tr><td colSpan={8} className="p-4"><Skeleton className="h-40 w-full" /></td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gva-muted">No organizations found</td></tr>
              ) : (
                shown.map((row, i) => (
                  <tr key={row.id} className="border-b border-gva-hairline/70 last:border-0 hover:bg-gva-canvas/50">
                    <td className="px-4 py-3 text-gva-muted">{start + i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gva-ink">{row.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                          row.type === 'individual' ? 'bg-sky-50 text-sky-700' : 'bg-gva-tint text-gva-green-deep',
                        )}
                      >
                        {row.type ?? 'organization'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gva-ink-2">{row.email || '—'}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-gva-ink-2" title={row.address ?? ''}>{row.address || '—'}</td>
                    <td className="px-4 py-3 text-gva-ink-2"><WhatsAppPhone phone={row.phone} /></td>
                    <td className="px-4 py-3 text-center font-semibold tabular-nums text-gva-ink-2">{row.orphanCount || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link to={`/organization/organizations/${row.id}/edit`} className="rounded-lg p-2 text-gva-ink-2 hover:bg-gva-canvas" aria-label={`Edit ${row.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button type="button" className="rounded-lg p-2 text-gva-heart hover:bg-red-50" aria-label={`Delete ${row.name}`} onClick={() => remove(row)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gva-hairline p-4 text-sm">
          <p className="text-gva-muted">
            Showing {sorted.length ? start + 1 : 0} to {Math.min(start + pageSize, sorted.length)} of {sorted.length} entries
          </p>
          <div className="flex items-center gap-1">
            <PageBtn label="First page" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></PageBtn>
            <PageBtn label="Previous page" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></PageBtn>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((n) => Math.abs(n - page) <= 2 || n === 1 || n === pages)
              .map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn('h-8 min-w-8 rounded-lg px-2 font-semibold', n === page ? 'bg-gva-green text-white' : 'hover:bg-gva-canvas')}
                  aria-current={n === page ? 'page' : undefined}
                >
                  {n}
                </button>
              ))}
            <PageBtn label="Next page" disabled={page === pages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></PageBtn>
            <PageBtn label="Last page" disabled={page === pages} onClick={() => setPage(pages)}><ChevronsRight className="h-4 w-4" /></PageBtn>
          </div>
        </div>
      </section>
    </div>
  );
}

function PageBtn({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gva-canvas disabled:opacity-30">
      {children}
    </button>
  );
}

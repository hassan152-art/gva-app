import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AdminMobileRecordCard,
  StatusPill,
} from '@/components/organization/AdminMobileRecordCard';
import { AdminListPageLayout } from '@/components/organization/AdminListPageLayout';
import { AdminListPageSkeleton } from '@/components/skeletons/AdminListPageSkeleton';
import { AdminTableSkeletonRows } from '@/components/skeletons/AdminTableSkeletonRows';
import { Input } from '@/components/ui/input';
import { deleteAdminOrphan, listAdminOrphans } from '@/lib/adminApi';
import type { OrphanProfile } from '@/lib/api';

type RecordsPageProps = {
  kind: 'orphan' | 'student';
  title: string;
};

export function RecordsPage({ kind, title }: RecordsPageProps) {
  const basePath = kind === 'student' ? '/organization/students' : '/organization/orphans';
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'waiting' | 'sponsored' | ''>('');
  const [rows, setRows] = useState<OrphanProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminOrphans({ kind, status: statusFilter, q: filter });
      setRows(res.orphans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load records');
    } finally {
      setLoading(false);
    }
  }, [filter, statusFilter, kind]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  async function remove(row: OrphanProfile) {
    const label = row.code || row.nameEn || row.id;
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      const res = await deleteAdminOrphan(row.id);
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function rowStatus(row: OrphanProfile): 'waiting' | 'sponsored' {
    return row.status === 'sponsored' || row.sponsor ? 'sponsored' : 'waiting';
  }

  const addLabel = kind === 'student' ? 'Add student' : 'Add orphan';

  if (loading && rows.length === 0) {
    return (
      <AdminListPageSkeleton
        label={`Loading ${title.toLowerCase()}`}
        columns={5}
        filterCount={2}
      />
    );
  }

  const alerts = (
    <>
      {error ? (
        <p className="mb-3 text-sm text-gva-heart" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mb-3 text-sm text-gva-green-deep" role="status">
          {message}
        </p>
      ) : null}
    </>
  );

  const filterArea = (
    <>
      <Input
        placeholder="Search code, name, ID…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full bg-gva-surface md:max-w-xs"
      />
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        className="h-12 w-full rounded-lg border border-gva-hairline bg-gva-surface px-3 text-sm text-gva-ink md:w-auto"
      >
        <option value="">All statuses</option>
        <option value="waiting">Waiting</option>
        <option value="sponsored">Sponsored</option>
      </select>
    </>
  );

  const actionButtons = (row: OrphanProfile) => (
    <>
      <Link
        to={`${basePath}/${row.id}`}
        className="rounded-lg p-2 text-gva-green-deep hover:bg-gva-tint"
        aria-label="View profile"
        title="View profile & donations"
      >
        <Eye className="h-4 w-4" />
      </Link>
      <Link
        to={`${basePath}/${row.id}/edit`}
        className="rounded-lg p-2 hover:bg-gva-canvas"
        aria-label="Edit"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        className="rounded-lg p-2 text-gva-heart hover:bg-red-50"
        aria-label="Delete"
        onClick={() => remove(row)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </>
  );

  const desktopTable = (
    <div className="overflow-x-auto rounded-xl border border-gva-hairline bg-gva-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-gva-hairline bg-gva-canvas/80 text-xs font-bold uppercase tracking-wide text-gva-muted">
          <tr>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Sponsor</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <AdminTableSkeletonRows columns={5} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gva-muted">
                No records found
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-gva-hairline/70 last:border-0">
                <td className="px-4 py-3 font-mono text-xs font-semibold">{row.code ?? '—'}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`${basePath}/${row.id}`}
                    className="font-semibold text-gva-ink hover:text-gva-green-deep hover:underline"
                  >
                    {row.nameEn || row.nameAr || '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize text-gva-ink-2">{rowStatus(row)}</td>
                <td className="px-4 py-3 text-gva-muted">{row.sponsor?.fullName ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">{actionButtons(row)}</div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const mobileCards =
    loading && rows.length === 0 ? (
      <p className="text-center text-sm text-gva-muted">Loading…</p>
    ) : rows.length === 0 ? (
      <p className="rounded-xl border border-gva-hairline bg-gva-surface py-10 text-center text-sm text-gva-muted">
        No records found
      </p>
    ) : (
      rows.map((row) => (
        <AdminMobileRecordCard
          key={row.id}
          badge={row.code ?? undefined}
          title={row.nameEn || row.nameAr || 'Unnamed'}
          subtitle={row.sponsor?.fullName ? `Sponsor: ${row.sponsor.fullName}` : 'No sponsor'}
          meta={<StatusPill status={rowStatus(row)} />}
          actions={actionButtons(row)}
        />
      ))
    );

  return (
    <AdminListPageLayout
      title={title}
      subtitle="Organization · filter and manage records"
      addLabel={addLabel}
      addTo={`${basePath}/new`}
      filterArea={filterArea}
      alerts={alerts}
      desktopTable={desktopTable}
      mobileCards={mobileCards}
    />
  );
}

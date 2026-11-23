import { Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminMobileRecordCard } from '@/components/organization/AdminMobileRecordCard';
import { AdminListPageLayout } from '@/components/organization/AdminListPageLayout';
import { AdminListPageSkeleton } from '@/components/skeletons/AdminListPageSkeleton';
import { AdminTableSkeletonRows } from '@/components/skeletons/AdminTableSkeletonRows';
import { Input } from '@/components/ui/input';
import { deleteAdminSponsor, listAdminSponsors, type AdminSponsor } from '@/lib/adminApi';
import { WhatsAppPhone } from '@/components/WhatsAppPhone';

export function SponsorsPage() {
  const [filter, setFilter] = useState('');
  const [rows, setRows] = useState<AdminSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminSponsors(filter);
      setRows(res.sponsors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sponsors');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  async function remove(row: AdminSponsor) {
    if (!window.confirm(`Delete ${row.fullName}?`)) return;
    try {
      const res = await deleteAdminSponsor(row.id);
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (loading && rows.length === 0) {
    return <AdminListPageSkeleton label="Loading app users" columns={4} filterCount={1} />;
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

  const actionButtons = (row: AdminSponsor) => (
    <>
      <Link
        to={`/organization/sponsors/${row.id}/edit`}
        className="rounded-lg p-2 text-gva-ink-2 hover:bg-gva-canvas"
        aria-label={`Edit ${row.fullName}`}
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        className="rounded-lg p-2 text-gva-heart hover:bg-red-50"
        aria-label={`Delete ${row.fullName}`}
        onClick={() => remove(row)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </>
  );

  const desktopTable = (
    <div className="overflow-hidden rounded-xl border border-gva-hairline bg-gva-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gva-hairline bg-gva-canvas/80 text-xs font-bold uppercase tracking-wide text-gva-muted">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="hidden px-4 py-3 sm:table-cell">Phone</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <AdminTableSkeletonRows columns={4} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gva-muted">
                No app users found
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-gva-hairline/70 last:border-0">
                <td className="px-4 py-3 font-semibold text-gva-ink">{row.fullName}</td>
                <td className="px-4 py-3 text-gva-ink-2">{row.email}</td>
                <td className="hidden px-4 py-3 text-gva-muted sm:table-cell"><WhatsAppPhone phone={row.phone} /></td>
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
    rows.length === 0 && !loading ? (
      <p className="rounded-xl border border-gva-hairline bg-gva-surface py-10 text-center text-sm text-gva-muted">
        No app users found
      </p>
    ) : (
      rows.map((row) => (
        <AdminMobileRecordCard
          key={row.id}
          title={row.fullName}
          subtitle={row.email}
          meta={
            row.phone ? (
              <WhatsAppPhone phone={row.phone} className="text-xs text-gva-muted" />
            ) : undefined
          }
          actions={actionButtons(row)}
        />
      ))
    );

  return (
    <AdminListPageLayout
      title="App Users"
      subtitle="Organization · login accounts for the GVA mobile app"
      addLabel="Add app user"
      addTo="/organization/sponsors/new"
      filterArea={
        <Input
          placeholder="Filter by name or email…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-gva-surface md:max-w-md"
        />
      }
      alerts={alerts}
      desktopTable={desktopTable}
      mobileCards={mobileCards}
    />
  );
}

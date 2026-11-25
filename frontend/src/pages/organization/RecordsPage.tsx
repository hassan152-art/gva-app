import { Eye, ImageUp, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AdminMobileRecordCard,
  StatusPill,
} from '@/components/organization/AdminMobileRecordCard';
import { AdminListPageLayout } from '@/components/organization/AdminListPageLayout';
import { AdminListPageSkeleton } from '@/components/skeletons/AdminListPageSkeleton';
import { AdminTableSkeletonRows } from '@/components/skeletons/AdminTableSkeletonRows';
import { Input } from '@/components/ui/input';
import { deleteAdminOrphan, listAdminOrphans, listOrphanCodes, uploadAdminOrphanPhoto } from '@/lib/adminApi';
import { ChildAvatar } from '@/components/kafalat/KafalatBits';
import { Pager } from '@/components/ui/pager';
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 25;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  /** Bulk photos: each file is named after the child's code (OR015.jpg, OR 015.png …). */
  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setMessage(null);
    try {
      const { codes } = await listOrphanCodes();
      const byCode = new Map(codes.map((c) => [c.code.toUpperCase().replace(/\s+/g, ''), c.id]));
      const done: string[] = [];
      const missing: string[] = [];
      const failed: string[] = [];
      const list = Array.from(files);
      for (const [i, file] of list.entries()) {
        const base = file.name.replace(/\.[^.]+$/, '').toUpperCase().replace(/\s+/g, '');
        const m = base.match(/[A-Z]+\d+/);
        const code = m ? m[0] : base;
        const id = byCode.get(code) ?? byCode.get(base);
        if (!id) {
          missing.push(file.name);
          continue;
        }
        setUploading(`Uploading ${i + 1} / ${list.length} — ${code}`);
        try {
          await uploadAdminOrphanPhoto(id, file);
          done.push(code);
        } catch {
          failed.push(file.name);
        }
      }
      setMessage(
        [
          `${done.length} photo${done.length === 1 ? '' : 's'} uploaded`,
          missing.length ? `no child found for: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '…' : ''}` : '',
          failed.length ? `failed: ${failed.slice(0, 10).join(', ')}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminOrphans({ kind, status: statusFilter, q: filter, page, pageSize: PAGE_SIZE });
      setRows(res.orphans);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load records');
    } finally {
      setLoading(false);
    }
  }, [filter, statusFilter, kind, page]);

  // New search / filter → back to page 1.
  useEffect(() => {
    setPage(1);
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
    return row.status === 'sponsored' || row.sponsor || row.rosterSponsor ? 'sponsored' : 'waiting';
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
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void uploadPhotos(e.target.files)}
      />
      <button
        type="button"
        disabled={Boolean(uploading)}
        onClick={() => fileInput.current?.click()}
        title="Select photos named by code, e.g. OR015.jpg — each goes to that child"
        className="inline-flex h-12 items-center gap-2 rounded-lg border border-gva-hairline bg-gva-surface px-3 text-sm font-semibold text-gva-ink hover:bg-gva-canvas disabled:opacity-60"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
        {uploading ?? 'Upload photos'}
      </button>
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
                    className="flex items-center gap-3 font-semibold text-gva-ink hover:text-gva-green-deep hover:underline"
                  >
                    <ChildAvatar name={row.nameEn || row.nameAr || row.code || '?'} photoUrl={row.photoThumbnailUrl ?? row.photoUrl} size="sm" />
                    <span>{row.nameEn || row.nameAr || '—'}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize text-gva-ink-2">{rowStatus(row)}</td>
                <td className="px-4 py-3 text-gva-muted">
                  {row.rosterSponsor ? (
                    <Link to={`/fop/donation-collection?sponsor=${encodeURIComponent(row.rosterSponsor.code)}`} className="hover:underline">
                      <span className="block text-gva-ink">{row.rosterSponsor.name}</span>
                      <span className="block font-mono text-[11px]">{row.rosterSponsor.code}</span>
                    </Link>
                  ) : (
                    row.sponsor?.fullName ?? '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">{actionButtons(row)}</div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} className="border-t border-gva-hairline px-4" />
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
      [
        ...rows.map((row) => (
        <AdminMobileRecordCard
          key={row.id}
          badge={row.code ?? undefined}
          title={row.nameEn || row.nameAr || 'Unnamed'}
          subtitle={
            row.rosterSponsor
              ? `Sponsor: ${row.rosterSponsor.name} (${row.rosterSponsor.code})`
              : row.sponsor?.fullName
                ? `Sponsor: ${row.sponsor.fullName}`
                : 'No sponsor'
          }
          meta={<StatusPill status={rowStatus(row)} />}
          actions={actionButtons(row)}
        />
        )),
        <Pager key="pager" page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />,
      ]
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

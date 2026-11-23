import { ShieldAlert } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { getActiveUser } from '@/lib/api';

export function AdminGate() {
  const user = getActiveUser();

  if (user?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-gva-hairline bg-gva-surface p-6 text-center shadow-sm md:p-8">
        <ShieldAlert className="mx-auto h-10 w-10 text-gva-heart" aria-hidden />
        <h1 className="mt-4 text-lg font-bold text-gva-ink">Admin access required</h1>
        <p className="mt-2 text-sm text-gva-muted">
          Organization, Sponsors, and Orphans management uses the database admin API. Sign in with an
          admin account to create, edit, or delete records.
        </p>
        <Link
          to="/login"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-[var(--radius-button)] bg-gva-green px-5 text-sm font-semibold text-white hover:bg-gva-green-deep"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return <Outlet />;
}

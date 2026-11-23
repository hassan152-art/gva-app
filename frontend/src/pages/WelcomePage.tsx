import { CheckCircle2, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogoLockup } from '@/components/LogoLockup';
import { Button } from '@/components/ui/button';
import { clearAuthSession, getStoredUser, type AuthUser } from '@/lib/api';

export function WelcomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const justSignedIn = Boolean(
    (location.state as { justSignedIn?: boolean } | null)?.justSignedIn,
  );
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function signOut() {
    clearAuthSession();
    navigate('/login', { replace: true });
  }

  const greeting = user?.fullName ? `Welcome back, ${user.fullName}` : 'You’re signed in';

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gva-canvas px-6 py-12">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-gva-hairline bg-gva-surface p-8 text-center shadow-[0_6px_20px_rgba(16,24,40,0.06)]">
        <div className="mb-6 flex justify-center">
          <LogoLockup width={180} />
        </div>

        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gva-tint"
          aria-hidden
        >
          <CheckCircle2 className="h-8 w-8 text-gva-green" strokeWidth={2} />
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-gva-ink">
          {justSignedIn ? 'Sign in successful' : greeting}
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-gva-muted">
          {justSignedIn
            ? 'Your account is connected. The dashboard shell will wrap in-app routes next.'
            : 'You are authenticated with the Gaza Virtual Adoption API.'}
        </p>

        {user ? (
          <dl className="mt-6 space-y-2 rounded-lg bg-gva-canvas px-4 py-3 text-left text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gva-muted">Email</dt>
              <dd className="font-medium text-gva-ink">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gva-muted">Role</dt>
              <dd className="font-medium capitalize text-gva-ink">{user.role}</dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          <Button type="button" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </Button>
          <Link
            to="/login"
            className="text-[14px] font-semibold text-gva-green hover:text-gva-green-deep"
          >
            Switch account
          </Link>
        </div>
      </div>
    </div>
  );
}

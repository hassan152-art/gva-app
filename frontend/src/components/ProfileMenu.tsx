import { KeyRound, LogOut, User } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/UserAvatar';
import { fetchProfile, getActiveUser, getAuthToken, updateStoredUser, type AuthUser } from '@/lib/api';
import { signOut } from '@/lib/signOut';

import { cn } from '@/lib/utils';

type ProfileMenuProps = {
  /** Compact trigger for mobile header (green circle legacy). */
  variant?: 'default' | 'mobile';
};

export function ProfileMenu({ variant = 'default' }: ProfileMenuProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(() => getActiveUser());
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    function syncUser() {
      setUser(getActiveUser());
    }
    window.addEventListener('gva:user-updated', syncUser);
    window.addEventListener('storage', syncUser);

    if (getAuthToken()) {
      fetchProfile()
        .then((res) => {
          if (res?.user) {
            updateStoredUser({
              fullName: res.user.fullName,
              email: res.user.email,
              role: res.user.role,
              avatarUrl: res.user.avatarUrl,
              avatarThumbnailUrl: res.user.avatarThumbnailUrl,
            });
            setUser(getActiveUser());
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('gva:user-updated', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const fullName = user.fullName;
  const avatarUrl = user.avatarThumbnailUrl ?? user.avatarUrl ?? null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gva-green/30',
          variant === 'mobile'
            ? 'h-9 w-9 bg-gva-green text-sm font-bold text-white'
            : 'h-9 w-9',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label="Account menu"
      >
        <UserAvatar fullName={fullName} imageUrl={avatarUrl} size="sm" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-xl border border-gva-hairline bg-gva-surface py-2 shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <UserAvatar fullName={fullName} imageUrl={avatarUrl} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gva-ink">{fullName}</p>
              <p className="truncate text-xs text-gva-muted">{user.email}</p>
            </div>
          </div>
          <div className="mx-3 border-t border-gva-hairline" />

          <MenuLink to="/profile" icon={User} label="My Profile" onNavigate={() => setOpen(false)} />
          <MenuLink
            to="/profile/change-password"
            icon={KeyRound}
            label="Change Password"
            onNavigate={() => setOpen(false)}
          />

          <div className="mx-3 my-1 border-t border-gva-hairline" />

          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gva-heart hover:bg-gva-canvas"
            onClick={() => {
              setOpen(false);
              signOut(navigate);
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  to,
  icon: Icon,
  label,
  onNavigate,
}: {
  to: string;
  icon: typeof User;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gva-ink-2 hover:bg-gva-canvas hover:text-gva-ink"
    >
      <Icon className="h-4 w-4 shrink-0 text-gva-muted" strokeWidth={1.75} aria-hidden />
      {label}
    </Link>
  );
}

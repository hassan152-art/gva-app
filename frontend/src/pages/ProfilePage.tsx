import { Camera, KeyRound, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ComponentProps, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ProfilePageSkeleton } from '@/components/skeletons/ProfilePageSkeleton';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchProfile,
  getActiveUser,
  getAuthToken,
  updateProfile,
  updateStoredUser,
  uploadProfileAvatar,
  type ProfileUser,
} from '@/lib/api';
import { isAuthBypassed, PREVIEW_USER } from '@/lib/authBypass';
import { roleLabel } from '@/lib/userInitials';
import { cn } from '@/lib/utils';

function IconField({
  icon: Icon,
  id,
  label,
  className,
  ...inputProps
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  id: string;
  label: string;
} & ComponentProps<typeof Input>) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2 block text-sm font-semibold text-gva-ink normal-case tracking-normal">
        {label}
      </Label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gva-muted-2"
          strokeWidth={1.75}
          aria-hidden
        />
        <Input id={id} className={cn('!pl-10', className)} {...inputProps} />
      </div>
    </div>
  );
}

export function ProfilePage() {
  const sessionUser = getActiveUser();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Admin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!getAuthToken() && isAuthBypassed() && sessionUser) {
      setUser({
        ...sessionUser,
        phone: '+923122828038',
      });
      setFullName(sessionUser.fullName);
      setEmail(sessionUser.email);
      setPhone('+923122828038');
      setRole(roleLabel(sessionUser.role));
      setLoading(false);
      return;
    }

    try {
      const res = await fetchProfile();
      setUser(res.user);
      setFullName(res.user.fullName);
      setEmail(res.user.email ?? '');
      setPhone(res.user.phone ?? '');
      setRole(roleLabel(res.user.role));
      updateStoredUser({
        fullName: res.user.fullName,
        email: res.user.email,
        role: res.user.role,
        avatarUrl: res.user.avatarUrl,
        avatarThumbnailUrl: res.user.avatarThumbnailUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profile');
      if (sessionUser) {
        setUser({ ...sessionUser, phone: '' });
        setFullName(sessionUser.fullName);
        setEmail(sessionUser.email);
        setPhone('');
        setRole(roleLabel(sessionUser.role));
      }
    } finally {
      setLoading(false);
    }
  }, [sessionUser]);

  useEffect(() => {
    load();
  }, [load]);

  async function onPickPhoto(file: File) {
    if (saving || uploading) return;
    setError(null);
    setMessage(null);
    if (!/^image\/(jpeg|jpg|png)$/i.test(file.type)) {
      setError('JPG or PNG only, up to 5MB');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('JPG or PNG only, up to 5MB');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setUploading(true);

    const toDataUrl = (f: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

    try {
      const dataUrl = await toDataUrl(file).catch(() => localUrl);

      if (!getAuthToken() && isAuthBypassed()) {
        const updatedUser: ProfileUser = {
          ...(user || sessionUser || PREVIEW_USER),
          avatarUrl: dataUrl,
          avatarThumbnailUrl: dataUrl,
        };
        setUser(updatedUser);
        updateStoredUser({
          avatarUrl: dataUrl,
          avatarThumbnailUrl: dataUrl,
        });
        setMessage('Profile photo updated');
        setAvatarPreview(null);
        return;
      }

      const res = await uploadProfileAvatar(file);
      setUser(res.user);
      updateStoredUser({
        avatarUrl: res.user.avatarUrl,
        avatarThumbnailUrl: res.user.avatarThumbnailUrl,
      });
      setMessage(res.message);
      setAvatarPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      URL.revokeObjectURL(localUrl);
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving || uploading) return;
    setError(null);
    setMessage(null);
    setSaving(true);

    const trimmedRole = role.trim().toLowerCase();
    const normalizedRole = trimmedRole === 'admin' ? 'admin' : 'sponsor';

    if (!getAuthToken() && isAuthBypassed()) {
      try {
        const updatedUser: ProfileUser = {
          ...(user || sessionUser || { id: 'preview', fullName: '', email: '', role: 'sponsor' }),
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role: normalizedRole,
        };
        setUser(updatedUser);
        updateStoredUser({
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role,
        });
        setMessage('Profile updated');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save profile');
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      const res = await updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: normalizedRole,
      });
      setUser(res.user);
      setFullName(res.user.fullName);
      setEmail(res.user.email);
      setPhone(res.user.phone ?? '');
      setRole(roleLabel(res.user.role));
      updateStoredUser({
        fullName: res.user.fullName,
        email: res.user.email,
        role: res.user.role,
      });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  const displayName = fullName || user?.fullName || sessionUser?.fullName || '';
  const thumb =
    avatarPreview ??
    user?.avatarThumbnailUrl ??
    user?.avatarUrl ??
    sessionUser?.avatarThumbnailUrl ??
    sessionUser?.avatarUrl ??
    null;
  const isBusy = saving || uploading;

  if (loading) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="relative mx-auto w-full max-w-md py-4">
      {/* Full-screen click blocker while API is calling */}
      {isBusy && (
        <div
          className="fixed inset-0 z-50 cursor-wait bg-black/5"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-hidden="true"
        />
      )}

      <div className="rounded-2xl border border-gva-hairline bg-gva-surface p-6 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-7">
        <h1 className="mb-4 text-lg font-bold text-gva-ink sm:text-xl">
          Account Details
        </h1>

        <form
          onSubmit={onSubmit}
          className={cn('space-y-5', isBusy && 'pointer-events-none cursor-wait select-none')}
        >
          <div className="flex flex-col items-center pb-2">
            <div className="relative">
              <UserAvatar
                fullName={displayName}
                imageUrl={thumb}
                size="lg"
                className={cn(!thumb && '!bg-[#F3F4F7] !text-[#171C49] font-medium')}
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#171C49] text-white shadow-md hover:bg-[#171C49]/90 disabled:opacity-50"
                aria-label="Upload profile photo"
              >
                <Camera className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                className="sr-only"
                disabled={isBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void onPickPhoto(file);
                }}
              />
            </div>
            <p className="mt-2.5 text-xs text-[#8C93A8]">JPG or PNG, up to 5MB</p>
            {uploading ? (
              <p className="mt-1 text-xs text-gva-muted">Uploading photo…</p>
            ) : null}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-gva-ink normal-case tracking-normal">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                disabled={isBusy}
                className="bg-[#F6F7F9] border-gva-hairline text-gva-ink focus-visible:border-gva-green focus-visible:ring-gva-green/15"
                required
              />
            </div>

            <IconField
              icon={Mail}
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isBusy}
              className="bg-[#F6F7F9] border-gva-hairline text-gva-ink focus-visible:border-gva-green focus-visible:ring-gva-green/15"
              required
            />

            <IconField
              icon={Phone}
              id="phone"
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              disabled={isBusy}
              className="bg-[#F6F7F9] border-gva-hairline text-gva-ink focus-visible:border-gva-green focus-visible:ring-gva-green/15"
            />

            <div>
              <IconField
                icon={ShieldCheck}
                id="role"
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                list="role-options"
                disabled={isBusy}
                className="bg-[#F6F7F9] border-gva-hairline text-gva-ink focus-visible:border-gva-green focus-visible:ring-gva-green/15"
                required
              />
              <datalist id="role-options">
                <option value="Admin" />
                <option value="Sponsor" />
              </datalist>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-gva-heart" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-gva-green-deep" role="status">
              {message}
            </p>
          ) : null}

          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              loading={saving}
              loadingLabel="Saving…"
              disabled={isBusy}
              className="h-12 w-full rounded-xl bg-gva-green text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-gva-green-deep focus-visible:ring-gva-green/30 disabled:pointer-events-none disabled:opacity-60"
            >
              Save Changes
            </Button>
            <Link
              to="/profile/change-password"
              className={cn(
                'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gva-green/40 bg-gva-tint px-6 text-[15px] font-semibold text-gva-green-deep transition-colors hover:bg-gva-green/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gva-green/30',
                isBusy && 'pointer-events-none opacity-50',
              )}
            >
              <KeyRound className="h-[18px] w-[18px] text-gva-green-deep" strokeWidth={1.75} aria-hidden />
              Reset Password
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

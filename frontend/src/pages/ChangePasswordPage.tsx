import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword } from '@/lib/api';

function PasswordField({
  id,
  label,
  value,
  onChange,
  reveal,
  onToggleReveal,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  reveal?: boolean;
  onToggleReveal?: () => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2 block text-sm font-bold text-gva-ink">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={reveal ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'}
          className={onToggleReveal ? 'pr-11' : undefined}
        />
        {onToggleReveal ? (
          <button
            type="button"
            onClick={onToggleReveal}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gva-muted-2 hover:text-gva-ink"
            aria-label={reveal ? 'Hide password' : 'Show password'}
          >
            {reveal ? (
              <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} />
            ) : (
              <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revealNew, setRevealNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setMessage(null);

    if (newPassword.length < 8 || !/\d/.test(newPassword)) {
      setError('At least 8 characters, with a number');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match');
      return;
    }

    setBusy(true);
    try {
      const res = await changePassword({ currentPassword, newPassword, confirmPassword });
      setMessage(res.message || 'Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-2 text-xl font-bold tracking-tight text-gva-ink md:text-2xl">
        Change password
      </h1>
      <p className="mb-6 text-sm text-gva-muted">Choose something you have not used before.</p>

      <div className="rounded-2xl border border-gva-hairline bg-gva-surface p-6 shadow-[0_1px_3px_rgba(15,23,42,0.05)] md:p-8">
        <form onSubmit={onSubmit} className="space-y-4">
          <PasswordField
            id="currentPassword"
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <PasswordField
            id="newPassword"
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            reveal={revealNew}
            onToggleReveal={() => setRevealNew((v) => !v)}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />

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

          <div className="pt-2">
            <Button type="submit" loading={busy} loadingLabel="Updating…">
              Update password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

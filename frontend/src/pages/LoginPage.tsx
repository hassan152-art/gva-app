import { Eye, EyeOff } from 'lucide-react';
import { LoginFormAlert } from '@/components/LoginFormAlert';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogoLockup } from '@/components/LogoLockup';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login, setAuthSession } from '@/lib/api';
import { formatSignInError } from '@/lib/authErrors';
import {
  validateLoginEmail,
  validateLoginForm,
  validateLoginPassword,
  type LoginFieldErrors,
} from '@/lib/loginValidation';
import { cn } from '@/lib/utils';

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="mt-1.5 text-[13px] text-gva-heart" role="alert">
      {message}
    </p>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);

    const errors = validateLoginForm(email, password);
    if (errors.email || errors.password) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      const { token, user } = await login(email.trim(), password);
      setAuthSession(token, user, remember);
      navigate('/', { replace: true, state: { justSignedIn: true } });
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Unable to sign in';
      setFormError(formatSignInError(raw));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside
        className={cn(
          'relative hidden flex-1 items-center justify-center bg-gva-brand-panel px-8 md:flex md:min-h-dvh md:max-w-[50%]',
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(20,153,84,0.22),transparent_55%)]" />
        <LogoLockup
          variant="on-dark"
          width={320}
          className="relative z-[1] w-[min(320px,85vw)]"
        />
      </aside>

      <main className="flex min-h-dvh flex-1 items-center justify-center bg-gva-canvas px-5 py-10 md:min-h-0 md:bg-gva-surface md:px-12 md:py-0">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex justify-center md:mb-8">
            <LogoLockup width={200} className="w-[min(200px,72vw)]" />
          </div>

          {formError ? <LoginFormAlert message={formError} className="mb-6" /> : null}

          <form onSubmit={onSubmit} className="space-y-5" noValidate aria-busy={busy}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                disabled={busy}
                onChange={(ev) => {
                  setEmail(ev.target.value);
                  if (formError) setFormError(null);
                  if (fieldErrors.email) {
                    const next = validateLoginEmail(ev.target.value);
                    setFieldErrors((prev) => ({ ...prev, email: next }));
                  }
                }}
                onBlur={() => {
                  const next = validateLoginEmail(email);
                  setFieldErrors((prev) => ({ ...prev, email: next }));
                }}
              />
              {fieldErrors.email ? (
                <FieldError id="email-error" message={fieldErrors.email} />
              ) : null}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={reveal ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  disabled={busy}
                  onChange={(ev) => {
                    setPassword(ev.target.value);
                    if (formError) setFormError(null);
                    if (fieldErrors.password) {
                      const next = validateLoginPassword(ev.target.value);
                      setFieldErrors((prev) => ({ ...prev, password: next }));
                    }
                  }}
                  onBlur={() => {
                    const next = validateLoginPassword(password);
                    setFieldErrors((prev) => ({ ...prev, password: next }));
                  }}
                  className="pr-12"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setReveal((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gva-muted-2 hover:text-gva-ink-2"
                  aria-label={reveal ? 'Hide password' : 'Show password'}
                >
                  {reveal ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {fieldErrors.password ? (
                <FieldError id="password-error" message={fieldErrors.password} />
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="remember"
                  checked={remember}
                  disabled={busy}
                  onCheckedChange={setRemember}
                />
                <label
                  htmlFor="remember"
                  className={cn(
                    'select-none text-[14px] text-gva-ink-2',
                    busy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                  )}
                  onClick={() => !busy && setRemember((v) => !v)}
                >
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-[14px] font-semibold text-gva-green hover:text-gva-green-deep"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              loading={busy}
              disabled={busy}
              loadingLabel="Signing in…"
              className="mt-2"
            >
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-[15px] text-gva-muted">
            Don&apos;t have an account?{' '}
            <Link to="/sign-up" className="font-semibold text-gva-green hover:text-gva-green-deep">
              Create now
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

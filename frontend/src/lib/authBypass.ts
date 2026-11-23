import type { AuthUser } from '@/lib/api';

/** Dev-only preview: set `VITE_BYPASS_AUTH=true` in `.env` to skip login. */
export function isAuthBypassed(): boolean {
  const flag = import.meta.env.VITE_BYPASS_AUTH;
  if (flag === 'true') return true;
  return false;
}

export const PREVIEW_USER: AuthUser = {
  id: 'preview',
  fullName: 'Rauf',
  email: 'rauf@appick.com',
  role: 'admin',
};

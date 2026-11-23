import { isAuthBypassed, PREVIEW_USER } from '@/lib/authBypass';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  avatarThumbnailUrl?: string | null;
  phone?: string | null;
};

export type ProfileUser = AuthUser & {
  phone?: string | null;
  initial?: string;
  memberSince?: string;
  avatarUrl?: string | null;
  avatarThumbnailUrl?: string | null;
};

export type ProfileResponse = {
  user: ProfileUser;
  stats: {
    sponsored: number;
    totalGiven: { amount: number; formatted: string };
    donations: number;
    pending: number;
  };
};

export type SponsorOption = {
  id: string;
  fullName: string;
  email: string;
};

export type OrphanProfile = {
  id: string;
  code: string | null;
  nameAr: string | null;
  nameEn: string | null;
  orphanIdNumber: string | null;
  guardianNameAr: string | null;
  guardianNameEn: string | null;
  guardianIdNumber: string | null;
  location: string | null;
  dateOfBirth: string | null;
  whatsapp: string | null;
  sex: string | null;
  status: string | null;
  monthlyAmount: { amount: number; formatted: string };
  photoUrl: string | null;
  photoThumbnailUrl: string | null;
  sponsor: SponsorOption | null;
};

export const AUTH_TOKEN_KEY = 'gva_auth_token';
export const AUTH_USER_KEY = 'gva_auth_user';

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw =
    localStorage.getItem(AUTH_USER_KEY) ?? sessionStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getActiveUser(): AuthUser | null {
  const stored = getStoredUser();
  if (stored) return stored;
  return isAuthBypassed() ? PREVIEW_USER : null;
}

export function setAuthSession(token: string, user: AuthUser, remember: boolean): void {
  const storage = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  for (const key of [AUTH_TOKEN_KEY, AUTH_USER_KEY] as const) {
    other.removeItem(key);
  }
  storage.setItem(AUTH_TOKEN_KEY, token);
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  for (const key of [AUTH_TOKEN_KEY, AUTH_USER_KEY] as const) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gva:user-updated', { detail: null }));
  }
}

export function updateStoredUser(patch: Partial<AuthUser>): void {
  const current = getStoredUser();
  const base = current ?? (isAuthBypassed() ? PREVIEW_USER : null);
  if (!base) return;
  const next = { ...base, ...patch };
  if (sessionStorage.getItem(AUTH_USER_KEY)) {
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(next));
  } else {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(next));
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gva:user-updated', { detail: next }));
  }
}

type ApiErrorBody = { error?: string; errors?: Record<string, string> };

async function parseApiResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as ApiErrorBody & T;
  if (!res.ok) {
    const msg =
      typeof data.error === 'string'
        ? data.error
        : data.errors
          ? Object.values(data.errors)[0]
          : 'Request failed';
    throw new Error(msg);
  }
  return data;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { formData?: FormData } = {},
): Promise<T> {
  const { formData, headers: initHeaders, body, ...rest } = init;
  const headers = new Headers(initHeaders);
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!formData) headers.set('Accept', 'application/json');

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
      body: formData ?? body,
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  return parseApiResponse<T>(res);
}

export function fetchProfile(): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>('/profile');
}

export function updateProfile(payload: {
  fullName?: string;
  phone?: string;
  email?: string;
  role?: string;
}): Promise<{ user: ProfileUser; message: string }> {
  return apiRequest('/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function uploadProfileAvatar(
  file: File,
): Promise<{ user: ProfileUser; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest('/profile/avatar', { method: 'POST', formData });
}

export function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: boolean; message: string }> {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Unable to sign in');
  }

  if (typeof data.token !== 'string' || !data.user) {
    throw new Error('Unexpected response from the server');
  }

  return data as { token: string; user: AuthUser };
}

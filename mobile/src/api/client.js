/**
 * API client.
 *
 * The base URL comes from EXPO_PUBLIC_API_URL. On a physical device
 * 127.0.0.1 points at the phone, so the Android emulator gets 10.0.2.2 and
 * everything else falls back to localhost.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_PORT = 4000;

function expoDevHost() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostname = hostUri.split(':')[0];
    if (hostname && hostname !== 'localhost') return hostname;
  }
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost ??
    Constants.manifest?.debuggerHost;
  if (debuggerHost) return debuggerHost.split(':')[0];
  return null;
}

function resolveBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, '');

  const isPhysicalDevice = Constants.isDevice;
  const devHost = expoDevHost();

  if (Platform.OS === 'android') {
    // With `expo start --localhost`, run `adb reverse tcp:4000 tcp:4000` (see mobile npm run android).
    if (!isPhysicalDevice) return `http://127.0.0.1:${DEFAULT_PORT}`;
    if (devHost) return `http://${devHost}:${DEFAULT_PORT}`;
    return `http://10.0.2.2:${DEFAULT_PORT}`;
  }

  if (Platform.OS === 'ios') {
    if (!isPhysicalDevice) return `http://127.0.0.1:${DEFAULT_PORT}`;
    if (devHost) return `http://${devHost}:${DEFAULT_PORT}`;
    return `http://127.0.0.1:${DEFAULT_PORT}`;
  }

  return `http://127.0.0.1:${DEFAULT_PORT}`;
}

export const API_BASE = resolveBaseUrl();

export class ApiError extends Error {
  constructor(message, { status, code, errors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors || null;
  }
}

let tokenProvider = () => null;
let onUnauthorized = () => {};

export function configureApi({ getToken, unauthorized }) {
  if (getToken) tokenProvider = getToken;
  if (unauthorized) onUnauthorized = unauthorized;
}

async function request(path, { method = 'GET', body, signal, formData } = {}) {
  const headers = { Accept: 'application/json' };
  const token = tokenProvider();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData; // let the runtime set the multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload, signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError(
      `Cannot reach the server at ${API_BASE}. Start the API (cd backend && npm run dev) and, on Android emulator, run: adb reverse tcp:4000 tcp:4000`,
      { code: 'NETWORK' }
    );
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/me')) {
    onUnauthorized();
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, {
      status: res.status,
      errors: data?.errors,
    });
  }
  return data;
}

export const api = {
  /* ---- auth ---- */
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  me: () => request('/auth/me'),
  changePassword: (payload) =>
    request('/auth/change-password', { method: 'POST', body: payload }),
  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', body: { email } }),

  /* ---- home ---- */
  impact: () => request('/me/impact'),
  activeOrphans: () => request('/orphans/active'),
  availableOrphans: (limit = 2) => request(`/orphans/available?limit=${limit}`),
  allOrphans: ({ refresh } = {}) => {
    const qs = refresh ? '?refresh=1' : '';
    return request(`/orphans/all${qs}`);
  },

  /* ---- sponsor content ---- */
  carousel: () => request('/orphans/carousel'),
  hadith: () => request('/orphans/hadith'),

  /* ---- payments ---- */
  payments: ({ orphanId, from, to } = {}) => {
    const qs = new URLSearchParams();
    if (orphanId && orphanId !== 'all') qs.set('orphanId', orphanId);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const suffix = qs.toString() ? `?${qs}` : '';
    return request(`/payments${suffix}`);
  },
  paymentSummary: ({ orphanId, from, to } = {}) => {
    const qs = new URLSearchParams();
    if (orphanId && orphanId !== 'all') qs.set('orphanId', orphanId);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const suffix = qs.toString() ? `?${qs}` : '';
    return request(`/payments/summary${suffix}`);
  },
  submitPayment: (formData) => request('/payments', { method: 'POST', formData }),

  /* ---- profile ---- */
  profile: () => request('/profile'),
  updateProfile: (payload) => request('/profile', { method: 'PATCH', body: payload }),
};

export default api;

/**
 * Small helpers shared by the donor screens.
 */
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

/*
 * Last data each screen showed, kept in memory for this app session, so a tab
 * opens instantly with what it had and refreshes quietly in the background.
 * Keys include the user id, so another account never sees someone else's data.
 */
const screenCache = new Map();

export function useCachedState(key, initial = null) {
  const [value, setValue] = useState(() => (screenCache.has(key) ? screenCache.get(key) : initial));
  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? next(prev) : next;
        screenCache.set(key, v);
        return v;
      });
    },
    [key],
  );
  return [value, set];
}

export function clearScreenCache() {
  screenCache.clear();
}

/** Where to go right after sign-in / sign-up (e.g. the child the guest tapped "Sponsor now" on). */
let afterLogin = null;
export function setAfterLogin(path) {
  afterLogin = path;
}
export function hasAfterLogin() {
  return Boolean(afterLogin);
}
export function takeAfterLogin() {
  const p = afterLogin;
  afterLogin = null;
  return p;
}

/** Pick one photo or PDF (payment slip / screenshot). Returns the asset or null. */
export async function pickFile() {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled) return null;
  return res.assets?.[0] || null;
}

/** Append a picked file to FormData (web needs a Blob, native a {uri,name,type}). */
export async function appendFile(form, field, file) {
  if (!file) return;
  if (Platform.OS === 'web') {
    const blob = file.file || (await fetch(file.uri).then((r) => r.blob()));
    form.append(field, blob, file.name || 'upload.png');
  } else {
    form.append(field, { uri: file.uri, name: file.name || 'upload.png', type: file.mimeType || 'image/png' });
  }
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function pkr(n) {
  return `PKR ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Drive "uc?export" links download; the /view page previews. */
export function viewUrl(url) {
  const u = String(url || '');
  const m = u.match(/\/d\/([A-Za-z0-9_-]{10,})/) || u.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  return /google\.com/.test(u) && m ? `https://drive.google.com/file/d/${m[1]}/view` : u;
}

export const STATUS_TONE = {
  paid: { bg: '#EAF7EF', fg: '#0C7A44', label: 'Paid' },
  partial: { bg: '#FFF7ED', fg: '#C2410C', label: 'Partial' },
  unpaid: { bg: '#FDECEE', fg: '#B42318', label: 'Unpaid' },
  pending: { bg: '#FFF7ED', fg: '#C2410C', label: 'Pending' },
  approved: { bg: '#EAF7EF', fg: '#0C7A44', label: 'Approved' },
  rejected: { bg: '#FDECEE', fg: '#B42318', label: 'Rejected' },
  open: { bg: '#FFF7ED', fg: '#C2410C', label: 'Open' },
  in_progress: { bg: '#EEF4FF', fg: '#1D4ED8', label: 'In progress' },
  resolved: { bg: '#EAF7EF', fg: '#0C7A44', label: 'Resolved' },
  closed: { bg: '#F1F4F6', fg: '#4B5563', label: 'Closed' },
};

import { API_BASE } from '../api/client';

/** Poster URL from our API (relative) or Elixir (absolute). */
export function orphanPosterUri(orphan) {
  const raw = orphan?.posterUrl;
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${API_BASE}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

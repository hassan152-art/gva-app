import { resolveMediaPreviewUrl } from '../utils/driveMedia.js';

/** Shared response shaping so every screen gets the same field names. */

function resolveProofUrl(stored) {
  if (!stored) return null;
  if (/^https?:\/\//i.test(stored)) return stored;
  return `/uploads/${stored}`;
}

/** PKR amounts travel as integers (whole rupees) plus a preformatted string. */
export function money(value) {
  const n = Number(value || 0);
  return {
    amount: n,
    formatted: `PKR ${n.toLocaleString('en-US')}`,
  };
}

export function initialOf(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/**
 * Orphan as the app renders it in a list row.
 *
 * Only `code` and `posterUrl` are guaranteed: the official published API for
 * this programme exposes a code ("OR575") and a poster JPEG, and nothing else.
 * The child's name and age are drawn inside that poster. So `fullName` falls
 * back to the code, and the demographic strings are null when the data is
 * genuinely absent rather than being made up.
 */
export function orphanDto(row) {
  const first = row.first_name || null;
  const last = row.last_name || null;
  const hasName = Boolean(first || last);
  const fullName = hasName ? [first, last].filter(Boolean).join(' ') : row.code || 'Sponsored child';

  const metaParts = [
    row.age != null ? `${row.age} yrs` : null,
    row.sex || null,
    row.city || null,
  ].filter(Boolean);

  const shortParts = [row.age != null ? `${row.age} yrs` : null, row.sex || null].filter(Boolean);

  return {
    id: String(row.id),
    code: row.code || null,
    posterUrl: row.poster_url || null,
    firstName: first,
    lastName: last,
    fullName,
    hasName,
    // A poster carries the child's name and age, so a letter avatar would be
    // a downgrade — the app shows the poster instead when one exists.
    initial: first ? initialOf(first) : (row.code ? row.code.slice(0, 2) : '?'),
    age: row.age,
    sex: row.sex,
    city: row.city,
    status: row.status,
    meta: metaParts.join(' · ') || null,
    metaShort: shortParts.join(' · ') || null,
    monthlyAmount: money(row.monthly_amount_pkr),
  };
}

const KIND_ICON = { monthly: 'card', campaign: 'star', one_time: 'heart' };

export function paymentDto(row) {
  const d = new Date(row.paid_on);
  return {
    id: String(row.id),
    kind: row.kind,
    icon: KIND_ICON[row.kind] || 'card',
    title: row.title,
    subtitle: row.subtitle,
    status: row.status,
    statusLabel: row.status === 'completed' ? 'Completed' : row.status === 'pending' ? 'Pending' : 'Rejected',
    amount: money(row.amount_pkr),
    platformFee: money(row.platform_fee_pkr),
    method: row.method,
    note: row.reference_note,
    proofUrl: resolveProofUrl(row.proof_path),
    proofThumbnailUrl: row.proof_path
      ? resolveMediaPreviewUrl(resolveProofUrl(row.proof_path), 200)
      : null,
    paidOn: d.toISOString().slice(0, 10),
    dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
    orphans: (row.orphan_names || '').split('||').filter(Boolean),
  };
}

export function userDto(row) {
  const avatarUrl = row.avatar_url || null;
  return {
    id: String(row.id),
    fullName: row.full_name,
    firstName: row.full_name.split(' ')[0],
    email: row.email,
    phone: row.phone,
    initial: row.avatar_initial || initialOf(row.full_name),
    role: row.role,
    avatarUrl,
    avatarThumbnailUrl: avatarUrl ? resolveMediaPreviewUrl(avatarUrl, 192) : null,
    memberSince: new Date(row.created_at).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
  };
}

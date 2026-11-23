/**
 * Currency and date formatting.
 *
 * The board formats money as "PKR 30,000" with thousands separators and no
 * decimals, and dates as "Oct 20, 2026". Keeping this in one place stops the
 * screens drifting apart.
 */

export function formatPKR(value, { prefix = true } = {}) {
  const n = Number(value || 0);
  const body = Math.round(n).toLocaleString('en-US');
  return prefix ? `PKR ${body}` : body;
}

/** "30,000" — the numeric part alone, for fields and tiles with a PKR label. */
export function formatAmount(value) {
  return Math.round(Number(value || 0)).toLocaleString('en-US');
}

/** "Oct 20, 2026" */
export function formatDateLong(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** "8 yrs · Male · Gaza City" */
export function formatOrphanMeta({ age, sex, city }) {
  return [age != null ? `${age} yrs` : null, sex, city].filter(Boolean).join(' · ');
}

/** Whatever the user types in an amount field, reduced to whole rupees. */
export function parseAmount(input) {
  const digits = String(input ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

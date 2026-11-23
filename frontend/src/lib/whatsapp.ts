/**
 * Phone → WhatsApp (wa.me) number. wa.me needs the full international number,
 * digits only:
 *   0300 1234567     → 923001234567   (Pakistan mobile written locally)
 *   +92 346 4990941  → 923464990941
 *   00971 55 331 0692 → 971553310692
 *   970 599 255 673  → 970599255673   (Palestine)
 * Returns null when the number is too short or ambiguous (e.g. a local
 * Gaza number "0599…" without a country code).
 */
export function toWhatsApp(phone: string | null | undefined): string | null {
  let d = String(phone ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('03')) d = `92${d.slice(1)}`;
  else if (d.length === 10 && d.startsWith('3')) d = `92${d}`;
  else if (d.startsWith('0')) return null; // local number of unknown country
  return d.length >= 10 && d.length <= 15 ? d : null;
}

/** "+923334599059, +92 322 4805218" / "0300… or 0321…" → each number on its own. */
export function splitPhones(phone: string | null | undefined): string[] {
  return String(phone ?? '')
    .split(/[,;/|]|\s(?:or|and|&)\s/i)
    .map((p) => p.trim())
    .filter((p) => p.replace(/\D/g, '').length >= 7);
}

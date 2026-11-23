/** Thumbnail / preview URLs for Cloudious / Google Drive stored files. */

export function extractGoogleFileId(value) {
  if (!value?.trim()) return null;
  const input = value.trim();
  if (/^[A-Za-z0-9_-]{10,}$/.test(input) && !input.includes('/')) return input;

  const patterns = [
    /\/d\/([A-Za-z0-9_-]+)/,
    /[?&]id=([A-Za-z0-9_-]+)/,
    /googleusercontent\.com\/d\/([A-Za-z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function toDriveThumbnailUrl(url, widthPx = 100) {
  const id = extractGoogleFileId(url);
  if (!id) return url;
  return `https://lh3.googleusercontent.com/d/${id}=w${widthPx}`;
}

export function resolveMediaPreviewUrl(url, size = 400) {
  if (!url) return '';
  if (/gdrive\.cloudious\.net/i.test(url)) return url;
  if (/lh3\.googleusercontent\.com\/d\//i.test(url)) return url;
  if (/drive\.google\.com|googleusercontent\.com/i.test(url)) {
    return toDriveThumbnailUrl(url, size);
  }
  return url;
}

export function getMediaPreviewCandidates(url, size = 400) {
  const out = [];
  const add = (c) => {
    if (c && !out.includes(c)) out.push(c);
  };
  add(resolveMediaPreviewUrl(url, size));
  add(url);
  const id = extractGoogleFileId(url);
  if (id) add(`https://lh3.googleusercontent.com/d/${id}`);
  add(toDriveThumbnailUrl(url, size));
  return out;
}

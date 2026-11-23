/**
 * Live orphan roster from gazavirtualadoption.org (Strapi fop-vads on Elixir).
 * Same payload the /orphans/all web route uses.
 */
import { query } from '../db/index.js';
import { money, orphanDto } from '../lib/dto.js';

const ELIXIR_API = (process.env.ELIXIR_API_URL || 'https://elixir.cloudious.net/api').replace(/\/$/, '');
const ELIXIR_MEDIA = process.env.ELIXIR_MEDIA_URL || 'https://elixir.cloudious.net';
const ELIXIR_TOKEN = process.env.ELIXIR_STRAPI_TOKEN || '';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = { at: 0, payload: null };

function posterFromChildImg(childImg) {
  const path = childImg?.data?.attributes?.url;
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${ELIXIR_MEDIA}${path.startsWith('/') ? path : `/${path}`}`;
}

function mapElixirOrphan(row) {
  const sponsored = Boolean(row.Status);
  return {
    id: String(row.id),
    code: row.name || null,
    fullName: row.name || 'Sponsored child',
    posterUrl: posterFromChildImg(row.childImg),
    listNo: row.ListNo ?? null,
    sponsored,
    available: !sponsored,
    status: sponsored ? 'sponsored' : 'waiting',
    monthlyAmount: money(Number(process.env.DEFAULT_MONTHLY_PKR || 30000)),
    externalId: row.id,
  };
}

function sortOrphans(list) {
  return [...list].sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    const la = a.listNo ?? 9999;
    const lb = b.listNo ?? 9999;
    if (la !== lb) return Number(la) - Number(lb);
    return String(a.code || '').localeCompare(String(b.code || ''));
  });
}

async function fetchFromElixir() {
  if (!ELIXIR_TOKEN) return null;
  const res = await fetch(`${ELIXIR_API}/fop-vads?populate=deep`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${ELIXIR_TOKEN}`,
    },
  });
  if (!res.ok) throw new Error(`Elixir fop-vads failed (${res.status})`);
  const json = await res.json();
  const raw = json?.data?.[0]?.attributes?.orphans;
  if (!Array.isArray(raw)) throw new Error('Elixir fop-vads orphans missing');
  const orphans = sortOrphans(raw.map(mapElixirOrphan));
  return {
    source: 'elixir',
    orphans,
    totalOrphans: orphans.length,
    totalWaiting: orphans.filter((o) => o.available).length,
    totalSponsored: orphans.filter((o) => o.sponsored).length,
  };
}

async function fetchFromDatabase() {
  const rows = await query('SELECT * FROM orphans ORDER BY code NULLS LAST, id');
  const orphans = sortOrphans(
    rows.map((r) => ({
      ...orphanDto(r),
      listNo: null,
      sponsored: r.status === 'sponsored',
      available: r.status === 'waiting',
      externalId: r.external_id,
    }))
  );
  return {
    source: 'database',
    orphans,
    totalOrphans: orphans.length,
    totalWaiting: orphans.filter((o) => o.available).length,
    totalSponsored: orphans.filter((o) => o.sponsored).length,
  };
}

export async function getOfficialOrphans({ refresh = false } = {}) {
  const stale = !cache.payload || Date.now() - cache.at > CACHE_TTL_MS;
  if (!refresh && !stale && cache.payload) return cache.payload;

  try {
    const live = await fetchFromElixir();
    if (live) {
      cache = { at: Date.now(), payload: live };
      return live;
    }
  } catch (err) {
    console.warn('[officialOrphans] Elixir fetch failed:', err.message);
    if (cache.payload) return cache.payload;
  }

  const db = await fetchFromDatabase();
  cache = { at: Date.now(), payload: db };
  return db;
}

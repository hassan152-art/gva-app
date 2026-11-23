/**
 * Pixel-diffs the captured screenshots against the FigCraft design exports.
 *
 *   node diff.js [--only=07-sign-in]
 *
 * For each screen it writes:
 *   design/diffs/<id>.heat.png   changed pixels highlighted
 *   design/diffs/<id>.side.png   reference | actual side by side
 * and prints the share of differing pixels.
 *
 * A pixel counts as different when it differs by more than ANTIALIAS_THRESHOLD
 * on any channel — squared-off text rasterisation differences otherwise
 * dominate the number and hide real layout drift.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { SCREENS } from './screens.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const outDir = join(repoRoot, 'design', 'diffs');
const designRoot = join(repoRoot, 'design');
mkdirSync(outDir, { recursive: true });

/** Per-channel tolerance. 0.1 keeps real colour shifts while ignoring AA. */
const THRESHOLD = 0.1;
const GATE = 1.5; // percent of pixels

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null;
const targets = only ? SCREENS.filter((s) => only.has(s.id)) : SCREENS;

function read(path) {
  return PNG.sync.read(readFileSync(path));
}

/**
 * Scale/crop the two images to a common size. The design export is 780x1688
 * and the capture is 780x1684 (or the other way round); rather than resample,
 * we crop both to the smaller common area so a 4px difference at the bottom
 * does not inflate the score.
 */
function align(a, b) {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const crop = (img) => {
    if (img.width === width && img.height === height) return img;
    const out = new PNG({ width, height });
    PNG.bitblt(img, out, 0, 0, width, height, 0, 0);
    return out;
  };
  return { a: crop(a), b: crop(b), width, height };
}

function writeSideBySide(ref, actual, path) {
  const gap = 16;
  const height = Math.max(ref.height, actual.height);
  const width = ref.width + gap + actual.width;
  const out = new PNG({ width, height });
  // Fill the gutter with a neutral grey so the seam is obvious.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (width * y + x) << 2;
      out.data[i] = 0xf4;
      out.data[i + 1] = 0xf6;
      out.data[i + 2] = 0xf5;
      out.data[i + 3] = 255;
    }
  }
  PNG.bitblt(ref, out, 0, 0, ref.width, ref.height, 0, 0);
  PNG.bitblt(actual, out, 0, 0, actual.width, actual.height, ref.width + gap, 0);
  writeFileSync(path, PNG.sync.write(out));
}

/**
 * Crop a PNG to a horizontal slice [y0, y1).
 */
function cropRows(img, y0, y1) {
  const height = y1 - y0;
  const out = new PNG({ width: img.width, height });
  PNG.bitblt(img, out, 0, y0, img.width, height, 0, 0);
  return out;
}

/**
 * Differing-pixel share for each horizontal band, so a report can say *where*
 * a screen drifts.
 *
 * pixelmatch writes the full composite into its output buffer (unchanged
 * pixels included), so the band score cannot be read off that buffer. Each
 * band is diffed on its own instead, which uses the same comparison the
 * headline number does.
 */
function bandScores(a, b, width, height, bands = 6) {
  const bandH = Math.floor(height / bands);
  const scores = [];
  for (let i = 0; i < bands; i += 1) {
    const y0 = i * bandH;
    const y1 = i === bands - 1 ? height : y0 + bandH;
    const ca = cropRows(a, y0, y1);
    const cb = cropRows(b, y0, y1);
    const scratch = new PNG({ width, height: y1 - y0 });
    const changed = pixelmatch(ca.data, cb.data, scratch.data, width, y1 - y0, {
      threshold: THRESHOLD,
      includeAA: false,
    });
    const total = width * (y1 - y0);
    scores.push({ from: y0, to: y1, pct: total ? (changed / total) * 100 : 0 });
  }
  return scores;
}

const results = [];

for (const screen of targets) {
  if (!screen.ref) {
    results.push({ id: screen.id, name: screen.name, status: 'no-reference' });
    console.log(`[diff] ${screen.id}: no design frame to compare against (review only)`);
    continue;
  }

  const refPath = join(designRoot, screen.ref);
  const actualPath = join(outDir, `${screen.id}.actual.png`);

  if (!existsSync(refPath)) {
    results.push({ ...screen, status: 'no-reference' });
    console.log(`[diff] ${screen.id}: missing reference ${screen.ref}`);
    continue;
  }
  if (!existsSync(actualPath)) {
    results.push({ ...screen, status: 'not-captured' });
    console.log(`[diff] ${screen.id}: not captured yet`);
    continue;
  }

  const ref = read(refPath);
  const actual = read(actualPath);
  const { a, b, width, height } = align(ref, actual);

  const diff = new PNG({ width, height });
  const changed = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold: THRESHOLD,
    includeAA: false,
    alpha: 0.35,
    diffColor: [255, 32, 96],
    aaColor: [255, 200, 0],
  });

  const total = width * height;
  const pct = (changed / total) * 100;

  writeFileSync(join(outDir, `${screen.id}.heat.png`), PNG.sync.write(diff));
  writeSideBySide(a, b, join(outDir, `${screen.id}.side.png`));

  const bands = bandScores(a, b, width, height);
  results.push({
    id: screen.id,
    name: screen.name,
    status: pct <= GATE ? 'pass' : 'fail',
    pct: Number(pct.toFixed(3)),
    changed,
    total,
    gate: GATE,
    size: { width, height },
    bands: bands.map((x) => ({ ...x, pct: Number(x.pct.toFixed(2)) })),
  });

  const verdict = pct <= GATE ? 'PASS' : 'FAIL';
  console.log(
    `[diff] ${verdict} ${screen.id}: ${pct.toFixed(2)}% differ (${changed.toLocaleString()} px) — gate ${GATE}%`
  );
  const worst = bands.reduce((m, x) => (x.pct > m.pct ? x : m), bands[0]);
  if (worst.pct > 0) {
    console.log(
      `        worst band y=${worst.from}-${worst.to}: ${worst.pct.toFixed(1)}%`
    );
  }
}

writeFileSync(
  join(outDir, 'report.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), gate: GATE, results }, null, 2)
);

const scored = results.filter((r) => typeof r.pct === 'number');
const failing = scored.filter((r) => r.pct > GATE);
console.log(
  `\n[diff] ${scored.length - failing.length}/${scored.length} screens within the ${GATE}% gate`
);
if (failing.length) {
  console.log('[diff] over gate: ' + failing.map((f) => `${f.id} (${f.pct}%)`).join(', '));
  process.exitCode = 1;
}

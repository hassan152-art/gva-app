/**
 * Screenshots every registered screen from the running web build.
 *
 *   node capture.js [--only=07-sign-in,01-home-impact]
 *
 * Output: design/diffs/<id>.actual.png at 2x (780x1684, matching the design
 * exports). Also writes design/diffs/_state.json with any console errors so a
 * blank render is diagnosable rather than mysterious.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './browser.js';
import { SCREENS, VIEWPORT } from './screens.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const outDir = join(repoRoot, 'design', 'diffs');
mkdirSync(outDir, { recursive: true });

const BASE = process.env.APP_URL || 'http://127.0.0.1:8081';
const API = process.env.API_URL || 'http://127.0.0.1:4000';
const EMAIL = process.env.DEMO_EMAIL || 'fardeen@gazavirtualadoption.org';
const PASSWORD = process.env.DEMO_PASSWORD || 'Gaza2026!';

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null;
const targets = only ? SCREENS.filter((s) => only.has(s.id)) : SCREENS;

/** Fetch a token so protected screens render live data. */
async function getToken() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`cannot sign in for capture: ${res.status} ${await res.text()}`);
  const { token } = await res.json();
  return token;
}

async function main() {
  if (!existsSync(join(repoRoot, 'mobile', 'dist', 'index.html'))) {
    throw new Error('mobile/dist missing — run "npm run export:web" in mobile/ first');
  }

  const token = await getToken();
  const browser = await launch();
  const state = { capturedAt: new Date().toISOString(), screens: [] };

  try {
    for (const screen of targets) {
      const page = await browser.newPage();
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(String(err)));

      await page.setViewport({ ...VIEWPORT });

      // Seed the session into localStorage before any app code runs.
      if (screen.auth) {
        await page.evaluateOnNewDocument((t) => {
          window.localStorage.setItem('gva.session', t);
        }, token);
      } else {
        await page.evaluateOnNewDocument(() => {
          window.localStorage.removeItem('gva.session');
        });
      }

      const url = `${BASE}${screen.route}`;
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });

      // Wait for the Inter webfont, otherwise text metrics are the fallback's.
      await page
        .evaluate(
          () =>
            new Promise((resolve) => {
              const done = () => document.fonts.ready.then(() => resolve(true));
              if (document.fonts?.status === 'loaded') return done();
              setTimeout(done, 3000);
            })
        )
        .catch(() => {});

      if (screen.scrollY) {
        await page.evaluate((y) => {
          const el = document.scrollingElement || document.body;
          el.scrollTop = y;
          // Some builds scroll an inner container; nudge it too.
          document.querySelectorAll('div').forEach((d) => {
            if (d.scrollHeight > d.clientHeight + 40) d.scrollTop = y;
          });
        }, screen.scrollY);
        await new Promise((r) => setTimeout(r, 450));
      }

      // Let data requests settle and layout stabilise.
      await new Promise((r) => setTimeout(r, 700));

      const file = join(outDir, `${screen.id}.actual.png`);
      await page.screenshot({ path: file, type: 'png', captureBeyondViewport: false });

      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 240));
      state.screens.push({
        id: screen.id,
        route: screen.route,
        file,
        consoleErrors: consoleErrors.slice(0, 6),
        bodyPreview: bodyText.replace(/\s+/g, ' ').trim(),
      });
      console.log(`[capture] ${screen.id} -> ${file}${consoleErrors.length ? ` (${consoleErrors.length} console errors)` : ''}`);
      if (consoleErrors.length) console.log(`          ${consoleErrors[0].slice(0, 200)}`);

      await page.close();
    }
  } finally {
    await browser.close();
    writeFileSync(join(outDir, '_state.json'), JSON.stringify(state, null, 2));
  }
}

main().catch((err) => {
  console.error('[capture] failed:', err.message);
  process.exit(1);
});

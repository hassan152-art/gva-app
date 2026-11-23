/**
 * Drives the real UI in a browser to prove the flows work, not just that the
 * screens render.
 *
 *   node scripts/visual/flows.js
 *
 * Requires the web build served on :8081 and the API on :4000.
 * Exits non-zero if any flow fails.
 */
import { launch } from './browser.js';

const BASE = process.env.APP_URL || 'http://127.0.0.1:8081';
const API = process.env.API_URL || 'http://127.0.0.1:4000';
const EMAIL = process.env.DEMO_EMAIL || 'fardeen@gazavirtualadoption.org';
const PASSWORD = process.env.DEMO_PASSWORD || 'Gaza2026!';

let passed = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait until the page's text contains something, or time out. */
async function waitForText(page, needle, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const text = await page.evaluate(() => document.body.innerText);
    if (text.includes(needle)) return true;
    await sleep(200);
  }
  return false;
}

/**
 * Click the control labelled `text`.
 *
 * React Native Web renders a Pressable as a div with role="button" and a
 * sibling text node, and our design labels carry pointer-events:none so the
 * label never steals the click. So the reliable strategy is: find the element
 * whose accessible label / aria-label / innerText matches, then dispatch the
 * click from the *outermost* pressable ancestor.
 */
async function clickText(page, text) {
  return page.evaluate((t) => {
    const all = Array.from(document.querySelectorAll('*'));

    const matches = (n) => {
      const label = n.getAttribute && (n.getAttribute('aria-label') || n.getAttribute('aria-labelledby'));
      if (label && label.trim() === t) return true;
      // only leaf-ish nodes, otherwise every ancestor "contains" the text
      const own = n.childElementCount === 0 ? (n.textContent || '').trim() : '';
      return own === t;
    };

    const hits = all.filter(matches);
    if (!hits.length) return false;

    for (const hit of hits) {
      // Walk up to the nearest pressable container.
      let el = hit;
      for (let i = 0; i < 6 && el; i += 1) {
        const role = el.getAttribute && el.getAttribute('role');
        const interactive = role === 'button' || role === 'tab' || role === 'link' || role === 'checkbox';
        if (interactive) {
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return true;
        }
        el = el.parentElement;
      }
    }

    // Fall back to dispatching on the match itself.
    hits[hits.length - 1].dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
    );
    return true;
  }, text);
}

/** Click by an explicit accessible label, preferring role="button". */
async function clickLabel(page, label) {
  return page.evaluate((l) => {
    const el = Array.from(document.querySelectorAll('[aria-label]')).find(
      (n) => n.getAttribute('aria-label') === l
    );
    if (!el) return false;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  }, label);
}

async function main() {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  try {
    console.log('\nUI flow checks\n');

    // ---- unauthenticated users land on welcome -------------------------
    await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(1200);
    check(
      'signed-out users see the brand splash',
      await page.evaluate(
        () =>
          !!document.querySelector('[aria-label="Virtual Adoption"]') ||
          !!Array.from(document.querySelectorAll('img')).some((el) => el.alt === 'Virtual Adoption'),
      ),
    );
    await sleep(2200);
    check('splash advances to sign in', await waitForText(page, 'Welcome back'));

    // ---- sign in with the demo account --------------------------------
    await page.evaluate(
      ({ email, password }) => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const set = (el, value) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        if (inputs[0]) set(inputs[0], email);
        if (inputs[1]) set(inputs[1], password);
      },
      { email: EMAIL, password: PASSWORD }
    );
    await sleep(300);
    await clickText(page, 'Sign in');
    await sleep(2500);
    check('signing in reaches Home', await waitForText(page, 'Welcome back, Fardeen'));
    check('Home shows community impact', await waitForText(page, 'Our impact'));
    check('Home shows the open batch', await waitForText(page, 'Your December batch 1 is open'));

    // ---- Sponsor tab: carousel + one row per child ---------------------
    await clickText(page, 'Sponsor');
    await sleep(2500);
    check('Sponsor tab opens', await waitForText(page, 'Sponsor a child'));
    check('carousel carries hadith content', await waitForText(page, 'Sahih al-Bukhari'));
    check('the orphan list is populated', await waitForText(page, 'OR'));
    check('rows offer Sponsor Now', await waitForText(page, 'Sponsor Now'));
    check('rows quote the published price', await waitForText(page, 'PKR 30,000'));

    // the carousel must auto-advance on its own
    const scrollBefore = await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Highlights"]');
      return el ? el.scrollLeft : -1;
    });
    await sleep(7000);
    const scrollAfter = await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Highlights"]');
      return el ? el.scrollLeft : -1;
    });
    check(
      'carousel auto-advances',
      scrollBefore >= 0 && scrollAfter > scrollBefore,
      `${scrollBefore} -> ${scrollAfter}`
    );

    // posters must actually load, not merely be referenced
    const posters = await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img')).filter((i) =>
        String(i.src || '').includes('/uploads/orphans/')
      );
      if (!imgs.length) return { count: 0, ok: false };
      await Promise.all(
        imgs.map((i) => (i.complete ? null : new Promise((res) => { i.onload = res; i.onerror = res; })))
      );
      return { count: imgs.length, ok: imgs.every((i) => i.naturalWidth > 0) };
    });
    check('official posters load', posters.ok && posters.count > 0, JSON.stringify(posters));

    await clickText(page, 'Home');
    await sleep(1500);

    // ---- navigate to payments -----------------------------------------
    await clickText(page, 'Payments');
    await sleep(2000);
    check('Payments opens multi-pay', await waitForText(page, 'Select orphans & enter amount'));
    check('the orphan list is populated from the API', await waitForText(page, 'OR575'));
    check('the order summary shows the batch total', await waitForText(page, 'PKR 30,000'));

    // ---- open the proof sheet and submit ------------------------------
    await clickText(page, 'Submit payment proof');
    await sleep(1200);
    check('the proof sheet opens', await waitForText(page, 'Tap to upload your transfer screenshot'));

    // Submitting with no file attached must show the guard message.
    await clickText(page, 'Submit for verification');
    await sleep(800);
    check('submitting with no file is rejected inline', await waitForText(page, 'Attach your transfer screenshot first'));

    await clickText(page, 'Close');
    await sleep(800);

    // ---- history ------------------------------------------------------
    await clickText(page, 'Donation history');
    await sleep(2000);
    check('history opens', await waitForText(page, 'Giving summary'));
    check('history shows the lifetime total', await waitForText(page, 'PKR 300,000'));
    check('history lists the design rows', await waitForText(page, 'Monthly sponsorship'));

    // ---- profile ------------------------------------------------------
    await clickText(page, 'Profile');
    await sleep(2000);
    check('profile opens', await waitForText(page, 'Change password'));
    check('profile shows account details', await waitForText(page, EMAIL));

    // ---- change password round-trip -----------------------------------
    const newPass = 'Gaza2026!ui9';
    await page.evaluate((vals) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const set = (el, value) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      // three password fields live in the change-password card
      const pw = inputs.filter((i) => i.type === 'password');
      if (pw[0]) set(pw[0], vals.current);
      if (pw[1]) set(pw[1], vals.next);
      if (pw[2]) set(pw[2], vals.next);
    }, { current: PASSWORD, next: newPass });
    await sleep(300);
    await clickText(page, 'Update password');
    await sleep(2500);
    check('changing the password succeeds', await waitForText(page, 'Password updated'));

    // Prove it really changed, then restore it.
    const login = async (pw) => {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: pw }),
      });
      return res.status;
    };
    check('the new password works against the API', (await login(newPass)) === 200);
    check('the old password no longer works', (await login(PASSWORD)) === 401);
    check('restored the demo password', (await login(newPass)) === 200 && (await restore(newPass)) === 200);

    // ---- sign out -----------------------------------------------------
    await clickText(page, 'Sign out');
    await sleep(2000);
    check('signing out returns to sign in', await waitForText(page, 'Welcome back'));

    check('no uncaught console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));
  } finally {
    await browser.close();
  }

  console.log(`\n${'-'.repeat(60)}`);
  if (failures.length) {
    console.log(`${passed} passed, ${failures.length} FAILED`);
    for (const f of failures) console.log(`  x ${f}`);
    process.exit(1);
  }
  console.log(`all ${passed} UI flow checks passed`);
}

/** Put the demo password back so the fixture stays as seeded. */
async function restore(currentPassword) {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: currentPassword }),
  });
  if (!loginRes.ok) return 0;
  const { token } = await loginRes.json();
  const res = await fetch(`${API}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword: PASSWORD, confirmPassword: PASSWORD }),
  });
  return res.status;
}

main().catch((err) => {
  console.error('\nflow run crashed:', err.message);
  process.exit(1);
});

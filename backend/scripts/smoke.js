/**
 * End-to-end API smoke test against a running server.
 *
 *   node scripts/smoke.js [baseUrl]
 *
 * Exercises the whole surface the app uses, in the order the app uses it:
 * content, sign in, impact, orphans, the sponsor list, history, summary,
 * submitting a payment with a proof upload, validation, profile, and the
 * password round trip.
 *
 * Exits non-zero with a readable report on failure.
 */
const base = (process.argv[2] || 'http://127.0.0.1:4000').replace(/\/$/, '');

const EMAIL = 'fardeen@gazavirtualadoption.org';
const PASSWORD = 'Gaza2026!';
const TEMP_PASSWORD = 'Gaza2026!temp9';

const ADMIN_EMAIL = 'rauf@appick.com';
const ADMIN_PASSWORD = 'rauf#123456';

/** The published sponsorship price and the derived demo figures. */
const MONTHLY = 30000;
const SPONSORED_COUNT = 3;
const BATCH_MINIMUM = MONTHLY * SPONSORED_COUNT; // 90,000
const LIFETIME_TOTAL = 300000;
const LIFETIME_DONATIONS = 9;
const LIFETIME_AVERAGE = 100000;

let passed = 0;
const failures = [];
let token = null;

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push({ name, detail });
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${base}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text };
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`\nAPI smoke test against ${base}\n`);

  // ---- official content --------------------------------------------------
  console.log('official content (from gazavirtualadoption.org)');
  const carousel = await api('/orphans/carousel', { auth: false });
  const slides = carousel.data?.slides || [];
  check('carousel responds', carousel.status === 200, `got ${carousel.status}`);
  check('carousel has slides', slides.length >= 3, String(slides.length));
  check(
    'carousel carries hadith',
    slides.some((s) => s.kind === 'hadith' && Boolean(s.arabic) && Boolean(s.reference)),
    JSON.stringify(slides.map((s) => s.kind))
  );
  check(
    'hadith slides carry Arabic and a reference',
    slides
      .filter((s) => s.kind === 'hadith')
      .every((s) => s.arabic && s.reference),
  );
  check(
    'carousel carries the program story',
    slides.some((s) => s.kind === 'program' && Boolean(s.title)),
    JSON.stringify(slides.map((s) => s.title).filter(Boolean))
  );

  const hadith = await api('/orphans/hadith', { auth: false });
  check('hadith collection responds', hadith.status === 200);
  check('hadith collection has entries', (hadith.data?.hadiths || []).length >= 3, String((hadith.data?.hadiths || []).length));
  check(
    'hadith entries are complete',
    (hadith.data?.hadiths || []).every((h) => h.arabic && h.translation && h.reference)
  );

  // ---- auth --------------------------------------------------------------
  console.log('\nauth');
  const badLogin = await api('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email: EMAIL, password: 'wrong-password' },
  });
  check('wrong password is rejected with 401', badLogin.status === 401, `got ${badLogin.status}`);

  const login = await api('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email: EMAIL, password: PASSWORD },
  });
  check('demo account signs in', login.status === 200 && !!login.data.token, `got ${login.status}`);
  token = login.data?.token;
  check('signed-in user is Fardeen', login.data?.user?.fullName === 'Fardeen', login.data?.user?.fullName);

  // ---- impact ------------------------------------------------------------
  console.log('\nimpact tiles');
  const impact = await api('/me/impact');
  check('impact responds', impact.status === 200, `got ${impact.status}`);
  check(`${SPONSORED_COUNT} children sponsored`, impact.data?.sponsored === SPONSORED_COUNT, String(impact.data?.sponsored));
  check(
    'the batch total is monthly x sponsored children',
    impact.data?.batchTotal?.amount === BATCH_MINIMUM,
    String(impact.data?.batchTotal?.amount)
  );
  check(
    'lifetime giving is reported separately',
    impact.data?.lifetimeGiven?.amount === LIFETIME_TOTAL,
    String(impact.data?.lifetimeGiven?.amount)
  );
  check(
    'the batch minimum matches the sponsorship price',
    impact.data?.batch?.minimum?.amount === BATCH_MINIMUM,
    String(impact.data?.batch?.minimum?.amount)
  );
  check('waiting count is exposed for the Sponsor tab', typeof impact.data?.waiting === 'number', String(impact.data?.waiting));

  // ---- orphans -----------------------------------------------------------
  console.log('\nsponsored children');
  const active = await api('/orphans/active');
  check(`${SPONSORED_COUNT} active orphans`, active.data?.orphans?.length === SPONSORED_COUNT, String(active.data?.orphans?.length));
  const sponsored = active.data?.orphans || [];
  check('every sponsored child has a code', sponsored.every((o) => Boolean(o.code)), JSON.stringify(sponsored.map((o) => o.code)));
  check(
    'every sponsored child has a poster',
    sponsored.every((o) => Boolean(o.posterUrl)),
    JSON.stringify(sponsored.map((o) => o.posterUrl))
  );
  check(
    `monthly amount is PKR ${MONTHLY.toLocaleString('en-US')}`,
    sponsored.every((o) => o.monthlyAmount?.amount === MONTHLY),
    JSON.stringify(sponsored.map((o) => o.monthlyAmount?.amount))
  );

  console.log('\nsponsor list');
  const available = await api('/orphans/available', { auth: false });
  check('available candidates respond', available.status === 200, `got ${available.status}`);
  const candidates = available.data?.orphans || [];
  check('there are children waiting', candidates.length > 0, String(candidates.length));
  check('every candidate is waiting', candidates.every((o) => o.status === 'waiting'));
  check('every candidate has a code', candidates.every((o) => Boolean(o.code)));
  check('every candidate has a poster', candidates.every((o) => Boolean(o.posterUrl)));
  check(
    'every candidate quotes the same price',
    candidates.every((o) => o.monthlyAmount?.amount === MONTHLY),
    JSON.stringify([...new Set(candidates.map((o) => o.monthlyAmount?.amount))])
  );
  check('the total waiting count is exposed', typeof available.data?.totalWaiting === 'number');

  // A poster must actually be served, not just referenced.
  const posterPath = candidates[0]?.posterUrl;
  if (posterPath) {
    const poster = await fetch(`${base}${posterPath}`);
    const bytes = Buffer.from(await poster.arrayBuffer());
    check('the first candidate poster downloads', poster.status === 200, String(poster.status));
    check('the poster is a real JPEG', bytes.length > 1000 && bytes[0] === 0xff && bytes[1] === 0xd8, `${bytes.length} bytes`);
  }

  // ---- history -----------------------------------------------------------
  console.log('\ndonation history');
  const history = await api('/payments');
  check('12 records in total', history.data?.count === 12, String(history.data?.count));
  const rows = history.data?.payments || [];
  const verified = rows.filter((p) => p.status === 'completed');
  check(`${LIFETIME_DONATIONS} verified donations`, verified.length === LIFETIME_DONATIONS, String(verified.length));
  check('rows are newest-first', rows[0]?.dateLabel === 'Oct 24, 2026', rows[0]?.dateLabel);
  const monthly = rows.find((p) => p.title === 'Monthly sponsorship' && p.dateLabel === 'Oct 20, 2026');
  check('the monthly run covers all sponsored children', monthly?.subtitle === 'All sponsored · 3 orphans', monthly?.subtitle);
  check(
    'the monthly run equals monthly x children',
    monthly?.amount?.amount === BATCH_MINIMUM,
    String(monthly?.amount?.amount)
  );

  const summary = await api('/payments/summary');
  check(`summary total is PKR ${LIFETIME_TOTAL.toLocaleString('en-US')}`, summary.data?.totalGiven?.amount === LIFETIME_TOTAL, String(summary.data?.totalGiven?.amount));
  check(`summary shows ${LIFETIME_DONATIONS} donations`, summary.data?.donations === LIFETIME_DONATIONS, String(summary.data?.donations));
  check(`summary average is PKR ${LIFETIME_AVERAGE.toLocaleString('en-US')} / month`, summary.data?.averagePerMonth?.amount === LIFETIME_AVERAGE, String(summary.data?.averagePerMonth?.amount));

  const ranged = await api('/payments?from=2026-10-01&to=2026-10-31');
  check(
    'an explicit date range narrows the list',
    ranged.status === 200 && ranged.data.count > 0 && ranged.data.count < 12,
    String(ranged.data?.count)
  );
  const byOrphan = await api(`/payments?orphanId=${sponsored[0]?.id}`);
  check('orphan filter narrows the list', byOrphan.status === 200 && byOrphan.data.count < 12, String(byOrphan.data?.count));

  // ---- submit a payment with proof --------------------------------------
  console.log('\nmulti-pay submission with proof');
  const allocations = sponsored.map((o) => ({ orphanId: Number(o.id), amount: MONTHLY }));
  const form = new FormData();
  form.set('allocations', JSON.stringify(allocations));
  form.set('method', 'bank_transfer');
  form.set('note', 'Smoke test reference 99123');
  form.set('proof', new Blob([Buffer.from('fake-png-bytes')], { type: 'image/png' }), 'proof.png');

  const submitted = await api('/payments', { method: 'POST', body: form });
  check('payment submitted', submitted.status === 201, `got ${submitted.status}: ${submitted.data?.error || ''}`);
  check(
    'submitted total equals monthly x children',
    submitted.data?.payment?.amount?.amount === BATCH_MINIMUM,
    String(submitted.data?.payment?.amount?.amount)
  );
  check('submitted payment is pending', submitted.data?.payment?.status === 'pending', submitted.data?.payment?.status);
  const proofUrl = submitted.data?.payment?.proofUrl;
  check('proof file was stored', !!proofUrl, proofUrl);
  check(
    'proof is a Cloudious/Drive URL or legacy /uploads path',
    !!proofUrl && (/^https?:\/\//i.test(proofUrl) || proofUrl.startsWith('/uploads/')),
    proofUrl
  );
  check(
    'confirmation copy matches the design',
    submitted.data?.message === 'Our team verifies within 24 hours',
    submitted.data?.message
  );

  const createdId = submitted.data?.payment?.id;
  if (createdId) {
    const readBack = await api(`/payments/${createdId}`);
    check('submitted payment reads back', readBack.status === 200 && readBack.data.payment.id === createdId);
    // The stored proof may be a local file path or a remote URL (the upload
    // service can offload media), so only local paths are fetched directly.
    const localProof = [proofUrl, readBack.data?.payment?.proofUrl].find(
      (u) => typeof u === 'string' && u.startsWith('/uploads/')
    );
    if (localProof) {
      const fileRes = await fetch(`${base}${localProof}`);
      check('uploaded proof is downloadable', fileRes.status === 200, String(fileRes.status));
    } else if (proofUrl) {
      check('uploaded proof is stored remotely', /^https?:\/\//i.test(proofUrl), proofUrl);
    }
  }

  // ---- validation --------------------------------------------------------
  console.log('\nvalidation');
  const belowMinimum = await api('/payments', {
    method: 'POST',
    body: (() => {
      const f = new FormData();
      f.set('allocations', JSON.stringify([{ orphanId: Number(sponsored[0].id), amount: 1000 }]));
      f.set('method', 'bank_transfer');
      return f;
    })(),
  });
  check('order below the batch minimum is rejected', belowMinimum.status === 422, `got ${belowMinimum.status}`);

  const wrongOwner = await api('/payments', {
    method: 'POST',
    body: (() => {
      const f = new FormData();
      const notMine = candidates[0]?.id;
      f.set('allocations', JSON.stringify(notMine ? [{ orphanId: Number(notMine), amount: MONTHLY }] : []));
      f.set('method', 'bank_transfer');
      return f;
    })(),
  });
  check('a child the user does not sponsor is rejected', wrongOwner.status === 422, `got ${wrongOwner.status}`);

  const noOrphans = await api('/payments', {
    method: 'POST',
    body: (() => {
      const f = new FormData();
      f.set('allocations', '[]');
      return f;
    })(),
  });
  check('empty allocation is rejected', noOrphans.status === 422, `got ${noOrphans.status}`);

  const weakRegister = await api('/auth/register', {
    method: 'POST',
    auth: false,
    body: { fullName: 'A', email: 'not-an-email', phone: '12', password: 'short' },
  });
  check('weak registration is rejected with field errors', weakRegister.status === 422 && !!weakRegister.data.errors, String(weakRegister.status));

  const unauth = await fetch(`${base}/me/impact`);
  check('unauthenticated request is rejected', unauth.status === 401, String(unauth.status));

  // ---- profile + password ------------------------------------------------
  console.log('\nprofile + change password');
  const profile = await api('/profile');
  check('profile loads', profile.status === 200 && profile.data.user.email === EMAIL);
  check('profile exposes pending count', typeof profile.data?.stats?.pending === 'number');

  const changed = await api('/auth/change-password', {
    method: 'POST',
    body: { currentPassword: PASSWORD, newPassword: TEMP_PASSWORD, confirmPassword: TEMP_PASSWORD },
  });
  check('password change succeeds', changed.status === 200, `got ${changed.status}: ${changed.data?.error || ''}`);

  const oldFails = await api('/auth/login', { method: 'POST', auth: false, body: { email: EMAIL, password: PASSWORD } });
  check('the old password no longer works', oldFails.status === 401, String(oldFails.status));

  const newWorks = await api('/auth/login', { method: 'POST', auth: false, body: { email: EMAIL, password: TEMP_PASSWORD } });
  check('the new password works', newWorks.status === 200, String(newWorks.status));

  token = newWorks.data?.token;
  const restored = await api('/auth/change-password', {
    method: 'POST',
    body: { currentPassword: TEMP_PASSWORD, newPassword: PASSWORD, confirmPassword: PASSWORD },
  });
  check('demo password restored', restored.status === 200, `got ${restored.status}`);

  // ---- admin CRUD (organization web) -----------------------------------
  console.log('\nadmin API (PostgreSQL)');
  const sponsorBlocked = await api('/admin/organizations');
  check('sponsor token cannot access admin API', sponsorBlocked.status === 403, String(sponsorBlocked.status));

  const adminLogin = await api('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  check('admin demo account signs in', adminLogin.status === 200 && !!adminLogin.data.token, `got ${adminLogin.status}`);
  token = adminLogin.data?.token;
  check('signed-in user is admin', adminLogin.data?.user?.role === 'admin', adminLogin.data?.user?.role);

  const orgList = await api('/admin/organizations');
  check('organizations list responds', orgList.status === 200, `got ${orgList.status}`);
  check('organizations list is an array', Array.isArray(orgList.data?.organizations));

  const orgCode = `SMOKE-${Date.now()}`;
  const orgCreate = await api('/admin/organizations', {
    method: 'POST',
    body: { name: 'Smoke Test Org', code: orgCode, email: 'smoke@test.local' },
  });
  check('organization create', orgCreate.status === 201 && orgCreate.data?.organization?.id, `got ${orgCreate.status}`);
  const orgId = orgCreate.data?.organization?.id;

  if (orgId) {
    const orgPatch = await api(`/admin/organizations/${orgId}`, {
      method: 'PATCH',
      body: { name: 'Smoke Test Org Updated' },
    });
    check('organization update', orgPatch.status === 200, `got ${orgPatch.status}`);

    const orgDel = await api(`/admin/organizations/${orgId}`, { method: 'DELETE' });
    check('organization delete', orgDel.status === 200 && orgDel.data?.ok === true, `got ${orgDel.status}`);
  }

  const sponsors = await api('/admin/sponsors');
  check('sponsors list responds', sponsors.status === 200, `got ${sponsors.status}`);
  check('sponsors list is an array', Array.isArray(sponsors.data?.sponsors));

  const orphans = await api('/admin/orphans?kind=orphan');
  check('orphans list responds', orphans.status === 200, `got ${orphans.status}`);
  check('orphans list is an array', Array.isArray(orphans.data?.orphans));

  // ---- cleanup -----------------------------------------------------------
  if (createdId) {
    const { pool } = await import('../src/db/index.js');
    await pool.query('DELETE FROM payments WHERE id = $1', [createdId]);
    await pool.end();
    console.log('\ncleanup: removed the smoke-test payment');
  }

  console.log(`\n${'─'.repeat(60)}`);
  if (failures.length) {
    console.log(`${passed} passed, ${failures.length} FAILED`);
    for (const f of failures) console.log(`  x ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
    process.exit(1);
  }
  console.log(`all ${passed} checks passed`);
}

main().catch((err) => {
  console.error('\nsmoke test crashed:', err);
  process.exit(1);
});

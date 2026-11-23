# Gaza Virtual Adoption

Mobile app (React Native / Expo) and API (Node.js + PostgreSQL) for the Gaza
Virtual Adoption sponsorship programme, built to match the FigCraft design board
`gaza-virtual-adoption.figcraft` exactly.

```
gva-app/
├─ backend/          Express 5 + PostgreSQL API
├─ mobile/           Expo SDK 58 app (expo-router)
├─ design/           design tokens, per-layer specs, reference renders, diffs
└─ scripts/visual/   screenshot + pixel-diff harness
```

## Requirements

- Node.js 20+ (developed on 24.22)
- No system PostgreSQL needed for development: the backend runs a bundled
  PostgreSQL 18 server from `backend/node_modules`

## Backend

```powershell
cd backend
npm install
copy .env.example .env      # then edit if you want different credentials
npm run db:up               # starts the local PostgreSQL server
npm run db:reset            # applies migrations and seeds the demo data
npm run dev                 # http://127.0.0.1:4000
```

Verify the whole API surface against the running server:

```powershell
node scripts/smoke.js
```

Demo accounts created by the seed:

| Email | Password | Notes |
|---|---|---|
| `rauf@appick.com` | `rauf#123456` | Web login demo (`admin`) → home after sign-in |
| `fardeen@gazavirtualadoption.org` | `Gaza2026!` | Mobile / sponsor demo data |

To add or refresh only the web demo user: `npm run seed:web-demo` (from `backend/`).

### File uploads (Cloudious)

Payment proofs upload through **Cloudious** into Google Drive folder **`GVA-APP`**
(server-side only — the mobile app still posts multipart to `POST /payments`).

Set in `backend/.env`:

| Variable | Purpose |
|---|---|
| `CLOUDIOUS_API_KEY` | Required in production (`x-api-key` header) |
| `CLOUDIOUS_UPLOAD_URL` | Default `https://gdrive.cloudious.net/upload` |
| `CLOUDIOUS_DEV_STUB` | In dev, stub uploads when no API key (default). Set `false` to require a real key locally |

API responses include `proofUrl` (stored Drive link) and `proofThumbnailUrl` (lh3 width transform for images).

### Pointing at your own database

Put your credentials in `backend/.env`. Either a single URL:

```
DATABASE_URL=postgres://user:password@host:5432/dbname
```

or the individual `PGHOST` / `PGPORT` / `PGDATABASE` / `PGUSER` / `PGPASSWORD`
fields. Set `PGSSL=true` for a managed host that requires TLS. With a real
database you only need `npm run migrate` and `npm run seed` — `npm run db:up`
is local development only.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create an account, returns a JWT |
| POST | `/auth/login` | Sign in, returns a JWT |
| GET | `/auth/me` | Current account |
| POST | `/auth/change-password` | Change password (verifies the current one) |
| POST | `/auth/forgot-password` | Acknowledged without revealing whether the email exists |
| GET | `/me/impact` | Home impact tiles + the open batch |
| GET | `/orphans/active` | Children the user sponsors |
| GET | `/orphans/available` | Children waiting for a sponsor |
| GET | `/orphans/:id` | One child |
| GET | `/payments` | Donation history (`orphanId`, `from`, `to`) |
| GET | `/payments/summary` | Giving-summary totals |
| POST | `/payments` | Submit a multi-pay order with proof (multipart) |
| GET | `/profile` | Profile + lifetime totals |
| PATCH | `/profile` | Update name / phone |
| POST | `/profile/avatar` | Profile photo (multipart `file`, JPG/PNG, Cloudious) |

**Admin (web Organization menu, JWT + `role: admin`)** — backed by PostgreSQL (`organizations`, `users`, `orphans`, etc.):

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/admin/organizations` | List / create partner organizations |
| GET/PATCH/DELETE | `/admin/organizations/:id` | Read / update / delete organization |
| GET/POST | `/admin/sponsors` | List / create sponsor user accounts |
| GET/PATCH/DELETE | `/admin/sponsors/:id` | Read / update / delete sponsor |
| GET/POST | `/admin/orphans` | List / create orphan or student records (`?kind=`) |
| GET/PATCH/DELETE | `/admin/orphans/:id` | Read / update / delete record |
| POST/DELETE | `/admin/orphans/:id/photo` | Orphan photo (Cloudious) |
| GET/POST/DELETE | `/admin/orphans/:id/documents` | Orphan documents |

Run migrations `006_organizations.sql`, `005_orphan_record_kind.sql`, `007_orphan_documents.sql` (included in `npm run migrate`).

## Mobile app

```powershell
cd mobile
npm install
npm run web        # or: npx expo start
```

Set the API location with `EXPO_PUBLIC_API_URL` (defaults to
`http://127.0.0.1:4000`; the Android emulator should use `http://10.0.2.2:4000`).

Screens: Sign in, Create account, Home (impact + orphans), Payments (multi-pay
and donation history), the payment-proof sheet, Stripe checkout (UI only), and
Profile with change password.

**Stripe is UI only.** The checkout screen renders exactly as designed and its
Pay button is an intentional stub — see the comment at the press handler in
`mobile/src/app/checkout/stripe.js`.

## Design parity

The app is checked against the design two ways: a pixel diff for layout and a
browser-driven flow test for behaviour. See `design/PARITY.md` for the current
results and the reasoning behind each deliberate deviation.

```powershell
cd mobile
$env:EXPO_PUBLIC_DESIGN_PREVIEW='1'
npx expo export --platform web
node scripts/serve-web.js 8081        # in another shell

cd ..\scripts\visual
npm install
node capture.js                       # screenshots every screen at 390x844 @2x
node diff.js                          # pixel diff vs design/ref, writes heatmaps
node flows.js                         # drives the real UI through every flow
```

`capture`/`diff` write into `design/diffs/`: `<screen>.actual.png`,
`<screen>.heat.png` (changed pixels highlighted) and `<screen>.side.png`
(design | app). A screen passes at ≤1.5% differing pixels.

`flows.js` signs in, walks Home → Payments → the proof sheet → History →
Profile, changes the password, verifies the change against the API, restores it,
signs out, and fails on any uncaught console error.

`EXPO_PUBLIC_DESIGN_PREVIEW=1` draws the iOS status bar and home indicator that
the board includes; unset it for real devices, where the OS provides them.

## Checks

```powershell
cd backend  && node scripts/smoke.js     # 55 API assertions
cd mobile   && npx tsc --noEmit          # types
cd mobile   && npx eslint src            # lint (0 errors)
cd mobile   && npx expo-doctor           # 20/20 project checks
```

## Notes on this machine

- The bundled PostgreSQL binaries need the Microsoft VC++ runtime.
  `backend/scripts/ensure-vcruntime.js` copies it next to `postgres.exe` if the
  redistributable is not installed.
- PostgreSQL refuses to start under an administrator/SYSTEM token, so
  `backend/scripts/start-db.js` launches it through Task Scheduler under the
  unprivileged local account `gvapg`. That account needs "Log on as a batch
  job"; the script reports the exact command if the right is missing.

## Kafalat: child profiles, donations and paid/pending report

Web admin (Organization menu):

- **Orphans → 👁 / child name** opens the child profile: details, sponsor, a 12-month
  kafalat tracker (Paid / Partial / Pending / Upcoming / Not due), who donated, and the
  full donation history with date, time (PKT), months, amount (PKR + ≈USD) and status.
  "Add donation", "Print report" and "Download CSV" are on the profile.
- **Kafalat Report** (`/organization/kafalat`) shows, for any month, how many children
  have been paid out of the total, with filters for paid / partial / pending / no sponsor.

Rules (override in `backend/.env`): one month of kafalat = `KAFALAT_MONTHLY_PKR`
(30000, ≈ $100). A month counts as **paid** from `KAFALAT_PAID_MIN_PKR` (27000), so a
payment slightly under $100 is fine; less than that is **partial**. A payment for several
months is split evenly across them. `KAFALAT_PKR_PER_USD` (280) is used for the $ figures.
Months before the sponsor's "Added On" date are **not due**.

Importing the FOP back-office exports: open the `.xls` in Excel → Save As → **CSV UTF-8**,
then either upload it on the Kafalat Report page or run:

```powershell
cd backend
node scripts/import-kafalat.js sponsors  C:\path\Sponsors.csv
node scripts/import-kafalat.js orphans   C:\path\Orphans.csv
node scripts/import-kafalat.js donations C:\path\Submissions.csv
```

Donation CSV columns understood: Orphan Code, Sponsor Name, Sponsor Phone, Months
("October, November"), Year, Amount/Payment, Date (dd/mm/yyyy hh:mm:ss or ISO), ID,
Attachment, Note, Status. Rows with an ID already imported are skipped.

### Importing the FOP "OnlineTransfer Details" export

In the FOP admin (Online Donation → any bank → set the date range → **Export to Excel**),
save the `.xlsx` as CSV UTF-8 and import it as *donations*. The importer understands how
donors actually type codes: `OR 473`, `0R211`, `QR060`, `OROR549`, `ORO45`, `Orphan 442`,
bare numbers (`630`, `607, 609`), several children in one row (`OR079, OR317, OR318` – the
amount is split evenly), retired `SOR###` cases (matched to `DSOR###`), 9-digit child or
guardian ID numbers, and the child's name. Amounts above `KAFALAT_MAX_ROW_PKR` (5,000,000)
are typos in the source; they are kept with a note but do not count. Rows that still cannot
be matched appear under **Submissions not matched to a child** on the Kafalat Report, where
you can link each one to the right code. Re-importing the same export skips existing rows.

### FOP Management menu

Sidebar → **FOP Management** mirrors the FOP back-office:

| Page | Path | What it shows |
|---|---|---|
| Sponsors | `/fop/sponsors` | 611 sponsors, their children, paid/pending this month; click for the sponsor profile (children × 12-month tracker, donations, reminders) |
| Orphan Profiles | `/organization/orphans` | child profiles (see above) |
| Send Reminder | `/fop/send-reminder` | sponsors with pending children for a month; editable message with `{name}` `{children}` `{month}` `{amount}`; per-sponsor WhatsApp button (opens wa.me with the text), copy numbers, CSV, "mark reminded" log |
| Donation Summary | `/fop/donation-summary` | one report per kafalat month: paid of due, received, bank split |
| Online Donation | `/fop/online-donations` | per-bank cards + OnlineTransfer details with date/bank/search filters and export |
| Bank Details | `/fop/banks` | each receiving account, totals, donors, monthly bars |
| Event Submissions | `/fop/events` | event registrations, sources, CSV, import new export |

WhatsApp sending opens one chat at a time in WhatsApp (no automatic bulk sending — that needs
the WhatsApp Business API). Import events with `node scripts/import-kafalat.js events file.csv`.

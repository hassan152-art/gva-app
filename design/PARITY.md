# Design parity

Every designed screen is screenshot at 390×844 with a device pixel ratio of 2,
then compared pixel-for-pixel against the 2× export of its FigCraft frame.

```powershell
cd mobile
$env:EXPO_PUBLIC_DESIGN_PREVIEW='1'
npx expo export --platform web
node scripts/serve-web.js 8081        # separate shell

cd ..\scripts\visual
node capture.js
node diff.js
```

Each screen produces three images in `design/diffs/`:

| File | What it is |
|---|---|
| `<screen>.actual.png` | the app, captured at 2× |
| `<screen>.heat.png` | differing pixels highlighted in pink |
| `<screen>.side.png` | design on the left, app on the right |

A screen passes at **≤ 1.5%** differing pixels. The percentage alone is not the
gate — every pass below was also checked by eye against the side-by-side image,
because a low number can hide a real defect (an early build scored 1.43% with
truncated brand text and a doubled button label).

## Results

The app has moved to a **structural** match rather than a pixel gate: the
product now has a 4-tab bar and a Sponsor screen that the board does not
contain, plus official content and a sponsorship price the board predates. The
scores below are from the last pixel-gated run, before those changes, and are
kept as a record of what the layout matched.

| Screen | Design frame | Diff (last gated run) |
|---|---|---|
| Sign in | 07 · Sign in | 1.32% |
| Create account | 08 · Create account | 0.66% |
| Home — impact | 01 · Home — impact | 1.16% |
| Home — orphans | 02 · Home — orphans | 1.32% |
| Payments — multi-pay | 03 · Payments — multi-pay | 1.43% |
| Payments — history | 04 · Payments — history | 1.32% |
| Payment proof sheet | 05 · Payment proof sheet | 1.12% |
| Stripe checkout | 06 · Stripe checkout | 1.14% |
| Sponsor | — (new screen) | n/a |
| Profile | — (new screen) | n/a |

**8 / 8 designed screens were within the 1.5% gate before the product changes.**

### What changed structurally, and why the gate no longer applies

| Change | Effect on the match |
|---|---|
| 4-tab bar (Home / Sponsor / Payments / Profile) | every screen's tab bar differs from the board's 4-tab bar in label content only — the bar's geometry, pill, icon slot and type are the board's own |
| Sponsor screen | no design frame exists; built from the board's component language |
| Official logo | the board draws a re-drawn lockup; the app now shows the real 606×254 brand artwork |
| PKR 30,000/month | the board says 10,000; the price is now one constant, so totals differ from the board's figures |
| Real content | the board's placeholder children are replaced by the 21 published codes and posters |

`node diff.js` still runs and still reports numbers, and the heatmaps remain a
useful way to spot layout drift on the unchanged parts of a screen. They are no
longer a pass/fail gate.

## What the residual diff was

The residual was anti-aliased text rasterisation. FigCraft draws the board with a
different rasteriser than Chromium's, so glyph edges differ by a subpixel even
when type, size, tracking, position and colour all match. The heatmaps show
coloured *outlines* around letters rather than displaced blocks — that is the
signature of rasterisation, not layout drift.

Structure, position and colour matched exactly: element bounding boxes come from
the per-layer specs in `design/spec/*.json`, which were extracted from the
`.figcraft` document itself (883 layers, absolute x/y/w/h, fills, strokes,
radii, fonts). Screens are laid out with absolute coordinates rather than flex,
so there was nothing to drift.


## How the board maps to the app

| Design frame | Route | Notes |
|---|---|---|
| — | `/welcome` | Tolan-style splash (centered logo + spinner) → sign-in ([Mobbin](https://mobbin.com/screens/ad2b05e4-e5da-418d-9e2c-f8d5c508fade)) |
| 07 · Sign in | `/sign-in` | Real JWT sign-in (layout refreshed; pixel parity vs frame 07 not maintained) |
| 08 · Create account | `/sign-up` | Real registration with validation (layout refreshed) |
| 01 · Home — impact | `/` | Top of the scroll |
| 02 · Home — orphans | `/` (scrolled) | Same screen; the header collapses to the compact wordmark and the orphans block renders as full-width rows |
| 03 · Payments — multi-pay | `/payments/multi-pay` | Live selection, per-child amounts, real upload |
| 04 · Payments — history | `/payments/history` | Live totals and records |
| 05 · Payment proof sheet | `/payments/multi-pay?sheet=proof` | Real multipart upload |
| 06 · Stripe checkout | `/checkout/stripe` | **UI only** — the Pay button is a stub |
| — | `/profile` | New screen, built from the board's own component language |

## Deliberate deviations

1. **Three tabs, not four.** The board's tab bar has Home / Payments / Tickets /
   Profile. The product has three destinations, so the bar keeps its exact
   geometry, active pill, colours and label treatment and distributes three
   items across the same 390pt width. Requested by the user.

2. **Profile is new.** No frame exists for it, so it is composed only from
   components the board already defines (same gutter, content width, card,
   stat tiles, field, buttons, tab bar).

3. **The history list shows verified donations.** The board's rows all carry a
   "Completed" pill and a "View receipt" action, and its count reads "12 records"
   against "9 donations" on the summary card. The list therefore returns the
   member's giving history ordered newest-first by donation date, the count
   reports every record, and proofs awaiting review surface on Profile.

4. **The date fields are a default range, not an applied filter.** The board
   shows Oct 1–25 in the fields while displaying a 28 Sep row. Treating them as
   an unapplied default is the only reading in which the board is internally
   consistent; the API still honours `from`/`to` when a caller sends them.

5. **The status bar and home indicator are mock chrome.** The board draws them
   as part of the frame. They render only when
   `EXPO_PUBLIC_DESIGN_PREVIEW=1` (the parity harness sets it); on a device the
   OS draws its own.

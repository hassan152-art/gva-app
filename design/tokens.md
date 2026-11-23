# Gaza Virtual Adoption — design tokens

Extracted from the FigCraft board `gaza-virtual-adoption.figcraft` (883 layers, 9 frames)
and its generator source `hermes-output/gaza-build/gvalib.py`. These values are the
single source of truth for `mobile/src/theme/tokens.ts` — do not introduce new colours,
sizes or radii that are not listed here.

## Colour

| Token | Hex | Use |
|---|---|---|
| `green` | `#149954` | Primary: buttons, active tab, links, selected chips/checkboxes |
| `greenDeep` | `#0A5D34` | Avatar fill, emphasis on tint |
| `greenLight` | `#1CB364` | Reserved |
| `logoGreen` | `#0E9749` | Wordmark "GAZA / VIRTUAL ADOPTION" |
| `greenText` | `#0C7A44` | Green label text on tint (pill, initials) |
| `greenTextDeep` | `#0A7F45` | Slightly deeper green label |
| `greenInk` | `#12854A` | Icon stroke on tint |
| `heart` | `#ED2C39` | Heart glyph inside the shield mark |
| `orange` | `#EA580C` | Accent ramp base |
| `orangeInk` | `#C2410C` | Pay-now button, Test-mode pill, bell icon |
| `orangeText` | `#7C2D12` | Batch callout title |
| `orangeTextSoft` | `#9A5B33` | Batch callout subtitle |
| `orangeTint` | `#FFF7ED` | Batch callout / warning surface |
| `orangeBorder` | `#F6D9BC` | Batch callout hairline |
| `ink` | `#111827` | Primary text |
| `ink2` | `#4B5563` | Secondary text, field labels |
| `muted` | `#6B7280` | Body muted text |
| `muted2` | `#9CA3AF` | Caption, placeholder, tertiary |
| `placeholder` | `#A6B0B9` | Input placeholder |
| `navIdle` | `#98A2AD` | Inactive tab icon |
| `navIdleLabel` | `#8A94A0` | Inactive tab label |
| `hairline` | `#E6EAEF` | Card border, divider |
| `hairline2` | `#EFF2F4` | Inner divider, nav top border |
| `surface` | `#FFFFFF` | Cards, screens |
| `canvas` | `#F6F8F7` | App background reference |
| `tint` | `#EFF9F2` | Green tint: avatar bg, active pill, icon buttons |
| `tint2` | `#F5FAF7` | Quieter green tint strip |
| `tintBorder` | `#DCEBE1` | Border on tint2 strip |
| `sand` | `#FBF8F3` | Hero block base |
| `successTint` | `#EAF7EF` | "Active"/"Completed" pill bg |
| `fieldAlt` | `#F7F9FA` | Select-all row, segmented track base |
| `trackAlt` | `#F1F4F6` | Segmented control track |
| `ghostBtn` | `#F0F6F2` | Orphan card secondary icon button |

## Radii

| Token | Value | Use |
|---|---|---|
| `card` | 20 | Outer card / summary card |
| `sheet` | 26 | Bottom sheet top corners |
| `inner` | 18 | Orphan card, list row outer |
| `row` | 16 | History row |
| `tile` | 16 | Stat tile |
| `innerSm` | 14 | Nested row, avatar square radius |
| `button` | 14 | Primary button |
| `buttonSm` | 12 | Secondary button, field |
| `chip` | 999 | Chips, pills, badges (fully rounded) |

## Type — Inter

Loaded as a real webfont/native font. Weights used: 400, 500, 600, 700, 800.
Numerics use tabular figures wherever a currency amount or count appears.

| Role | Size | Weight | Tracking | Example |
|---|---|---|---|---|
| Display XL | 32 | 600 | −1.15 | `PKR 30,000` (Stripe amount) |
| Display | 24 | 600 | −0.7 | `Welcome back`, `Create your account` |
| Title | 23 | 600 | −0.65 | `Welcome back, Fardeen` |
| H1 | 20 | 600 | −0.5 | `My active orphans`, `Payments` |
| H2 | 17 | 600 | −0.3 | `Sponsor a child`, `Total` |
| H3 | 16 | 600 | −0.25 | `Your impact summary` |
| Body strong | 13 | 600 | −0.15 | Card titles, row names |
| Body | 12 | 400 | 0 | Supporting copy |
| Label | 11.5 | 600 | 0 | Buttons, chips |
| Caption | 10.5 | 500 | 0 | Meta, dates |
| Overline | 9 | 700 | 1.3 | `SPONSORED`, `AMOUNT DUE` |

## Spacing — 8pt scale

4 · 8 · 12 · 16 · 20 · 24 · 32. Screen gutter is **20**. Content width **350** on a 390 frame.
Inter-section rhythm is 24; intra-card rhythm is 8 or 12.

## Elevation

One soft level only, and the board barely uses it: `0 6 20 rgba(16,24,40,0.06)`.
Borders carry the hierarchy, not shadows.

## Iconography

Hand-built 24×24 grid vectors at **1.75px** stroke, round caps and joins, no fills except
the shield mark. Path data is ported verbatim from the design generator.

## Screen geometry

Frame 390 × 844. Status bar text baseline y=38, dynamic island at (129,12.5) 132×31 r15.5.
Content starts y≈58. Tab bar occupies y=760→844, top hairline at y=760, icons at y=770,
labels at baseline y=820, home indicator 132×5 r2.5 at (129, 831).

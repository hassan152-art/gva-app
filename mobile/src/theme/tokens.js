/**
 * Design tokens, ported 1:1 from the FigCraft board and `design/tokens.md`.
 *
 * Every value here is measured from the design file — do not invent new
 * colours, radii or sizes in components. If something is missing, add it here
 * first and note the source in design/tokens.md.
 */

export const colors = {
  green: '#149954',
  greenDeep: '#0A5D34',
  greenLight: '#1CB364',
  logoGreen: '#0E9749',
  greenText: '#0C7A44',
  greenTextDeep: '#0A7F45',
  greenInk: '#12854A',

  heart: '#ED2C39',

  orange: '#EA580C',
  orangeInk: '#C2410C',
  orangeText: '#7C2D12',
  orangeTextSoft: '#9A5B33',
  orangeTint: '#FFF7ED',
  orangeBorder: '#F6D9BC',

  ink: '#111827',
  ink2: '#4B5563',
  muted: '#6B7280',
  muted2: '#9CA3AF',
  placeholder: '#A6B0B9',
  navIdle: '#98A2AD',
  navIdleLabel: '#8A94A0',

  hairline: '#E6EAEF',
  hairline2: '#EFF2F4',

  surface: '#FFFFFF',
  canvas: '#F6F8F7',
  tint: '#EFF9F2',
  tint2: '#F5FAF7',
  tintBorder: '#DCEBE1',
  sand: '#FBF8F3',

  successTint: '#EAF7EF',
  fieldAlt: '#F7F9FA',
  trackAlt: '#F1F4F6',
  ghostBtn: '#F0F6F2',

  divider: '#E3E9ED',
  fieldBorder: '#DCE3E9',
  checkboxBorder: '#CBD5E1',
  buttonBorder: '#D8E4DD',
  socialBorder: '#DFE5E2',
  white: '#FFFFFF',
  statusBarPill: '#0B0F0E',
  homeIndicator: '#0F172A',
  scrim: '#0B1220',
};

export const radii = {
  card: 20,
  sheet: 26,
  inner: 18,
  row: 16,
  tile: 16,
  innerSm: 14,
  button: 14,
  buttonSm: 12,
  field: 12,
  chip: 999,
  segmentedTrack: 11,
  segmentedThumb: 8.5,
  iconButton: 10,
  avatarSm: 14,
};

/** 8pt spacing scale from the board. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const layout = {
  width: 390,
  height: 844,
  gutter: 20,
  contentWidth: 350,
  statusBarHeight: 52,
  navHeight: 84,
  navTop: 760,
  homeIndicatorY: 831,
};

/**
 * Type scale. `fontFamily` is resolved per weight at runtime by the font
 * loader in src/theme/fonts.ts — React Native needs one family name per
 * weight rather than a numeric weight.
 */
/** Mobile-first scale (~iOS / Material body 16–17pt). Board screens may run with design preview. */
export const type = {
  displayXL: { fontSize: 34, letterSpacing: -1.15, weight: '600' },
  display: { fontSize: 28, letterSpacing: -0.7, weight: '600' },
  title: { fontSize: 26, letterSpacing: -0.65, weight: '600' },
  h1: { fontSize: 22, letterSpacing: -0.5, weight: '600' },
  h2: { fontSize: 20, letterSpacing: -0.3, weight: '600' },
  h3: { fontSize: 18, letterSpacing: -0.25, weight: '600' },
  bodyStrong: { fontSize: 16, letterSpacing: -0.15, weight: '600' },
  body: { fontSize: 16, letterSpacing: 0, weight: '400' },
  label: { fontSize: 15, letterSpacing: 0, weight: '600' },
  caption: { fontSize: 13, letterSpacing: 0, weight: '500' },
  overline: { fontSize: 11, letterSpacing: 1.2, weight: '700' },
  tiny: { fontSize: 12, letterSpacing: 0, weight: '400' },
};

/** The single soft elevation level the board allows. */
export const shadows = {
  soft: {
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
};

export default { colors, radii, space, layout, type, shadows };

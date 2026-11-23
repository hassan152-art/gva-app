/**
 * Icon set, ported verbatim from the design generator
 * (hermes-output/gaza-build/gvalib.py `ICONS`, plus the additive icons from
 * stripe.py and auth.py).
 *
 * Every path is authored on a 24x24 grid and drawn at 1.75px stroke with round
 * caps and joins — the board's stated iconography rule. Do not redraw these;
 * the geometry is what makes the app match the design.
 */
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

/** name -> array of path `d` strings, or [d, { filled: true }] */
export const PATHS = {
  home: ['M3.2 10.4 L12 3.4 L20.8 10.4 V19.6 A1.4 1.4 0 0 1 19.4 21 H14.4 V14.6 H9.6 V21 H4.6 A1.4 1.4 0 0 1 3.2 19.6 Z'],
  card: [
    'M2.6 8.2 A2.6 2.6 0 0 1 5.2 5.6 H18.8 A2.6 2.6 0 0 1 21.4 8.2 V15.8 A2.6 2.6 0 0 1 18.8 18.4 H5.2 A2.6 2.6 0 0 1 2.6 15.8 Z',
    'M2.8 10.4 H21.2',
  ],
  ticket: ['M3.2 8.9 A1.9 1.9 0 0 1 5.1 7 H18.9 A1.9 1.9 0 0 1 20.8 8.9 V10.1 A2 2 0 0 1 18.8 12 A2 2 0 0 1 20.8 13.9 V15.1 A1.9 1.9 0 0 1 18.9 17 H5.1 A1.9 1.9 0 0 1 3.2 15.1 V13.9 A2 2 0 0 1 5.2 12 A2 2 0 0 1 3.2 10.1 Z'],
  user: [
    'M15.6 7.6 A3.6 3.6 0 1 1 8.4 7.6 A3.6 3.6 0 1 1 15.6 7.6',
    'M4.6 20.4 C4.6 16.6 7.9 14.4 12 14.4 C16.1 14.4 19.4 16.6 19.4 20.4',
  ],
  bell: [
    'M6.2 10.2 A5.8 5.8 0 0 1 17.8 10.2 C17.8 14.2 19.2 15.8 20.2 16.4 H3.8 C4.8 15.8 6.2 14.2 6.2 10.2 Z',
    'M9.8 19.2 A2.3 2.3 0 0 0 14.2 19.2',
  ],
  heart: ['M12 20.2 C12 20.2 3.4 14.7 3.4 8.9 A4.7 4.7 0 0 1 12 6.3 A4.7 4.7 0 0 1 20.6 8.9 C20.6 14.7 12 20.2 12 20.2 Z'],
  users: [
    'M8.8 11.2 A3.4 3.4 0 1 0 8.8 4.4 A3.4 3.4 0 1 0 8.8 11.2',
    'M2.2 20.4 C2.2 16.8 4.9 14.2 8.8 14.2 C12.7 14.2 15.4 16.8 15.4 20.4',
    'M16.6 4.9 A3 3 0 0 1 16.6 10.6',
    'M17.6 14.4 C20.2 15.1 21.8 17.4 21.8 20.4',
  ],
  coins: [
    'M12 3.2 C16.3 3.2 19.6 4.7 19.6 6.6 C19.6 8.5 16.3 10 12 10 C7.7 10 4.4 8.5 4.4 6.6 C4.4 4.7 7.7 3.2 12 3.2 Z',
    'M4.4 6.6 V11.8 C4.4 13.7 7.7 15.2 12 15.2 C16.3 15.2 19.6 13.7 19.6 11.8 V6.6',
    'M4.4 11.8 V17 C4.4 18.9 7.7 20.4 12 20.4 C16.3 20.4 19.6 18.9 19.6 17 V11.8',
  ],
  list: ['M8.6 20 V4', 'M16.4 20 V4', 'M3.6 9.2 H21.4', 'M3.6 14.8 H21.4'],
  shield: ['M12 3 L20.2 6 V11.4 C20.2 16.2 16.8 19.6 12 21 C7.2 19.6 3.8 16.2 3.8 11.4 V6 Z'],
  chevron: ['M9.2 5.6 L15.6 12 L9.2 18.4'],
  chevdown: ['M6.4 9.4 L12 15 L17.6 9.4'],
  check: ['M4.8 12.6 L9.6 17.4 L19.2 6.6'],
  plus: ['M12 5.6 V18.4', 'M5.6 12 H18.4'],
  clock: ['M12 3.4 A8.6 8.6 0 1 1 11.99 3.4 Z', 'M12 7.6 V12.3 L15.2 14.2'],
  calendar: [
    'M4 7.6 A2.4 2.4 0 0 1 6.4 5.2 H17.6 A2.4 2.4 0 0 1 20 7.6 V18 A2.4 2.4 0 0 1 17.6 20.4 H6.4 A2.4 2.4 0 0 1 4 18 Z',
    'M4.2 10.4 H19.8',
    'M8.4 3 V6.8',
    'M15.6 3 V6.8',
  ],
  upload: [
    'M12 16.2 V6.6',
    'M7.8 10.6 L12 6.4 L16.2 10.6',
    'M4.2 15.6 V17.6 A2.4 2.4 0 0 0 6.6 20 H17.4 A2.4 2.4 0 0 0 19.8 17.6 V15.6',
  ],
  receipt: [
    'M6.2 3.4 H17.8 V20.6 L15.4 18.9 L12 20.6 L8.6 18.9 L6.2 20.6 Z',
    'M9.2 8.4 H14.8',
    'M9.2 12.2 H14.8',
  ],
  arrow: ['M6.6 17.4 L17.4 6.6', 'M8.6 6.6 H17.4 V15.4'],
  chevright2: ['M5.6 12 H18.4', 'M13.2 6.6 L18.6 12 L13.2 17.4'],
  spark: ['M12 3.6 L13.9 9.4 L19.8 11.2 L13.9 13 L12 18.8 L10.1 13 L4.2 11.2 L10.1 9.4 Z'],
  star: ['M12 3.4 L14.7 9.2 L21 10.1 L16.4 14.5 L17.5 20.8 L12 17.9 L6.5 20.8 L7.6 14.5 L3 10.1 L9.3 9.2 Z'],
  x: ['M6.6 6.6 L17.4 17.4', 'M17.4 6.6 L6.6 17.4'],
  image: [
    'M4 7.4 A2.4 2.4 0 0 1 6.4 5 H17.6 A2.4 2.4 0 0 1 20 7.4 V16.6 A2.4 2.4 0 0 1 17.6 19 H6.4 A2.4 2.4 0 0 1 4 16.6 Z',
    'M4.4 16.2 L9.6 11.4 L13.4 15 L16 12.6 L19.6 16',
  ],
  wallet: [
    'M3.4 8.6 A2.6 2.6 0 0 1 6 6 H18.6 V9.4',
    'M3.4 8.6 V16.8 A2.6 2.6 0 0 0 6 19.4 H18.6 A2 2 0 0 0 20.6 17.4 V11.4 A2 2 0 0 0 18.6 9.4 H6 A2.6 2.6 0 0 1 3.4 8.6 Z',
    'M16.4 14.4 H16.5',
  ],
  // ---- additive icons from the Stripe and auth screens ----
  lock: [
    'M6.4 10.4 A2.2 2.2 0 0 1 8.6 8.2 H15.4 A2.2 2.2 0 0 1 17.6 10.4 V17.2 A2.2 2.2 0 0 1 15.4 19.4 H8.6 A2.2 2.2 0 0 1 6.4 17.2 Z',
    'M8.8 8.2 V7 A3.2 3.2 0 0 1 15.2 7 V8.2',
  ],
  chevleft: ['M14.4 5.6 L8 12 L14.4 18.4'],
  help: ['M12 3.6 A8.4 8.4 0 1 1 11.99 3.6 Z'],
  eye: [
    'M2.6 12 C5.4 7.25 8.5 5.35 12 5.35 C15.5 5.35 18.6 7.25 21.4 12 C18.6 16.75 15.5 18.65 12 18.65 C8.5 18.65 5.4 16.75 2.6 12 Z',
    'M12 8.95 A3.05 3.05 0 1 1 11.99 8.95 Z',
  ],
  eyeoff: [
    'M3.6 3.6 L20.4 20.4',
    'M9.75 5.6 C10.45 5.43 11.2 5.35 12 5.35 C15.5 5.35 18.6 7.25 21.4 12 C20.5 13.6 19.55 14.85 18.5 15.85',
    'M14.3 18.4 C13.55 18.57 12.8 18.65 12 18.65 C8.5 18.65 5.4 16.75 2.6 12 C3.5 10.4 4.45 9.15 5.5 8.15',
    'M9.85 9.85 A3 3 0 0 0 14.15 14.15',
  ],
  alertcircle: ['M12 3.4 A8.6 8.6 0 1 1 11.99 3.4 Z', 'M12 8.2 V13.4', 'M12 16.6 V16.8'],
};

/** Icons that are filled rather than stroked. */
const FILLED = new Set([]);

export function Icon({ name, size = 24, color = colors.ink, strokeWidth = 1.75, opacity, style }) {
  const paths = PATHS[name];
  if (!paths) {
    if (__DEV__) console.warn(`[Icon] unknown icon "${name}"`);
    return null;
  }
  // The viewBox is 24 units wide but rendered at `size` px, so a stroke of
  // `strokeWidth` screen pixels is strokeWidth / scale in viewBox units.
  const scale = size / 24;
  const filled = FILLED.has(name);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} opacity={opacity}>
      <G>
        {paths.map((d, i) => (
          <Path
            key={i}
            d={d}
            fill={filled ? color : 'none'}
            stroke={filled ? 'none' : color}
            strokeWidth={filled ? 0 : strokeWidth / scale}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </G>
    </Svg>
  );
}

/**
 * The shield mark: a green shield with a white figure and a red heart.
 * Geometry is copied from screens.py `logo_mark2` so the mark is identical.
 */
export function LogoMark({ size = 30, color = colors.green }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G>
        <Path
          d="M12 2.2 L20.8 5.2 V11.4 C20.8 16.4 17.3 20.5 12 22 C6.7 20.5 3.2 16.4 3.2 11.4 V5.2 Z"
          fill={color}
        />
        <Circle cx="9.9" cy="9.4" r="2.5" fill="#FFFFFF" />
        <Path
          d="M6.4 16.4 C6.4 14.0 8.0 12.8 9.9 12.8 C11.8 12.8 13.4 14.0 13.4 16.4 Z"
          fill="#FFFFFF"
        />
        <Path
          d="M17.0 11.0 C17.9 10.2 19.3 10.8 19.3 11.9 C19.3 12.8 18.3 13.6 17.0 14.4 C15.7 13.6 14.7 12.8 14.7 11.9 C14.7 10.8 16.1 10.2 17.0 11.0 Z"
          fill={colors.heart}
        />
      </G>
    </Svg>
  );
}

/** The multicolour Google "G", as a set of ring arcs plus the blue bar. */
export function GoogleG({ size = 16 }) {
  const pad = size * 0.12;
  const inner = size - pad * 2;
  const r = inner / 2;
  const sw = inner * 0.22;
  const c = size / 2;
  const pt = (deg) => {
    const a = (deg * Math.PI) / 180;
    return [c + r * Math.cos(a), c + r * Math.sin(a)];
  };
  const arc = (a0, a1, color) => {
    const [x0, y0] = pt(a0);
    const [x1, y1] = pt(a1);
    const large = a1 - a0 > 180 ? 1 : 0;
    return <Path key={color} d={`M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`} stroke={color} strokeWidth={sw} fill="none" />;
  };
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arc(245, 305, '#EA4335')}
      {arc(10, 75, '#4285F4')}
      {arc(75, 165, '#34A853')}
      {arc(165, 245, '#FBBC05')}
      <Rect x={c - 0.4} y={c - sw / 2} width={r + sw / 2 + 0.4} height={sw} fill="#4285F4" />
    </Svg>
  );
}

/** Apple mark for social buttons — square 24×24 viewBox so nothing clips. */
const APPLE_24 =
  'M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z';

export function AppleMark({ size = 20, height, color = colors.ink }) {
  const px = height ?? size;
  return (
    <Svg width={px} height={px} viewBox="0 0 24 24">
      <Path d={APPLE_24} fill={color} />
    </Svg>
  );
}

/** Visa wordmark (used inside the Stripe card field). */
const VISA_PATH =
  'M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z';

export function VisaMark({ height = 12, color = '#1A1F71' }) {
  return (
    <Svg width={height * 1.9} height={height} viewBox="0 0 24 16">
      <Path d={VISA_PATH} fill={color} />
    </Svg>
  );
}

/** Mastercard: two overlapping discs plus the intersecting lens. */
export function MastercardMark({ height = 14 }) {
  const r = height / 2;
  const overlap = r * 0.6;
  const width = r * 4 - overlap * 2;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Circle cx={r} cy={r} r={r} fill="#EB001B" />
      <Circle cx={width - r} cy={r} r={r} fill="#F79E1B" />
      <Path
        d={`M${width / 2} ${r - r * 0.56} A${r} ${r} 0 0 1 ${width / 2} ${r + r * 0.56} A${r} ${r} 0 0 1 ${width / 2} ${r - r * 0.56} Z`}
        fill="#FF5F00"
      />
    </Svg>
  );
}

export default Icon;

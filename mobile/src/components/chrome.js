/**
 * App chrome: status bar, bottom tab bar, and the logo lockup.
 *
 * The board draws the iOS status bar and home indicator as part of the frame.
 * On a real device those belong to the OS, so they render only when
 * EXPO_PUBLIC_DESIGN_PREVIEW is set — the visual-parity harness turns that on
 * so screenshots are comparable to the design exports.
 */
import { Image, Pressable, Text as RNText, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, layout, radii } from '../theme/tokens';
import { familyFor } from '../theme/fonts';
import { Text } from './Text';
import { Icon, LogoMark } from './Icon';

export const designPreview = process.env.EXPO_PUBLIC_DESIGN_PREVIEW === '1';

/* ------------------------------------------------------------ status bar */

/**
 * Status bar, drawn at the design's exact coordinates so the preview matches
 * the frame pixel for pixel: one 390x52 SVG with a viewBox in frame units, so
 * every shape below can use the spec's numbers directly.
 */
export function StatusBarMock({ time = '9:41' }) {
  if (!designPreview) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 52 }}>
      {/* dynamic island: rect 132x31 r15.5 at (129, 12.5) */}
      <Svg width={390} height={52} viewBox="0 0 390 52" style={{ position: 'absolute' }}>
        <Rect x={129} y={12.5} width={132} height={31} rx={15.5} fill={colors.statusBarPill} />

        {/* cellular: 3x3/5/7/9 rounded bars at x 298/302.4/306.8/311.2 */}
        <Rect x={298} y={37} width={3} height={3} rx={1} fill={colors.ink} />
        <Rect x={302.4} y={35} width={3} height={5} rx={1} fill={colors.ink} />
        <Rect x={306.8} y={33} width={3} height={7} rx={1} fill={colors.ink} />
        <Rect x={311.2} y={31} width={3} height={9} rx={1} fill={colors.ink} />

        {/* wifi: two arcs + dot */}
        <Path d="M322 31.6 A10 10 0 0 1 335.2 31.6" stroke={colors.ink} strokeWidth={1.9} fill="none" strokeLinecap="round" />
        <Path d="M325.4 35.3 A5.4 5.4 0 0 1 331.8 35.3" stroke={colors.ink} strokeWidth={1.9} fill="none" strokeLinecap="round" />
        <Circle cx={328.6} cy={38.7} r={1.3} fill={colors.ink} />

        {/* battery: body 21x10.4 r3.2, fill 14.4x5.8 r1.8, nub */}
        <Rect x={341} y={27.8} width={21} height={10.4} rx={3.2} stroke={colors.ink} strokeWidth={1.1} fill="none" />
        <Rect x={343.4} y={30.1} width={14.4} height={5.8} rx={1.8} fill={colors.ink} />
        <Path d="M363.5 31.4 V34.4" stroke={colors.ink} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>

      {/* time: text box 29x17 at (30, 24.4), 14/600 */}
      <RNText
        allowFontScaling={false}
        style={{
          position: 'absolute',
          left: 30,
          top: 24.4,
          width: 40,
          height: 17,
          fontFamily: familyFor('600'),
          fontSize: 14,
          lineHeight: 17,
          color: colors.ink,
        }}
      >
        {time}
      </RNText>
    </View>
  );
}

/* ------------------------------------------------------- home indicator */

export function HomeIndicator() {
  if (!designPreview) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 129, top: layout.homeIndicatorY, width: 132, height: 5 }}
    >
      <View
        style={{ width: 132, height: 5, borderRadius: 2.5, backgroundColor: colors.homeIndicator }}
      />
    </View>
  );
}

/* ------------------------------------------------------------- tab bar */

/**
 * Bottom navigation: Home / Sponsor / Payments / Profile.
 *
 * Four tabs — the same count and the same bar geometry, active pill, icon slot
 * and label treatment as the design board, so the bar is a 1:1 structural match
 * once the tab set matches the product.
 */
const TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'children', label: 'Children', icon: 'heart' },
  { key: 'donations', label: 'Donations', icon: 'receipt' },
  { key: 'help', label: 'Help', icon: 'help' },
  { key: 'profile', label: 'Profile', icon: 'user' },
];

/** Where each tab lives. Kept here so every screen navigates identically. */
export const TAB_ROUTES = {
  home: '/',
  children: '/orphans/all',
  donations: '/donations',
  help: '/tickets',
  profile: '/profile',
  // legacy keys still used by older screens
  sponsor: '/orphans/all',
  payments: '/donations',
};

/** The canonical tab handler; screens pass their router in. */
export function navigateTab(router, key) {
  const route = TAB_ROUTES[key];
  if (route && router) router.navigate(route);
}

export function TabBar({ active = 'home', onNavigate, bottomInset = 0 }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: layout.navHeight + bottomInset,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.hairline2,
        paddingBottom: bottomInset,
      }}
    >
      {/* Five equal slots that fit any phone width (capped at the design width). */}
      <View style={{ flexDirection: 'row', height: layout.navHeight, width: '100%', maxWidth: layout.width, alignSelf: 'center' }}>
        {TABS.map((tab) => {
          const on = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onNavigate?.(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={tab.label}
              style={{ flex: 1, alignItems: 'center', paddingTop: 8 }}
            >
              <View
                style={{
                  width: 44,
                  height: 28,
                  borderRadius: radii.iconButton,
                  backgroundColor: on ? colors.tint : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={tab.icon}
                  size={22}
                  color={on ? colors.green : colors.navIdle}
                  strokeWidth={1.75}
                />
              </View>
              <Text
                variant="caption"
                color={on ? colors.green : colors.navIdleLabel}
                style={{ fontSize: 10.5, marginTop: 4 }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------- logo lockup */

/**
 * Official lockup: shield + GLOBAL VIRTUAL ADOPTION (606×254).
 * Same file as {@link OFFICIAL_LOGO_URL} in `constants/brand.js` (`assets/logo.png`).
 *
 * `width` sets the rendered width; the height follows the artwork's aspect ratio.
 */
export const LOGO_ASPECT = 254 / 606;

export function LogoLockup({ width = 132, style, alt = 'Gaza Virtual Adoption' }) {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={[{ width, height: width * LOGO_ASPECT }, style]}
      resizeMode="contain"
      accessibilityLabel={alt}
    />
  );
}

/**
 * Compact header for the scrolled Home state: the same official lockup at a
 * smaller width. (A wide wordmark cannot shrink indefinitely, so this is the
 * smallest size at which the artwork still reads.)
 */
export function CompactBrand({ width = 104, style }) {
  return <LogoLockup width={width} style={style} />;
}

export default { StatusBarMock, HomeIndicator, TabBar, LogoLockup, CompactBrand, designPreview };

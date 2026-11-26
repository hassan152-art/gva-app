/**
 * Building blocks for the donor screens (home, children, sponsor flow,
 * donations, complaints). Same tokens and Inter faces as the rest of the app.
 *
 * Weights: always use the `font.*` styles below (Inter has one file per
 * weight) — `fontWeight` alone falls back to the system font on Android.
 */
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../Screen';
import { Text } from '../Text';
import { Icon } from '../Icon';
import { designPreview, navigateTab } from '../chrome';
import { colors, radii } from '../../theme/tokens';
import { familyFor } from '../../theme/fonts';
import { MONTHS, STATUS_TONE } from '../../lib/donorApp';

export const font = {
  regular: { fontFamily: familyFor('400') },
  medium: { fontFamily: familyFor('500') },
  semi: { fontFamily: familyFor('600') },
  bold: { fontFamily: familyFor('700') },
};

export const shadow = {
  card: Platform.select({
    web: { boxShadow: '0 2px 12px rgba(15, 23, 42, 0.07)' },
    default: { boxShadow: '0 2px 12px rgba(15, 23, 42, 0.07)' },
  }),
  lift: Platform.select({
    web: { boxShadow: '0 8px 24px rgba(10, 93, 52, 0.18)' },
    default: { boxShadow: '0 8px 24px rgba(10, 93, 52, 0.18)' },
  }),
};

const GREEN = [colors.greenDeep, colors.green, colors.greenLight];

/**
 * Screen with a header and the tab bar.
 * band = green gradient header (main tabs); otherwise a light title row.
 */
export function Page({ title, subtitle, tab, back = false, right, band = false, bandExtra, children, scrollable = true, ...rest }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = designPreview ? 0 : insets.top;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const backBtn = (light) => (
    <Pressable
      onPress={goBack}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={10}
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: light ? 'rgba(255,255,255,0.18)' : colors.canvas,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="chevleft" size={20} color={light ? colors.white : colors.ink} />
    </Pressable>
  );

  return (
    <Screen tab={tab} onNavigate={(k) => navigateTab(router, k)} scrollable={scrollable} {...rest}>
      {band ? (
        <LinearGradient
          colors={GREEN}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ marginTop: -top, paddingTop: top + 16, paddingHorizontal: 20, paddingBottom: bandExtra ? 18 : 34, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {back ? backBtn(true) : null}
            <View style={{ flex: 1 }}>
              <Text variant="h1" color={colors.white} style={font.bold} numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? (
                <Text variant="caption" color="rgba(255,255,255,0.85)" style={{ marginTop: 3 }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {right}
          </View>
          {bandExtra ? <View style={{ marginTop: 16 }}>{bandExtra}</View> : null}
        </LinearGradient>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {back ? backBtn(false) : null}
          <View style={{ flex: 1 }}>
            <Text variant="h2" style={font.bold} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" color={colors.muted} style={{ marginTop: 2 }} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right}
        </View>
      )}
      <View style={{ paddingHorizontal: 20, paddingBottom: 56, marginTop: band && !bandExtra ? -18 : 0 }}>{children}</View>
    </Screen>
  );
}

export function StatusPill({ status, label, size = 'sm' }) {
  const t = STATUS_TONE[status] || STATUS_TONE.closed;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: t.bg,
        borderRadius: 999,
        paddingHorizontal: size === 'lg' ? 12 : 9,
        paddingVertical: size === 'lg' ? 5 : 3,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.fg }} />
      <Text variant="tiny" color={t.fg} style={[font.bold, { fontSize: size === 'lg' ? 12 : 11 }]}>
        {label || t.label}
      </Text>
    </View>
  );
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Child photo with an initials fallback. */
export function ChildPhoto({ uri, name, size = 56, radius = 16, width, height }) {
  const [broken, setBroken] = useState(false);
  const w = width || size;
  const h = height || size;
  if (uri && !broken) {
    return (
      <Image
        source={{ uri }}
        style={{ width: w, height: h, borderRadius: radius, backgroundColor: colors.tint }}
        contentFit="cover"
        transition={150}
        onError={() => setBroken(true)}
        accessibilityLabel={name}
      />
    );
  }
  return (
    <LinearGradient
      colors={[colors.greenLight, colors.greenDeep]}
      style={{ width: w, height: h, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text variant="label" color={colors.white} style={[font.bold, { fontSize: Math.max(13, Math.min(w, h) / 3.2) }]}>
        {initials(name)}
      </Text>
    </LinearGradient>
  );
}

/** White card with a soft shadow. */
export function Box({ children, style, onPress, accessibilityLabel }) {
  const card = [
    { backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.hairline2, padding: 16 },
    shadow.card,
    style,
  ];
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={({ pressed }) => [card, { opacity: pressed ? 0.88 : 1 }]}>
      {children}
    </Pressable>
  ) : (
    <View style={card}>{children}</View>
  );
}

const TONES = {
  ink: { bg: colors.canvas, fg: colors.ink, icon: colors.ink2 },
  green: { bg: '#EAF7EF', fg: colors.greenText, icon: colors.green },
  red: { bg: '#FDECEE', fg: '#B42318', icon: '#D92D20' },
  orange: { bg: colors.orangeTint, fg: colors.orangeInk, icon: colors.orange },
  blue: { bg: '#EEF4FF', fg: '#1D4ED8', icon: '#2563EB' },
};

/** Coloured number tile with an icon. */
export function Stat({ label, value, tone = 'ink', icon, style, onPress }) {
  const t = TONES[tone] || TONES.ink;
  const body = (
    <View style={[{ flex: 1, backgroundColor: t.bg, borderRadius: 18, padding: 12, minHeight: 84 }, style]}>
      {icon ? (
        <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Icon name={icon} size={16} color={t.icon} strokeWidth={2} />
        </View>
      ) : null}
      <Text variant="h3" color={t.fg} style={font.bold} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="tiny" color={colors.muted} style={{ marginTop: 2 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flex: 1 }}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

/** Summary card that sits on the green header band. */
export function BandCard({ children, style }) {
  return <View style={[{ backgroundColor: colors.surface, borderRadius: 22, padding: 14 }, shadow.lift, style]}>{children}</View>;
}

export function Empty({ icon = 'heart', title, text, action }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 34, paddingHorizontal: 12 }}>
      <LinearGradient colors={['#EAF7EF', '#D7F0E1']} style={{ width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={32} color={colors.green} />
      </LinearGradient>
      <Text variant="bodyStrong" style={[font.bold, { marginTop: 14, textAlign: 'center' }]}>
        {title}
      </Text>
      {text ? (
        <Text variant="caption" color={colors.muted} style={{ marginTop: 6, textAlign: 'center', lineHeight: 19 }}>
          {text}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 18, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
      <ActivityIndicator color={colors.green} />
    </View>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#FDECEE', borderRadius: 14, padding: 12, marginVertical: 8 }}>
      <Icon name="alertcircle" size={16} color="#B42318" />
      <Text variant="caption" color="#B42318" style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}

export function SectionLabel({ children, right, icon }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <Icon name={icon} size={16} color={colors.green} strokeWidth={2.1} /> : null}
        <Text variant="label" style={font.bold}>
          {children}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function LinkText({ children, onPress }) {
  return (
    <Text variant="caption" color={colors.green} style={font.bold} onPress={onPress}>
      {children}
    </Text>
  );
}

/** Pill-style chooser (months, filters, categories). */
export function ChoiceChip({ label, on, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{
        paddingHorizontal: 13,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: on ? colors.green : colors.hairline,
        backgroundColor: on ? colors.green : colors.surface,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text variant="caption" color={on ? colors.white : colors.ink2} style={on ? font.bold : font.medium}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Segmented tabs (Months / Payments / Ledger). */
export function Tabs({ items, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.canvas, borderRadius: 14, padding: 4, marginTop: 18 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[{ flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center', backgroundColor: on ? colors.surface : 'transparent' }, on ? shadow.card : null]}
          >
            <Text variant="caption" color={on ? colors.ink : colors.muted} style={on ? font.bold : font.medium}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const CELL = {
  paid: { bg: '#DDF3E6', fg: colors.greenText },
  partial: { bg: '#FFEBD5', fg: colors.orangeInk },
  unpaid: { bg: '#FDE2E2', fg: '#B42318' },
  none: { bg: colors.canvas, fg: colors.muted2 },
};

/**
 * 12-month tracker for one child and year.
 * invoices: [{ year, month, status }] for that child.
 */
export function MonthTracker({ invoices, year, compact = false }) {
  const byMonth = new Map((invoices || []).filter((i) => i.year === year).map((i) => [i.month, i.status]));
  const now = new Date();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 4 : 6 }}>
      {MONTHS.map((m, i) => {
        const st = byMonth.get(i + 1) || 'none';
        const c = CELL[st];
        const isNow = year === now.getFullYear() && i === now.getMonth();
        return (
          <View
            key={m}
            accessibilityLabel={`${m}: ${st === 'none' ? 'no invoice' : st}`}
            style={{
              width: compact ? '14.2%' : '15%',
              flexGrow: 1,
              paddingVertical: compact ? 5 : 7,
              borderRadius: 10,
              backgroundColor: c.bg,
              alignItems: 'center',
              borderWidth: isNow ? 1.5 : 0,
              borderColor: isNow ? colors.ink : 'transparent',
            }}
          >
            <Text variant="tiny" color={c.fg} style={[font.bold, { fontSize: compact ? 10 : 11 }]}>
              {m}
            </Text>
            {!compact ? (
              <Text variant="tiny" color={c.fg} style={{ fontSize: 9, marginTop: 1 }}>
                {st === 'none' ? '—' : st === 'paid' ? 'Paid' : st === 'partial' ? 'Part' : 'Due'}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function TrackerLegend() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
      {[
        ['paid', 'Paid'],
        ['partial', 'Partial'],
        ['unpaid', 'Due'],
        ['none', 'No invoice'],
      ].map(([k, l]) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: CELL[k].bg, borderWidth: 1, borderColor: CELL[k].fg }} />
          <Text variant="tiny" color={colors.muted}>
            {l}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** 1 → 2 → 3 progress for the payment page. */
export function Steps({ steps, current }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 4 }}>
      {steps.map((s, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <View key={s} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ alignItems: 'center', width: 70 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done || on ? colors.green : colors.canvas,
                  borderWidth: on ? 3 : 0,
                  borderColor: '#BFE8CF',
                }}
              >
                {done ? (
                  <Icon name="check" size={14} color={colors.white} strokeWidth={2.6} />
                ) : (
                  <Text variant="tiny" color={on ? colors.white : colors.muted} style={font.bold}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text variant="tiny" color={on || done ? colors.ink : colors.muted} style={[on ? font.bold : font.medium, { marginTop: 4, fontSize: 11 }]}>
                {s}
              </Text>
            </View>
            {i < steps.length - 1 ? <View style={{ flex: 1, height: 2, backgroundColor: done ? colors.green : colors.hairline, marginBottom: 16 }} /> : null}
          </View>
        );
      })}
    </View>
  );
}

export { GREEN };

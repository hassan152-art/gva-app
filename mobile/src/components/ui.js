/**
 * Shared UI atoms, each measured from the FigCraft board.
 *
 * One card language, one pill, one chip, one checkbox, one field, one button
 * hierarchy — as the design system requires. Screens compose these instead of
 * styling raw views, which is what keeps 9 screens consistent.
 */
import { Pressable, TextInput, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, radii } from '../theme/tokens';
import { fonts } from '../theme/fonts';
import { Text } from './Text';
import { Icon } from './Icon';

/* ------------------------------------------------------------------ card */

export function Card({ children, style, padded = true, ...rest }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.inner,
          borderWidth: 1,
          borderColor: colors.hairline,
        },
        padded && { padding: 14 },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ pill */

/**
 * Status pill. `tone` matches the board: success (Active/Completed), neutral,
 * accent (Test mode), and plain.
 */
export function Pill({ label, tone = 'success', dot = true, style }) {
  const tones = {
    success: { bg: colors.successTint, fg: colors.greenText, dotColor: colors.greenInk },
    accent: { bg: colors.orangeTint, fg: colors.orangeInk, dotColor: colors.orangeInk, border: colors.orangeBorder },
    neutral: { bg: colors.tint, fg: colors.greenText, dotColor: colors.greenInk },
    muted: { bg: '#F1F4F6', fg: colors.muted, dotColor: colors.muted2 },
  };
  const t = tones[tone] || tones.success;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radii.chip,
          backgroundColor: t.bg,
          borderWidth: t.border ? 1 : 0,
          borderColor: t.border,
        },
        style,
      ]}
    >
      {dot ? (
        <View
          style={{
            width: 4.4,
            height: 4.4,
            borderRadius: 2.2,
            backgroundColor: t.dotColor,
            marginRight: 4.6,
          }}
        />
      ) : null}
      <Text variant="label" color={t.fg} style={{ fontSize: 8.8 }}>
        {label}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ chip */

/** Filter chip: filled green when active, hairline outline when not. */
export function Chip({ label, active = false, dot = false, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          height: 30,
          paddingHorizontal: 13,
          borderRadius: radii.chip,
          backgroundColor: active ? colors.green : colors.surface,
          borderWidth: active ? 0 : 1,
          borderColor: colors.hairline,
        },
        style,
      ]}
    >
      {dot ? (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            marginRight: 7,
            backgroundColor: active ? colors.white : colors.greenInk,
          }}
        />
      ) : null}
      <Text variant="label" color={active ? colors.white : '#5B6773'}>
        {label}
      </Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------- checkbox */

/** 20px checkbox, 6r, exactly as drawn on the board. */
export function Checkbox({ checked = false, size = 20, onPress, style }) {
  const inner = checked ? (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect width={size} height={size} rx={6} fill={colors.green} />
      <Path
        d={`M${size * 0.26} ${size * 0.52} L${size * 0.44} ${size * 0.7} L${size * 0.75} ${size * 0.33}`}
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  ) : (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect
        x={0.75}
        y={0.75}
        width={size - 1.5}
        height={size - 1.5}
        rx={6}
        fill="#FFFFFF"
        stroke={colors.checkboxBorder}
        strokeWidth={1.5}
      />
    </Svg>
  );

  if (!onPress) return <View style={style}>{inner}</View>;
  return (
    <Pressable onPress={onPress} hitSlop={10} style={style}>
      {inner}
    </Pressable>
  );
}

/* ---------------------------------------------------------------- avatar */

/** Rounded-square initial avatar used in list rows and tiles. */
export function Avatar({ initial, size = 44, radius = radii.innerSm, style }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text variant="h3" color={colors.greenText} style={{ fontSize: size * 0.34, letterSpacing: 0 }}>
        {initial}
      </Text>
    </View>
  );
}

/** Round avatar with a soft ring — the Home header treatment. */
export function RoundAvatar({ initial, size = 36, style }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: '#E4EFE7',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <View
        style={{
          width: size - 3,
          height: size - 3,
          borderRadius: (size - 3) / 2,
          backgroundColor: colors.greenDeep,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="bodyStrong" color={colors.white} style={{ fontSize: 14 }}>
          {initial}
        </Text>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- button */

/**
 * Primary (green), secondary (white + hairline), ghost (green text), and
 * accent (the orange Pay-now). Height 52-56 for page-level actions.
 */
export function Button({
  label,
  onPress,
  kind = 'primary',
  height = 52,
  radius = radii.button,
  icon,
  iconColor,
  disabled = false,
  loading = false,
  style,
  textStyle,
  full = true,
}) {
  const kinds = {
    primary: {
      bg: colors.green,
      border: null,
      label: colors.white,
      icon: colors.white,
    },
    secondary: {
      bg: colors.surface,
      border: colors.buttonBorder,
      label: colors.greenText,
      icon: colors.greenText,
    },
    accent: { bg: colors.orangeInk, border: null, label: colors.white, icon: colors.white },
    ghost: { bg: 'transparent', border: null, label: colors.green, icon: colors.green },
  };
  const k = kinds[kind] || kinds.primary;

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      {icon ? (
        <Icon
          name={icon}
          size={16}
          color={iconColor || k.icon}
          strokeWidth={2.1}
          style={{ marginRight: 9 }}
        />
      ) : null}
      <Text
        variant="label"
        color={k.label}
        style={[{ fontSize: 17 }, textStyle]}
        numberOfLines={1}
      >
        {loading ? 'Please wait…' : label}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      style={[
        {
          height,
          borderRadius: radius,
          backgroundColor: k.bg,
          borderWidth: k.border ? 1 : 0,
          borderColor: k.border,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: full ? 'stretch' : 'flex-start',
          paddingHorizontal: 16,
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

/* ----------------------------------------------------------------- field */

/** Labelled input: 10/600 label above, 48px field, 12r, 1px hairline. */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  trailing,
  prefix,
  hint,
  error,
  filled = false,
  style,
  inputStyle,
  multiline,
  editable = true,
  ...rest
}) {
  const borderColor = error ? colors.heart : filled ? 'transparent' : colors.hairline;
  const borderWidth = filled && !error ? 0 : 1;

  return (
    <View style={style}>
      {label ? (
        <Text variant="caption" color={colors.ink2} style={{ fontSize: 13, letterSpacing: 0.1, marginBottom: 8 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          height: multiline ? undefined : 52,
          minHeight: 52,
          borderRadius: filled ? radii.buttonSm : radii.field,
          borderWidth,
          borderColor,
          backgroundColor: filled ? colors.fieldAlt : colors.surface,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          paddingLeft: 14,
          paddingRight: trailing ? 12 : 14,
        }}
      >
        {prefix ? <View style={{ marginRight: 8 }}>{prefix}</View> : null}
        <FieldInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          editable={editable}
          style={inputStyle}
          {...rest}
        />
        {trailing ? <View style={{ marginLeft: 8 }}>{trailing}</View> : null}
      </View>
      {hint ? (
        <Text variant="tiny" color={error ? colors.heart : colors.muted2} style={{ marginTop: 8, fontSize: 13 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** The actual text input, kept separate so Field can own the chrome. */
function FieldInput({ style, ...props }) {
  return (
    <TextInput
      allowFontScaling={false}
      style={[
        {
          flex: 1,
          fontFamily: fonts.regular,
          fontSize: 17,
          color: colors.ink,
          paddingTop: 0,
          paddingBottom: 0,
          height: '100%',
          outlineStyle: 'none',
        },
        style,
      ]}
      {...props}
    />
  );
}

/* ------------------------------------------------------------- segmented */

/** Two-up segmented control with a white thumb. */
export function Segmented({ left, right, value = 0, onChange, style }) {
  return (
    <View
      style={[
        {
          height: 38,
          borderRadius: radii.segmentedTrack,
          backgroundColor: colors.trackAlt,
          flexDirection: 'row',
          padding: 4,
        },
        style,
      ]}
    >
      {[left, right].map((label, i) => {
        const active = i === value;
        return (
          <Pressable
            key={label}
            onPress={() => onChange?.(i)}
            style={{
              flex: 1,
              borderRadius: radii.segmentedThumb,
              backgroundColor: active ? colors.surface : 'transparent',
              borderWidth: active ? 1 : 0,
              borderColor: colors.hairline,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              variant="label"
              color={active ? colors.ink : '#7A8794'}
              style={{ fontSize: 12, letterSpacing: -0.05 }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* --------------------------------------------------------------- section */

/** Section heading with optional "See all"-style action on the right. */
export function SectionHead({ title, subtitle, action, onPressAction, style, size = 'h2' }) {
  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant={size} color={colors.ink}>
          {title}
        </Text>
        {action ? (
          <Pressable onPress={onPressAction} hitSlop={8}>
            <Text variant="label" color={colors.green} style={{ fontSize: 12 }}>
              {action}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {subtitle ? (
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 3, fontSize: 11 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------- divider */

export function Divider({ style, color = colors.hairline }) {
  return <View style={[{ height: 1, backgroundColor: color, alignSelf: 'stretch' }, style]} />;
}

/** Hairline divider with a centred muted label ("Or pay with card"). */
export function LabeledDivider({ label, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
      <Text variant="tiny" color="#7A8794" style={{ marginHorizontal: 14, fontSize: 9.8 }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
    </View>
  );
}

export default {
  Card,
  Pill,
  Chip,
  Checkbox,
  Avatar,
  RoundAvatar,
  Button,
  Field,
  Segmented,
  SectionHead,
  Divider,
  LabeledDivider,
};

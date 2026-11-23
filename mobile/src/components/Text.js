/**
 * Text, wired to the design's type scale.
 *
 * `<Text variant="h1">` resolves to the exact fontSize / tracking / weight from
 * the board (design/tokens.md). Currency and counts pass `tabular` so digits
 * line up in columns the way they do in the design.
 */
import { Text as RNText } from 'react-native';
import { colors, type as scale } from '../theme/tokens';
import { familyFor } from '../theme/fonts';

export function Text({
  variant = 'body',
  color = colors.ink,
  tabular = false,
  align,
  style,
  children,
  numberOfLines,
  ...rest
}) {
  const spec = scale[variant] || scale.body;
  const base = {
    fontFamily: familyFor(spec.weight),
    fontSize: spec.fontSize,
    letterSpacing: spec.letterSpacing,
    color,
    fontVariant: tabular ? ['tabular-nums'] : undefined,
  };
  if (align) base.textAlign = align;
  // A fixed lineHeight keeps multi-line blocks on the 8pt rhythm.
  if (spec.fontSize >= 16) base.lineHeight = Math.round(spec.fontSize * 1.24);

  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[base, style]}
      // Android renders fontVariant through the font; iOS and web honour it.
      allowFontScaling={false}
      {...rest}
    >
      {children}
    </RNText>
  );
}

/** Convenience wrapper that guarantees tabular figures for money strings. */
export function Money({ children, variant = 'bodyStrong', color = colors.ink, style, ...rest }) {
  return (
    <Text variant={variant} color={color} tabular style={style} {...rest}>
      {children}
    </Text>
  );
}

export default Text;

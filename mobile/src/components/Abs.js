/**
 * Absolute-positioning helpers.
 *
 * The board was drawn at absolute coordinates on a 390x844 frame, so the most
 * faithful port places each element at those same coordinates rather than
 * re-deriving them with flex layout. Every number passed to `<Abs>` and `<T>`
 * comes from design/spec/<screen>.json.
 *
 * `<T>` reproduces FigCraft's text box: a fixed (x, y, w, h) with the line box
 * height taken from the design, so baselines land where they do in the export.
 */
import { Text as RNText, View } from 'react-native';
import { colors } from '../theme/tokens';
import { familyFor } from '../theme/fonts';

/** Absolutely positioned box. */
export function Abs({ x, y, w, h, style, children, ...rest }) {
  return (
    <View style={[{ position: 'absolute', left: x, top: y, width: w, height: h }, style]} {...rest}>
      {children}
    </View>
  );
}

const WEIGHT_NAME = {
  Regular: '400',
  Medium: '500',
  'Semi Bold': '600',
  Bold: '700',
  'Extra Bold': '800',
};

/**
 * Text at exact design coordinates.
 * `fw` accepts FigCraft's names ("Semi Bold") or a numeric weight.
 *
 * `w` comes from the design file, where it is the *measured* width of the text
 * in FigCraft's renderer. Inter's advance widths differ very slightly, so
 * setting that width verbatim would ellipsize a few strings. For left-aligned
 * text the glyphs start at `x` regardless of how wide the box is, so the box is
 * padded on the right to give the layout room; pass `tight` to use `w` exactly.
 * Right- and centre-aligned text keeps `w` as given, because padding would move
 * the edge the text is anchored to.
 *
 * Note: `T` is always absolutely positioned in its parent's coordinate space.
 * To label a button, render the button and the `T` as siblings at the same
 * coordinates rather than nesting `T` inside a flush/flex-centred button —
 * absolute coordinates are what make the output match the design.
 */
export function T({
  t,
  x,
  y,
  w,
  h,
  fs = 13,
  fw = 'Regular',
  ls = 0,
  color = colors.ink,
  align = 'left',
  tabular = false,
  tight = false,
  style,
  numberOfLines = 1,
  children,
  ...rest
}) {
  const weight = WEIGHT_NAME[fw] || String(fw);
  const boxWidth = !tight && align === 'left' ? w + 40 : w;
  return (
    <RNText
      allowFontScaling={false}
      numberOfLines={numberOfLines}
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: boxWidth,
          height: h,
          fontFamily: familyFor(weight),
          fontSize: fs,
          lineHeight: h,
          letterSpacing: ls,
          color,
          textAlign: align,
          fontVariant: tabular ? ['tabular-nums'] : undefined,
          includeFontPadding: false,
          textAlignVertical: 'top',
        },
        style,
      ]}
      {...rest}
    >
      {children ?? t}
    </RNText>
  );
}

export default { Abs, T };

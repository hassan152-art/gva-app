/**
 * Font loading for Inter.
 *
 * The design uses Inter at four weights with tabular figures for currency.
 * React Native resolves a weight by family name, so each weight is registered
 * as its own family: `fonts.regular`, `fonts.medium`, etc.
 *
 * Tabular figures are pulled from the `tnum` OpenType feature via
 * `fontVariant: ['tabular-nums']`, which React Native supports on both web and
 * native, so amounts line up exactly as they do on the board.
 */
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

export const fontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
};

/** Map the design's numeric weights onto loaded families. */
export function familyFor(weight = '400') {
  switch (String(weight)) {
    case '500':
      return fonts.medium;
    case '600':
      return fonts.semibold;
    case '700':
      return fonts.bold;
    case '800':
      return fonts.extrabold;
    default:
      return fonts.regular;
  }
}

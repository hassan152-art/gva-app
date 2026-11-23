/**
 * Social sign-in rows (Finimize / Stardust) — icon pinned left, label centered.
 */
import { Pressable, View } from 'react-native';
import { colors, radii, space } from '../../theme/tokens';
import { Text } from '../Text';
import { AppleMark, GoogleG } from '../Icon';

const ICON_SLOT = 52;

export function SocialAuthRow({ label, kind, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        height: 52,
        borderRadius: radii.chip,
        borderWidth: 1,
        borderColor: colors.socialBorder,
        backgroundColor: colors.surface,
        marginBottom: space.md,
        justifyContent: 'center',
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: ICON_SLOT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {kind === 'apple' ? <AppleMark size={22} color={colors.ink} /> : <GoogleG size={22} />}
      </View>
      <Text variant="bodyStrong" align="center" style={{ fontSize: 16, paddingHorizontal: ICON_SLOT }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SocialAuthIcons({ onApple, onGoogle }) {
  const circle = (child, onPress, accessibilityLabel) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: colors.hairline,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {child}
    </Pressable>
  );

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
      <View style={{ marginHorizontal: space.sm }}>
        {circle(<AppleMark size={24} color={colors.ink} />, onApple, 'Continue with Apple')}
      </View>
      <View style={{ marginHorizontal: space.sm }}>
        {circle(<GoogleG size={24} />, onGoogle, 'Continue with Google')}
      </View>
    </View>
  );
}

export default SocialAuthRow;

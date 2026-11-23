/**
 * Top safe-area toast pill (PayPal green success / Neo & Fabric dark neutral).
 */
import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radii, space } from '../theme/tokens';
import { Text } from './Text';
import { Icon } from './Icon';

const TONE = {
  success: {
    bg: colors.greenDeep,
    fg: colors.white,
    icon: 'check',
    iconBg: 'rgba(255,255,255,0.18)',
  },
  error: {
    bg: colors.ink,
    fg: colors.white,
    icon: 'alertcircle',
    iconBg: 'rgba(237,44,57,0.35)',
  },
  info: {
    bg: colors.statusBarPill,
    fg: colors.white,
    icon: 'bell',
    iconBg: 'rgba(255,255,255,0.12)',
  },
};

export function ToastHost({ toast, onDismiss }) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    if (!toast) {
      opacity.setValue(0);
      translateY.setValue(-16);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, speed: 18, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, [toast, opacity, translateY]);

  if (!toast) return null;

  const tone = TONE[toast.tone] || TONE.info;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 9999,
        alignItems: 'center',
        paddingTop: insets.top + space.sm,
        paddingHorizontal: layout.gutter,
      }}
    >
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }],
          width: '100%',
          maxWidth: layout.width,
        }}
      >
        <Pressable
          onPress={onDismiss}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: tone.bg,
            borderRadius: radii.chip,
            paddingVertical: 12,
            paddingHorizontal: 14,
            shadowColor: colors.scrim,
            shadowOpacity: 0.22,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: tone.iconBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: space.md,
            }}
          >
            <Icon name={tone.icon} size={16} color={tone.fg} strokeWidth={2.2} />
          </View>
          <Text variant="label" color={tone.fg} style={{ flex: 1, fontSize: 14, lineHeight: 19 }}>
            {toast.message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

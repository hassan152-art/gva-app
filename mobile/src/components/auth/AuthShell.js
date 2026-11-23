/**
 * Shared auth layout — scroll, safe area, optional back, centered brand column.
 * Patterns from Finimize login + Mindvalley sign-up (Mobbin refs).
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, space } from '../../theme/tokens';
import { Text } from '../Text';
import { Icon } from '../Icon';
import { LogoLockup } from '../chrome';

export function AuthShell({
  children,
  title,
  subtitle,
  showBack = false,
  onBack,
  footer,
  scroll = true,
  logoWidth = 120,
  header,
  entranceFromSplash = false,
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const entrance = useRef(new Animated.Value(entranceFromSplash ? 0 : 1)).current;

  useEffect(() => {
    if (!entranceFromSplash) return;
    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      delay: 40,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, entranceFromSplash]);

  const entranceStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
    ],
  };

  function goBack() {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/sign-in');
  }

  const body = (
    <View
      style={{
        paddingHorizontal: layout.gutter,
        paddingTop: Math.max(insets.top, 12) + space.sm,
        paddingBottom: insets.bottom + space.xl,
        maxWidth: layout.width,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      {showBack ? (
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.fieldAlt,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space.md,
          }}
        >
          <Icon name="chevleft" size={20} color={colors.ink} strokeWidth={2} />
        </Pressable>
      ) : null}

      <Animated.View style={entranceStyle}>
        {header ?? (
          <View style={{ alignItems: 'center', marginBottom: space.lg }}>
            <LogoLockup width={logoWidth} />
          </View>
        )}

        {title ? (
          <Text variant="display" align="center" style={{ marginBottom: subtitle ? space.sm : space.lg }}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="body" color={colors.muted} align="center" style={{ marginBottom: space.xl, fontSize: 16, lineHeight: 22 }}>
            {subtitle}
          </Text>
        ) : null}

        {children}

        {footer ? <View style={{ marginTop: space.xl }}>{footer}</View> : null}
      </Animated.View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Muted footer row: "New here?" + link */
export function AuthFooterLink({ prompt, actionLabel, onPress }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
      <Text variant="body" color={colors.muted} style={{ fontSize: 15 }}>
        {prompt}{' '}
      </Text>
      <Pressable onPress={onPress} hitSlop={8}>
        <Text variant="label" color={colors.green} style={{ fontSize: 15 }}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

export default AuthShell;

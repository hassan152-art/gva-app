/**
 * Tolan-style splash — centered lockup, spinner above home indicator.
 * @see https://mobbin.com/screens/ad2b05e4-e5da-418d-9e2c-f8d5c508fade
 */
import { ActivityIndicator, Animated, Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPLASH_BG, SPLASH_LOGO_ASPECT, SPLASH_LOGO_WIDTH } from '../../constants/brand';
import { colors } from '../../theme/tokens';

export { SPLASH_BG };

const splashLogo = require('../../../assets/splash-logo.png');

export function BrandSplash({ exitProgress }) {
  const insets = useSafeAreaInsets();
  const exit = exitProgress ?? null;

  const logoOpacity = exit
    ? exit.interpolate({
        inputRange: [0, 0.7, 1],
        outputRange: [1, 0.6, 0],
      })
    : 1;

  const chromeOpacity = exit
    ? exit.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [1, 0.5, 0],
      })
    : 1;

  const whiteReveal = exit
    ? exit.interpolate({
        inputRange: [0, 0.35, 1],
        outputRange: [0, 0.2, 1],
      })
    : 0;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.centerStage}>
        <Animated.View style={{ opacity: logoOpacity }}>
          <Image
            source={splashLogo}
            style={{
              width: SPLASH_LOGO_WIDTH,
              height: SPLASH_LOGO_WIDTH * SPLASH_LOGO_ASPECT,
            }}
            resizeMode="contain"
            accessibilityLabel="Virtual Adoption"
          />
        </Animated.View>
      </View>
      <Animated.View style={[styles.spinnerWrap, { bottom: Math.max(insets.bottom, 16) + 28, opacity: chromeOpacity }]}>
        <ActivityIndicator size="large" color={colors.green} style={{ transform: [{ scale: 0.85 }] }} />
      </Animated.View>
      {exit ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.surface, opacity: whiteReveal }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  spinnerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

export default BrandSplash;

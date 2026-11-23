/**
 * Brand splash — Tolan-style hold + spinner, then fade to sign-in.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandSplash } from '../components/auth/BrandSplash';
import { useAuth } from '../hooks/useAuth';

const SPLASH_HOLD_MS = 1400;
const EXIT_MS = 520;

export default function WelcomeScreen() {
  const router = useRouter();
  const { signedIn, restoring } = useAuth();
  const exitProgress = useRef(new Animated.Value(0)).current;
  const navigating = useRef(false);

  useEffect(() => {
    if (restoring) return;

    if (signedIn) {
      router.replace('/');
      return;
    }

    const holdTimer = setTimeout(() => {
      if (navigating.current) return;
      navigating.current = true;
      Animated.timing(exitProgress, {
        toValue: 1,
        duration: EXIT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          router.replace({ pathname: '/sign-in', params: { fromSplash: '1' } });
        }
      });
    }, SPLASH_HOLD_MS);

    return () => clearTimeout(holdTimer);
  }, [signedIn, restoring, router, exitProgress]);

  return <BrandSplash exitProgress={exitProgress} />;
}

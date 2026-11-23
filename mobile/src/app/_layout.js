/**
 * Root layout: fonts, auth provider, and the route stack.
 *
 * Fonts are loaded before the first paint so screens never render in a
 * fallback face — text metrics are what make the screens match the design.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { fontAssets } from '../theme/fonts';
import { colors } from '../theme/tokens';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { ToastProvider } from '../hooks/useToast';
import { InAppNotificationProvider } from '../hooks/useInAppNotifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Sends signed-out users to sign-in and signed-in users away from auth. */
function AuthGate() {
  const { signedIn, restoring } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (restoring) return;
    const inAuthGroup =
      segments[0] === 'welcome' || segments[0] === 'sign-in' || segments[0] === 'sign-up';
    if (!signedIn && !inAuthGroup) {
      router.replace('/welcome');
    } else if (signedIn && inAuthGroup) {
      router.replace('/');
    }
  }, [signedIn, restoring, segments, router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <InAppNotificationProvider>
            <RootNavigation />
          </InAppNotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigation() {
  const { restoring } = useAuth();

  if (restoring) {
    return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <StatusBar style="auto" />
      <AuthGate />
      <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.surface },
                  animation: 'fade',
                }}
              >
                <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
                <Stack.Screen name="sign-in" options={{ animation: 'none' }} />
                <Stack.Screen name="sign-up" />
                <Stack.Screen name="index" />
                <Stack.Screen name="sponsor" />
                <Stack.Screen name="payments" />
                <Stack.Screen name="profile" />
                <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="orphans/all" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen
                  name="checkout/stripe"
                  options={{ animation: 'slide_from_bottom' }}
                />
      </Stack>
    </View>
  );
}

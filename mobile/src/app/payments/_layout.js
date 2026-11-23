import { Stack } from 'expo-router';

/** The payments group shares the app's headerless stack. */
export default function PaymentsLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}

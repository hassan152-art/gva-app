import { Stack } from 'expo-router';

/** The checkout group is a headerless stack, as the hosted flow has no app chrome. */
export default function CheckoutLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }} />;
}

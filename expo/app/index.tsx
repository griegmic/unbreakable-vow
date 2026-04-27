import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

/**
 * Native app entrypoint.
 *
 * Project Parody rule: Rork QR / Expo Go should not land on the old bespoke
 * native guided flow. The approved maker surface currently lives in
 * `quick-vow`, which is the closest native match to the mobile web flow and
 * includes the native upgrades we want: haptics, contacts, and Expo Go payment
 * bypass.
 */
export default function HomeRedirect() {
  useEffect(() => {
    router.replace('/quick-vow');
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: '#080604' }} />
    </>
  );
}

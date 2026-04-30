import { Stack } from 'expo-router';

export default function NativePerfectLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="create" />
    </Stack>
  );
}

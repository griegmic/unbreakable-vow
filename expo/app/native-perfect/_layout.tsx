import { Stack } from 'expo-router';

export default function NativePerfectLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="post-seal" />
      <Stack.Screen name="waiting" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="quick-vow" />
      <Stack.Screen name="vow-detail" />
      <Stack.Screen name="judging" />
      <Stack.Screen name="dares" />
      <Stack.Screen name="history" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="w" />
    </Stack>
  );
}

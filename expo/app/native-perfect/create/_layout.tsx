import { Stack } from 'expo-router';

export default function CreateFlowLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="vow" options={{ animation: 'fade' }} />
      <Stack.Screen name="stake" />
      <Stack.Screen name="witness" />
    </Stack>
  );
}

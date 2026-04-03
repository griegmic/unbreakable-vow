import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { VowFlowProvider } from '@/providers/vow-flow';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="refine" />
      <Stack.Screen name="witness" />
      <Stack.Screen name="stake" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="seal" />
      <Stack.Screen name="sent" />
      <Stack.Screen name="live" />
      <Stack.Screen name="witness-invite" />
      <Stack.Screen name="witness-verdict" />
      <Stack.Screen name="vow-kept" />
      <Stack.Screen name="vow-broken" />
      <Stack.Screen name="history" />
      <Stack.Screen name="challenges" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <VowFlowProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </VowFlowProvider>
    </QueryClientProvider>
  );
}

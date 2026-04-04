import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { IntroCeremony } from '@/components/intro-ceremony';
import { OathStateProvider, useOathState } from '@/providers/oath-state';
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
      <Stack.Screen name="crew-invite" />
    </Stack>
  );
}

function AppWithOath() {
  const { ready, shouldShowIntro, shouldShowOath, completeIntro, dismissOath } = useOathState();

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#030508' }} />;
  }

  const showCeremony = shouldShowIntro || shouldShowOath;

  return (
    <View style={{ flex: 1, backgroundColor: '#030508' }}>
      <RootLayoutNav />
      {showCeremony ? (
        <IntroCeremony
          showFullIntro={shouldShowIntro}
          onComplete={shouldShowIntro ? completeIntro : dismissOath}
        />
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <OathStateProvider>
        <VowFlowProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AppWithOath />
          </GestureHandlerRootView>
        </VowFlowProvider>
      </OathStateProvider>
    </QueryClientProvider>
  );
}

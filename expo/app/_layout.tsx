import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { IntroCeremony } from '@/components/intro-ceremony';
import '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@/providers/auth-provider';
import { OathStateProvider, useOathState } from '@/providers/oath-state';
import { VowFlowProvider } from '@/providers/vow-flow';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function RootLayoutNav() {
  console.log('[RootLayoutNav] rendering stack');
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
      <Stack.Screen name="settings" />
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
    console.log('[RootLayout] hiding splash');
    void SplashScreen.hideAsync();

    const sub = Notifications.addNotificationReceivedListener(notification => {
      console.log('[RootLayout] notification received:', notification.request.content.title);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      if (data?.route && typeof data.route === 'string') {
        // Only route to protected screens if user has a session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push(data.route as never);
        } else {
          router.push('/auth' as never);
        }
      }
    });

    return () => {
      sub.remove();
      responseSub.remove();
    };
  }, []);

  const inner = (
    <QueryClientProvider client={queryClient}>
      <OathStateProvider>
        <AuthProvider>
        <VowFlowProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AppWithOath />
          </GestureHandlerRootView>
        </VowFlowProvider>
        </AuthProvider>
      </OathStateProvider>
    </QueryClientProvider>
  );

  if (Platform.OS === 'web') return inner;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { StripeProvider } = require('@stripe/stripe-react-native');
  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      {inner}
    </StripeProvider>
  );
}

import 'react-native-url-polyfill/auto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { StripeWrapper } from '@/components/stripe-wrapper';
import { USE_NATIVE_PERFECT } from '@/lib/native-flags';
import { recordNotificationOpened, refreshPushTokenIfGranted } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@/providers/auth-provider';
import { OathStateProvider } from '@/providers/oath-state';
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
      <Stack.Screen name="refine" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="witness" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="stake" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="seal" options={{ animation: 'slide_from_right' }} />

      <Stack.Screen name="dashboard" />
      <Stack.Screen name="vow-detail" />
      <Stack.Screen name="live" />
      <Stack.Screen name="vow-kept" />
      <Stack.Screen name="vow-broken" />
      <Stack.Screen name="self-resolve" />
      <Stack.Screen name="history" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="quick-vow" />
      <Stack.Screen name="guided" />
      <Stack.Screen name="native-guided" />
      <Stack.Screen name="native-quick-vow" />
      <Stack.Screen name="native-seal" />
      <Stack.Screen name="native-dashboard" />
      <Stack.Screen name="native-vow-detail" />
      <Stack.Screen name="cast" />
      <Stack.Screen name="external-web" />
      <Stack.Screen name="native-perfect" />
    </Stack>
  );
}

function AppWithOath() {
  return (
    <View style={{ flex: 1, backgroundColor: '#030508' }}>
      <RootLayoutNav />
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    console.log('[RootLayout] hiding splash');
    void SplashScreen.hideAsync();
    void refreshPushTokenIfGranted();

    const sub = Notifications.addNotificationReceivedListener(notification => {
      console.log('[RootLayout] notification received:', notification.request.content.title);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      void recordNotificationOpened(data as Record<string, unknown>);
      if (data?.route && typeof data.route === 'string') {
        const route = data.route;
        if (route.startsWith('/w/') && USE_NATIVE_PERFECT) {
          const token = route.split('/')[2]?.split('?')[0];
          if (token) {
            router.push(`/native-perfect/w/${token}` as never);
            return;
          }
        }

        // Only route to protected screens if user has a session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (route.startsWith('/w/') || route.startsWith('/c/')) {
            if (route.startsWith('/w/') && USE_NATIVE_PERFECT) {
              const token = route.split('/')[2]?.split('?')[0];
              if (token) {
                router.push(`/native-perfect/w/${token}` as never);
                return;
              }
            }
            router.push({
              pathname: '/external-web',
              params: { url: encodeURIComponent(`https://unbreakablevow.app${route}`) },
            } as never);
          } else {
            router.push(route as never);
          }
        } else {
          router.push('/' as never);
        }
      }
    });

    return () => {
      sub.remove();
      responseSub.remove();
    };
  }, []);

  return (
    <StripeWrapper>
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
    </StripeWrapper>
  );
}

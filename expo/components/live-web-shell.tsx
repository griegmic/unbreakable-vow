import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowLeft, RotateCw } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { palette } from '@/constants/unbreakable';

const BASE_URL = 'https://www.unbreakablevow.app';

type LiveWebShellProps = {
  path?: string;
};

function resolveUrl(path?: string) {
  if (!path || path === '/') return `${BASE_URL}/quick-vow?app=1`;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const joiner = normalized.includes('?') ? '&' : '?';
  return `${BASE_URL}${normalized}${joiner}app=1`;
}

export function LiveWebShell({ path = '/quick-vow' }: LiveWebShellProps) {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialUrl = useMemo(() => resolveUrl(path), [path]);

  const handleNavigation = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  };

  const goBack = () => {
    void Haptics.selectionAsync();
    if (canGoBack) {
      webRef.current?.goBack();
      return;
    }
    router.replace('/quick-vow');
  };

  const reload = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webRef.current?.reload();
  };

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.chrome}>
        <Pressable onPress={goBack} style={styles.iconButton} hitSlop={10} testID="web-shell-back">
          <ArrowLeft color={palette.text} size={18} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>Unbreakable Vow</Text>
        <Pressable onPress={reload} style={styles.iconButton} hitSlop={10} testID="web-shell-reload">
          <RotateCw color={palette.textSecondary} size={16} />
        </Pressable>
      </View>
      <View style={styles.webFrame}>
        {loading && Platform.OS !== 'web' ? (
          <View style={styles.loader}>
            <ActivityIndicator color={palette.goldBright} />
          </View>
        ) : null}
        {Platform.OS === 'web'
          ? React.createElement('iframe', {
              src: initialUrl,
              style: iframeStyle,
              title: 'Unbreakable Vow',
            })
          : (
              <WebView
                ref={webRef}
                source={{ uri: initialUrl }}
                style={styles.web}
                startInLoadingState
                sharedCookiesEnabled
                thirdPartyCookiesEnabled
                javaScriptEnabled
                domStorageEnabled
                allowsBackForwardNavigationGestures
                bounces={false}
                pullToRefreshEnabled={Platform.OS === 'android'}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onNavigationStateChange={handleNavigation}
                setSupportMultipleWindows={false}
                injectedJavaScriptBeforeContentLoaded={`
                  window.__UNBREAKABLE_VOW_NATIVE_APP__ = true;
                  true;
                `}
              />
            )}
      </View>
    </View>
  );
}

const iframeStyle = {
  width: '100%',
  height: '100%',
  borderWidth: 0,
  borderStyle: 'none',
  backgroundColor: '#080705',
} as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080705',
  },
  chrome: {
    height: 42,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#080705',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(240,232,216,0.08)',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,232,216,0.04)',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  webFrame: {
    flex: 1,
    backgroundColor: '#080705',
  },
  web: {
    flex: 1,
    backgroundColor: '#080705',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080705',
  },
});

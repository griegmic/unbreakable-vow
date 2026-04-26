import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualScreen } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';

export default function ExternalWebScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const [opened, setOpened] = useState(false);
  const url = useMemo(() => {
    if (!params.url) return 'https://unbreakablevow.app';
    try {
      return decodeURIComponent(params.url);
    } catch {
      return params.url;
    }
  }, [params.url]);

  useEffect(() => {
    if (opened) return;
    setOpened(true);
    void WebBrowser.openBrowserAsync(url);
  }, [opened, url]);

  return (
    <RitualScreen
      scroll={false}
      footer={
        <>
          <PrimaryButton
            label="Continue in browser"
            onPress={() => void WebBrowser.openBrowserAsync(url)}
            testID="external-web-open"
          />
          <Pressable onPress={() => router.replace('/dashboard')} style={styles.secondary}>
            <Text style={styles.secondaryText}>Back to my vows</Text>
          </Pressable>
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <ExternalLink color={palette.goldBright} size={28} />
        </View>
        <Text style={styles.title}>Opening the invite.</Text>
        <Text style={styles.body}>
          Witness and dare invites open in browser so anyone can answer, app or not.
        </Text>
      </View>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 18,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(200,155,60,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200,155,60,0.24)',
  },
  title: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryText: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});

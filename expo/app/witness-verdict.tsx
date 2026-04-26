import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualScreen } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

export default function WitnessVerdictWebRedirectScreen() {
  const params = useLocalSearchParams<{ token?: string; early?: string }>();
  const { vow } = useVowFlow();
  const token = params.token || vow.witnessInviteToken;
  const url = useMemo(() => {
    if (!token) return 'https://unbreakablevow.app';
    const suffix = params.early ? '?early=1' : '';
    return `https://unbreakablevow.app/w/${token}/verdict${suffix}`;
  }, [params.early, token]);

  useEffect(() => {
    void WebBrowser.openBrowserAsync(url);
  }, [url]);

  return (
    <RitualScreen
      scroll={false}
      footer={
        <PrimaryButton
          label="Open verdict"
          onPress={() => void WebBrowser.openBrowserAsync(url)}
          testID="witness-verdict-open-web"
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.center}>
        <ExternalLink color={palette.goldBright} size={28} />
        <Text style={styles.title}>Opening verdict.</Text>
        <Text style={styles.body}>Witness decisions happen in the web flow.</Text>
        <Text style={styles.back} onPress={() => router.replace('/dashboard')}>Back to my vows</Text>
      </View>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
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
    textAlign: 'center',
  },
  back: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
});

import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualScreen } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';

export default function WitnessInviteWebRedirectScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const url = useMemo(() => {
    if (!params.token) return 'https://unbreakablevow.app';
    return `https://unbreakablevow.app/w/${params.token}`;
  }, [params.token]);

  useEffect(() => {
    void WebBrowser.openBrowserAsync(url);
  }, [url]);

  return (
    <RitualScreen
      scroll={false}
      footer={
        <PrimaryButton
          label="Open witness invite"
          onPress={() => void WebBrowser.openBrowserAsync(url)}
          testID="witness-invite-open-web"
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.center}>
        <ExternalLink color={palette.goldBright} size={28} />
        <Text style={styles.title}>Opening invite.</Text>
        <Text style={styles.body}>Witnesses use the web flow.</Text>
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

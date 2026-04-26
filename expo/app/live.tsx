import { Stack, router, useLocalSearchParams } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RitualScreen } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';

export default function LegacyLiveRedirectScreen() {
  const params = useLocalSearchParams<{ vowId?: string; justSealed?: string }>();

  useEffect(() => {
    if (params.vowId) {
      router.replace({
        pathname: '/vow-detail',
        params: {
          vowId: params.vowId,
          ...(params.justSealed ? { justSealed: params.justSealed } : {}),
        },
      });
      return;
    }

    router.replace('/dashboard');
  }, [params.justSealed, params.vowId]);

  return (
    <RitualScreen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.center}>
        <RefreshCw color={palette.goldBright} size={28} />
        <Text style={styles.title}>Opening your vow.</Text>
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
  },
  title: {
    color: palette.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
});

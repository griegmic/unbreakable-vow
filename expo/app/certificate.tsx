import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Share as ShareIcon } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { VowCertificate } from '@/components/vow-certificate';
import { PrimaryButton, RitualScreen, SecondaryButton, TitleBlock } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

export default function CertificateScreen() {
  const { activeVowText, vow } = useVowFlow();
  const certRef = useRef<View>(null);
  const [sharing, setSharing] = useState<boolean>(false);

  const sealDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (Platform.OS === 'web') {
        await Share.share({
          message: `I just sealed an Unbreakable Vow: "${activeVowText}" — $${vow.stake.amount} on the line. unbreakablevow.app`,
        });
        setSharing(false);
        return;
      }

      const uri = await captureRef(certRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      console.log('[CertificateScreen] captured certificate:', uri);

      await Share.share({ url: uri });
    } catch (err) {
      console.log('[CertificateScreen] share error:', err);
      if ((err as Error)?.message !== 'User did not share') {
        Alert.alert('Couldn\'t share', 'Try taking a screenshot instead.');
      }
    } finally {
      setSharing(false);
    }
  }, [sharing, activeVowText, vow.stake.amount]);

  const handleContinue = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/live');
  }, []);

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label={sharing ? 'Preparing...' : 'Share your vow'}
            onPress={handleShare}
            disabled={sharing}
            testID="certificate-share"
          />
          <SecondaryButton
            label="Continue"
            onPress={handleContinue}
            testID="certificate-continue"
          />
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <TitleBlock
        title="It's official."
        subtitle="Share your vow — let people know you mean it."
      />

      <View style={styles.certWrapper}>
        <VowCertificate
          ref={certRef}
          vowText={activeVowText}
          stakeAmount={vow.stake.amount}
          sealDate={sealDate}
        />
      </View>

      <View style={styles.hint}>
        <ShareIcon color={palette.textMuted} size={14} />
        <Text style={styles.hintText}>Optimized for Instagram Stories</Text>
      </View>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  certWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hintText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '500' as const,
  },
});

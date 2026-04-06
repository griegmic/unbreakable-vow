import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Check, Send } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { VowCertificate } from '@/components/vow-certificate';
import { PrimaryButton, RitualScreen, TitleBlock } from '@/components/vow-ui';
import { getVowVerdictDate, palette } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

export default function SentScreen() {
  const { activeVowText, vow, isSelfWitness } = useVowFlow();
  const dates = getVowVerdictDate(vow.rawInput);
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[SentScreen] vow sealed, playing success animation');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 12 }),
      Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShareWithWitness = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS !== 'web') {
      try {
        const inviteUrl = vow.witnessInviteToken
          ? `https://unbreakablevow.app/witness-invite?token=${vow.witnessInviteToken}`
          : '';
        const shareMsg = inviteUrl
          ? `I just made an Unbreakable Vow \u2014 ${activeVowText}. You're my witness. ${inviteUrl}`
          : `I just made an Unbreakable Vow. Can you hold me to it?`;
        await Share.share({ message: shareMsg });
      } catch {
        console.log('[SentScreen] share failed');
      }
    }
  };

  return (
    <RitualScreen
      footer={
        <PrimaryButton label="Got it" onPress={() => router.push('/live')} testID="sent-continue" />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.checkWrap}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
          <Check color={palette.success} size={24} strokeWidth={2.5} />
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: contentFade }}>
        <TitleBlock
          title={isSelfWitness ? 'Sealed.' : `Sealed. Now tell ${vow.witnessName}.`}
          subtitle={
            isSelfWitness
              ? 'Your vow is locked. You\'ll judge yourself when the time comes.'
              : vow.phoneNumber
                ? `We texted ${vow.witnessName}. They'll get the details.`
                : `Share the link so ${vow.witnessName} can accept.`
          }
        />
      </Animated.View>

      <Animated.View style={{ opacity: contentFade }}>
        <VowCertificate
          vowText={activeVowText}
          stakeAmount={vow.stake.amount}
          sealDate={dates.range}
        />
      </Animated.View>

      {!isSelfWitness && (
        <Animated.View style={{ opacity: contentFade }}>
          <Pressable
            onPress={handleShareWithWitness}
            style={({ pressed }) => [styles.shareNudge, pressed && styles.shareNudgePressed]}
            testID="sent-share-witness"
          >
            <Send color={palette.goldBright} size={18} />
            <Text style={styles.shareNudgeText}>Send to {vow.witnessName}</Text>
          </Pressable>
        </Animated.View>
      )}
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  checkWrap: {
    alignItems: 'center',
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.successMuted,
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#52D69A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  shareNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(212,162,79,0.3)',
    backgroundColor: 'rgba(212,162,79,0.06)',
  },
  shareNudgePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  shareNudgeText: {
    color: palette.goldBright,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Check, Share2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
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

  const hasSMS = !!vow.phoneNumber;

  useEffect(() => {
    console.log('[SentScreen] vow sealed, playing success animation');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 12 }),
      Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTitle = (): string => {
    if (isSelfWitness) return 'Sealed.';
    if (hasSMS) return `Sealed. ${vow.witnessName} has been notified.`;
    return `Sealed. Send it to ${vow.witnessName}.`;
  };

  const getSubtitle = (): string => {
    if (isSelfWitness) return 'Your vow is locked. You\'ll judge yourself when the time comes.';
    if (hasSMS) return `We sent them a text with the details. Share the link below if they need it again.`;
    return `Share the invite link so ${vow.witnessName} can accept and hold you to it.`;
  };

  const handleShareInvite = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const inviteUrl = vow.witnessInviteToken
        ? `https://unbreakablevow.app/witness-invite?token=${vow.witnessInviteToken}`
        : 'https://unbreakablevow.app';
      const shareMsg = `I made an Unbreakable Vow: "${activeVowText}" \u2014 and I need you to hold me to it. ${vow.stake.amount} is on the line. ${inviteUrl}`;
      console.log('[SentScreen] sharing invite:', inviteUrl);
      await Share.share(
        Platform.OS === 'ios'
          ? { message: shareMsg, url: inviteUrl }
          : { message: shareMsg }
      );
    } catch {
      console.log('[SentScreen] share failed');
    }
  }, [activeVowText, vow.stake.amount, vow.witnessInviteToken]);

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
          title={getTitle()}
          subtitle={getSubtitle()}
        />
      </Animated.View>

      {!isSelfWitness && (
        <Animated.View style={{ opacity: contentFade }}>
          <Pressable
            onPress={handleShareInvite}
            style={({ pressed }) => [styles.shareNudge, pressed && styles.shareNudgePressed]}
            testID="sent-share-witness"
          >
            <Share2 color={palette.goldBright} size={18} />
            <Text style={styles.shareNudgeText}>Share with {vow.witnessName}</Text>
          </Pressable>
        </Animated.View>
      )}

      <Animated.View style={{ opacity: contentFade }}>
        <VowCertificate
          vowText={activeVowText}
          stakeAmount={vow.stake.amount}
          sealDate={dates.range}
        />
      </Animated.View>
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

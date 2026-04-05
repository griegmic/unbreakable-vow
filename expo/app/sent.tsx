import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Check, Send } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualCard, RitualScreen, TitleBlock, VowPreview } from '@/components/vow-ui';
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
          ? `https://unbreakablevow.app/witness?token=${vow.witnessInviteToken}`
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

  const brokenTarget =
    vow.stake.consequence === 'witness'
      ? (isSelfWitness ? 'charity' : vow.witnessName)
      : vow.stake.destination;

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
              : 'Share the link so they can accept and hold you accountable.'
          }
        />
      </Animated.View>

      <Animated.View style={{ opacity: contentFade }}>
        <VowPreview text={activeVowText} />
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

      <Animated.View style={{ opacity: contentFade }}>
        <RitualCard>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{isSelfWitness ? 'Accountability' : 'Witness'}</Text>
            <Text style={styles.metaValue}>{isSelfWitness ? 'Self-judged' : vow.witnessName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Stake</Text>
            <Text style={styles.metaValueGold}>${vow.stake.amount}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>If broken</Text>
            <Text style={styles.metaValue}>{brokenTarget}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Verdict</Text>
            <Text style={styles.metaValue}>{dates.endLabel}</Text>
          </View>
        </RitualCard>
      </Animated.View>

      <Animated.View style={{ opacity: contentFade }}>
        <RitualCard style={styles.stepsCard}>
          {isSelfWitness ? (
            <>
              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
                <Text style={styles.stepText}>Honor your vow for the full window.</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
                <Text style={styles.stepText}>On {dates.endLabel}, you deliver your own honest verdict.</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
                <Text style={styles.stepText}>If broken, ${vow.stake.amount} goes to {brokenTarget}.</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
                <Text style={styles.stepText}>Share the invite link with {vow.witnessName}.</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
                <Text style={styles.stepText}>{vow.witnessName} delivers the verdict on {dates.endLabel}.</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
                <Text style={styles.stepText}>If broken, ${vow.stake.amount} goes to {brokenTarget}.</Text>
              </View>
            </>
          )}
        </RitualCard>
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    color: palette.textMuted,
    fontSize: 13,
  },
  metaValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  metaValueGold: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  stepsCard: {
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(212,162,79,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    color: palette.goldBright,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  stepText: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
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

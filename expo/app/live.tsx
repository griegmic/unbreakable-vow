import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { MessageCircleMore, ShieldCheck } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualCard, RitualScreen, SecondaryButton, StatPill, TitleBlock } from '@/components/vow-ui';
import { getVowDates, palette } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

export default function LiveScreen() {
  const { activeVowText, vow } = useVowFlow();
  const dates = getVowDates();
  const isVowkeeper = vow.witnessName === 'Vowkeeper';

  const brokenTarget =
    vow.stake.consequence === 'witness'
      ? vow.witnessName
      : vow.stake.destination;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenSMS = () => {
    void Haptics.selectionAsync();
    if (Platform.OS === 'web') return;
    Linking.openURL('sms:').catch(() => {
      console.log('[LiveScreen] failed to open SMS');
    });
  };

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton label={isVowkeeper ? 'Go to verdict' : 'Preview the witness verdict'} onPress={() => router.push('/witness-verdict')} testID="live-verdict" />
          <SecondaryButton label="View history" onPress={() => router.push('/history')} testID="live-history" />
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.statusBadgeWrap}>
        <View style={styles.statusBadgeRow}>
          <Animated.View style={[styles.statusPulse, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>VOW ACTIVE</Text>
          </View>
        </View>
      </View>

      <TitleBlock
        title={activeVowText}
        subtitle={`$${vow.stake.amount} at stake · Goes to ${brokenTarget} if broken`}
      />

      <View style={styles.statsRow}>
        <StatPill value="Day 1" label="of 7" />
        <StatPill value={dates.endLabel} label="verdict date" />
      </View>

      <RitualCard>
        <View style={styles.infoRow}>
          <MessageCircleMore color={palette.goldBright} size={18} />
          <Text style={styles.infoText}>
            {isVowkeeper
              ? 'Vowkeeper will check in with you via text during the week to keep you on track.'
              : `You, ${vow.witnessName}, and Vowkeeper are in a group text. Vowkeeper checks in during the week to keep you on track.`}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <ShieldCheck color={palette.textSecondary} size={18} />
          <Text style={styles.infoText}>
            {isVowkeeper
              ? 'On day 7, you deliver the final verdict yourself.'
              : `On day 7, ${vow.witnessName} delivers the final verdict.`}
          </Text>
        </View>
      </RitualCard>

      {!isVowkeeper ? (
        <Pressable style={styles.chatButton} onPress={handleOpenSMS} testID="live-open-chat">
          <Text style={styles.chatButtonText}>Open SMS thread</Text>
        </Pressable>
      ) : null}

      <Text style={styles.footerNote}>{dates.range} · {dates.verdictLabel}</Text>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  statusBadgeWrap: {
    alignItems: 'center',
  },
  statusBadgeRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPulse: {
    position: 'absolute',
    width: 60,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(82,214,154,0.1)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: palette.successMuted,
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.22)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.success,
  },
  statusText: {
    color: palette.success,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  chatButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  chatButtonText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  footerNote: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
  },
});

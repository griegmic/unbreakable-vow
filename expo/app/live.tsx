import { Stack, router } from 'expo-router';
import { MessageCircleMore, ShieldCheck } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualCard, RitualScreen, SecondaryButton, StatPill, TitleBlock } from '@/components/vow-ui';
import { getVowVerdictDate, palette } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

export default function LiveScreen() {
  const { activeVowText, vow, isSelfWitness } = useVowFlow();
  const dates = getVowVerdictDate(vow.rawInput);

  const brokenTarget =
    vow.stake.consequence === 'witness'
      ? vow.witnessName
      : vow.stake.destination;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!vow.rawInput) {
      console.log('[LiveScreen] empty vow state, redirecting home');
      router.replace('/');
    }
  }, [vow.rawInput]);

  useEffect(() => {
    console.log('[LiveScreen] vow active:', activeVowText);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label={isSelfWitness ? 'Deliver your verdict' : 'Preview the witness verdict'}
            onPress={() => router.push(isSelfWitness ? '/self-resolve' : '/witness-verdict')}
            testID="live-verdict"
          />
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
        subtitle={`${vow.stake.amount} at stake \u00B7 Goes to ${brokenTarget} if broken`}
      />

      <View style={styles.statsRow}>
        <StatPill value={dates.range} label="vow window" />
        <StatPill value={dates.endLabel} label="verdict date" />
      </View>

      <RitualCard>
        {isSelfWitness ? (
          <>
            <View style={styles.infoRow}>
              <ShieldCheck color={palette.goldBright} size={18} />
              <Text style={styles.infoText}>
                You're holding yourself accountable. On {dates.endLabel}, you'll deliver your own honest verdict.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <MessageCircleMore color={palette.goldBright} size={18} />
              <Text style={styles.infoText}>
                {vow.witnessName} is your witness. They'll get an SMS when it's time to deliver the verdict.
              </Text>
            </View>
            <View style={styles.infoRow}>
              <ShieldCheck color={palette.textSecondary} size={18} />
              <Text style={styles.infoText}>
                On {dates.endLabel}, {vow.witnessName} delivers the final verdict.
              </Text>
            </View>
          </>
        )}
      </RitualCard>

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
  footerNote: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
  },
});

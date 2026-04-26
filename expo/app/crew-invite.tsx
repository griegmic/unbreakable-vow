import { Stack, router } from 'expo-router';
import { Users } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualCard, RitualScreen, TitleBlock } from '@/components/vow-ui';
import { getVowVerdictDate, palette } from '@/constants/unbreakable';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

export default function CrewInviteScreen() {
  const { displayName } = useAuth();
  const { activeVowText, vow } = useVowFlow();
  const dates = useMemo(() => {
    if (vow.deadlineIso) {
      const end = new Date(vow.deadlineIso);
      const start = new Date();
      const formatShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const formatLong = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return {
        verdictLabel: `Verdict on ${formatLong(end)}`,
        endLabel: formatLong(end),
        range: `${formatShort(start)} \u2013 ${formatShort(end)}`,
        isCustomDate: true,
      };
    }
    return getVowVerdictDate(vow.rawInput);
  }, [vow.deadlineIso, vow.rawInput]);
  const makerName = displayName || 'Your friend';

  console.log('[CrewInviteScreen] rendering for witness:', vow.witnessName);

  return (
    <RitualScreen
      footer={
        <PrimaryButton
          label="Got it"
          onPress={() => router.replace('/dashboard')}
          testID="crew-invite-accept"
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.badgeWrap}>
        <View style={styles.badge}>
          <Users color={palette.goldBright} size={16} />
          <Text style={styles.badgeText}>YOU HAVE BEEN ADDED TO THE CREW</Text>
        </View>
      </View>

      <TitleBlock
        title={`${makerName} made a vow and added you to keep them honest.`}
        subtitle={`${vow.witnessName} delivers the final verdict. You are just here for accountability.`}
      />

      <RitualCard>
        <Text style={styles.sectionLabel}>THE VOW</Text>
        <Text style={styles.vowText}>{activeVowText}</Text>
        <View style={styles.rule} />
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>At stake</Text>
          <Text style={styles.metaValueGold}>${vow.stake.amount}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Witness</Text>
          <Text style={styles.metaValue}>{vow.witnessName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Verdict</Text>
          <Text style={styles.metaValue}>{dates.endLabel}</Text>
        </View>
      </RitualCard>

      <RitualCard>
        <Text style={styles.whatTitle}>Your role</Text>
        <View style={styles.stepRow}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
          <Text style={styles.stepText}>You are in the group chat with {makerName}, {vow.witnessName}, and Vowkeeper.</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
          <Text style={styles.stepText}>Cheer them on, call them out, keep them honest during the week.</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
          <Text style={styles.stepText}>On {dates.endLabel}, {vow.witnessName} makes the final call. You do not vote. You just watch.</Text>
        </View>
      </RitualCard>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  badgeWrap: {
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(212,162,79,0.08)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  badgeText: {
    color: palette.goldBright,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  sectionLabel: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.1,
  },
  vowText: {
    color: palette.text,
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '600' as const,
  },
  rule: {
    height: 1,
    backgroundColor: palette.border,
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
  whatTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700' as const,
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
    fontSize: 14,
    lineHeight: 20,
  },
});

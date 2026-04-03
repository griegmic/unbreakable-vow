import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ChevronRight, Settings, Trophy, Users } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, PrimaryButton, RitualCard, RitualScreen, StatPill, TitleBlock } from '@/components/vow-ui';
import { historyEntries, palette } from '@/constants/unbreakable';

export default function HistoryScreen() {
  const keptCount = historyEntries.filter((e) => e.kept).length;
  const brokenCount = historyEntries.filter((e) => !e.kept).length;
  const moneyProtected = historyEntries.filter((e) => e.kept).reduce((sum, e) => sum + e.amount, 0);
  const moneyLost = historyEntries.filter((e) => !e.kept).reduce((sum, e) => sum + e.amount, 0);

  return (
    <RitualScreen
      footer={
        <PrimaryButton
          label="Make a new vow"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace('/');
          }}
          testID="history-new-vow"
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <BackButton />
      <TitleBlock
        title="Your record"
        subtitle="Every vow you've made, kept, and broken."
      />

      <View style={styles.statsRow}>
        <StatPill value={`${keptCount}`} label="kept" tone="success" />
        <StatPill value={`${brokenCount}`} label="broken" tone="danger" />
      </View>
      <View style={styles.statsRow}>
        <StatPill value={`$${moneyProtected}`} label="protected" />
        <StatPill value={`$${moneyLost}`} label="lost" />
      </View>

      <Text style={styles.sectionTitle}>Past vows</Text>
      <RitualCard>
        {historyEntries.map((entry, index) => (
          <View key={entry.id} style={[styles.entryRow, index < historyEntries.length - 1 ? styles.entryRowBorder : null]}>
            <View style={styles.entryLeft}>
              <Text style={styles.entryTitle}>{entry.text}</Text>
              <Text style={styles.entryMeta}>{entry.date} · {entry.witness}</Text>
            </View>
            <View style={styles.entryRight}>
              <View style={[styles.statusPill, entry.kept ? styles.statusKept : styles.statusBroken]}>
                <Text style={[styles.statusText, entry.kept ? styles.statusTextKept : styles.statusTextBroken]}>
                  {entry.kept ? 'Kept' : 'Broken'}
                </Text>
              </View>
              <Text style={[styles.entryAmount, entry.kept ? styles.amountKept : styles.amountBroken]}>
                ${entry.amount}
              </Text>
            </View>
          </View>
        ))}
      </RitualCard>

      <Pressable
        style={styles.navRow}
        onPress={() => {
          void Haptics.selectionAsync();
          router.push('/challenges');
        }}
        testID="history-challenges"
      >
        <View style={styles.navIconWrap}>
          <Users color={palette.goldBright} size={18} />
        </View>
        <View style={styles.navCopy}>
          <View style={styles.navTitleRow}>
            <Text style={styles.navTitle}>Group Challenges</Text>
            <View style={styles.soonBadge}>
              <Text style={styles.soonBadgeText}>SOON</Text>
            </View>
          </View>
          <Text style={styles.navDesc}>Compete with hundreds on shared goals.</Text>
        </View>
        <ChevronRight color={palette.textMuted} size={16} />
      </Pressable>

      <Pressable
        style={styles.navRow}
        onPress={() => void Haptics.selectionAsync()}
        testID="history-settings"
      >
        <View style={styles.navIconWrapMuted}>
          <Settings color={palette.textMuted} size={18} />
        </View>
        <View style={styles.navCopy}>
          <Text style={styles.navTitle}>Settings</Text>
          <Text style={styles.navDesc}>Account, notifications, payment methods.</Text>
        </View>
        <ChevronRight color={palette.textMuted} size={16} />
      </Pressable>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionTitle: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  entryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  entryLeft: {
    flex: 1,
    gap: 4,
  },
  entryTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 21,
  },
  entryMeta: {
    color: palette.textMuted,
    fontSize: 12,
  },
  entryRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusKept: {
    backgroundColor: palette.successMuted,
    borderColor: 'rgba(82,214,154,0.22)',
  },
  statusBroken: {
    backgroundColor: palette.dangerMuted,
    borderColor: 'rgba(255,123,123,0.22)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  statusTextKept: {
    color: palette.success,
  },
  statusTextBroken: {
    color: palette.danger,
  },
  entryAmount: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  amountKept: {
    color: palette.success,
  },
  amountBroken: {
    color: palette.danger,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
  },
  navIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(212,162,79,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapMuted: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCopy: {
    flex: 1,
    gap: 3,
  },
  navTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  soonBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.18)',
  },
  soonBadgeText: {
    color: palette.goldBright,
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
  },
  navDesc: {
    color: palette.textMuted,
    fontSize: 13,
  },
});

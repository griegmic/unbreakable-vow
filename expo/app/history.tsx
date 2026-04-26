import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ChevronRight, Settings } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppMenuButton } from '@/components/app-menu';
import { BackButton, PrimaryButton, RitualCard, RitualScreen, StatPill, TitleBlock } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { getVowHistory } from '@/lib/vow-api';
import type { Database } from '@/types/database';

type VowRow = Database['public']['Tables']['vows']['Row'];

export default function HistoryScreen() {
  const [vows, setVows] = useState<VowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getVowHistory()
      .then((data) => {
        setVows(data as VowRow[]);
      })
      .catch((err) => {
        console.error('[HistoryScreen] failed to load vows:', err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const completedVows = vows.filter((v) => v.status === 'kept' || v.status === 'broken');
  const keptCount = completedVows.filter((v) => v.verdict === 'kept').length;
  const brokenCount = completedVows.filter((v) => v.verdict === 'broken').length;
  const moneyProtected = completedVows.filter((v) => v.verdict === 'kept').reduce((sum, v) => sum + Math.round(v.stake_amount / 100), 0);
  const moneyLost = completedVows.filter((v) => v.verdict === 'broken').reduce((sum, v) => sum + Math.round(v.stake_amount / 100), 0);

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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton />
        <AppMenuButton />
      </View>
      <TitleBlock
        title="Your record"
        subtitle="Every vow you've made, kept, and broken."
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={palette.goldBright} />
        </View>
      ) : error ? (
        <RitualCard>
          <Text style={styles.emptyText}>Could not load your vows. Try again.</Text>
        </RitualCard>
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatPill value={`${keptCount}`} label="kept" tone="success" />
            <StatPill value={`${brokenCount}`} label="broken" tone="danger" />
          </View>
          <View style={styles.statsRow}>
            <StatPill value={`$${moneyProtected}`} label="protected" />
            <StatPill value={`$${moneyLost}`} label="lost" />
          </View>

          {completedVows.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Past vows</Text>
              <RitualCard>
                {completedVows.map((vow, index) => {
                  const kept = vow.verdict === 'kept';
                  const amount = Math.round(vow.stake_amount / 100);
                  const date = vow.sealed_at
                    ? new Date(vow.sealed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '';
                  return (
                    <View key={vow.id} style={[styles.entryRow, index < completedVows.length - 1 ? styles.entryRowBorder : null]}>
                      <View style={styles.entryLeft}>
                        <Text style={styles.entryTitle}>{vow.refined_text}</Text>
                        <Text style={styles.entryMeta}>{date} · {vow.witness_name}</Text>
                      </View>
                      <View style={styles.entryRight}>
                        <View style={[styles.statusPill, kept ? styles.statusKept : styles.statusBroken]}>
                          <Text style={[styles.statusText, kept ? styles.statusTextKept : styles.statusTextBroken]}>
                            {kept ? 'Kept' : 'Broken'}
                          </Text>
                        </View>
                        <Text style={[styles.entryAmount, kept ? styles.amountKept : styles.amountBroken]}>
                          ${amount}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </RitualCard>
            </>
          ) : (
            <RitualCard>
              <Text style={styles.emptyText}>No completed vows yet.</Text>
            </RitualCard>
          )}
        </>
      )}

      <Pressable
        style={styles.navRow}
        onPress={() => {
          void Haptics.selectionAsync();
          router.push('/settings');
        }}
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
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
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
  emptyText: {
    color: palette.textMuted,
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 21,
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
  navTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  navDesc: {
    color: palette.textMuted,
    fontSize: 13,
  },
});

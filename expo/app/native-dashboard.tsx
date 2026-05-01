import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { ChevronRight, Diamond, Plus } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppMenuButton } from '@/components/app-menu';
import { hapticPrimary, hapticPullRefresh, hapticSelection } from '@/lib/haptics';
import { getMyVows, type VowRow } from '@/lib/vow-api';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

type DashboardVow = {
  id: string;
  title: string;
  status: VowRow['status'] | 'local';
  stake: number;
  witness: string;
  witnessAcceptedAt: string | null;
  destination: string;
  startsAt: string | null;
  endsAt: string | null;
  sealedAt: string | null;
  token?: string | null;
  local?: boolean;
};

export default function NativeDashboardScreen() {
  const { displayName, loading: authLoading } = useAuth();
  const { vow, activeVowText } = useVowFlow();
  const [vows, setVows] = useState<DashboardVow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      hapticPullRefresh();
    } else {
      setLoading(true);
    }
    try {
      const rows = await getMyVows();
      setVows(rows.map(toDashboardVow));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const draftVow = useMemo<DashboardVow | null>(() => {
    if (!activeVowText) return null;
    return {
      id: 'local-native-draft',
      title: activeVowText,
      status: vow.vowId ? 'sealed' : 'local',
      stake: vow.stake.amount || 50,
      witness: vow.witnessName || 'Your witness',
      witnessAcceptedAt: null,
      destination: vow.stake.destination || 'ALS Association',
      startsAt: null,
      endsAt: vow.deadlineIso,
      sealedAt: null,
      token: vow.witnessInviteToken,
      local: true,
    };
  }, [activeVowText, vow]);

  const visibleVows = useMemo(() => {
    if (vows.length > 0) return vows;
    return draftVow ? [draftVow] : [];
  }, [draftVow, vows]);

  const name = displayName?.split(' ')[0] || 'there';
  const focus = visibleVows[0];

  const openVow = (item: DashboardVow) => {
    hapticSelection();
    router.push({
      pathname: '/native-vow-detail',
      params: {
        id: item.id,
        local: item.local ? '1' : undefined,
        title: item.local ? item.title : undefined,
        stake: item.local ? String(item.stake) : undefined,
        witness: item.local ? item.witness : undefined,
        destination: item.local ? item.destination : undefined,
        endsAt: item.local && item.endsAt ? item.endsAt : undefined,
      },
    } as never);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#17130e', '#0f0d0a', '#090806']} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.haloTop} />
      <View pointerEvents="none" style={styles.haloSide} />

      <SafeAreaView style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={uvColors.goldBright} onRefresh={() => load(true)} />}
        >
          <View style={styles.topbar}>
            <View style={styles.brand}>
              <View style={styles.logoMark}>
                <Diamond color={uvColors.textOnGold} fill={uvColors.textOnGold} size={11} />
              </View>
              <Text style={styles.wordmark}>Unbreakable <Text style={styles.wordmarkEm}>Vow</Text></Text>
            </View>
            <AppMenuButton style={styles.menuButton} />
          </View>

          <View style={styles.headingRow}>
            <Text style={styles.title}>{name === 'there' ? 'Your vows.' : `Hey, ${authLoading ? 'there' : name}.`}</Text>
            <Pressable
              onPress={() => {
                hapticPrimary();
                router.push('/native-quick-vow');
              }}
              style={styles.newVowButton}
            >
              <Text style={styles.newVowText}>New vow</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={uvColors.goldBright} />
              <Text style={styles.loadingText}>Loading your vows</Text>
            </View>
          ) : null}

          {!loading && !focus ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No vows on the line.</Text>
              <Text style={styles.emptySub}>Sealed commitments will show up here.</Text>
            </View>
          ) : null}

          {!loading && focus ? (
            <View style={styles.vowsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Your vows</Text>
                <Text style={styles.sectionHeaderCount}>· {visibleVows.length}</Text>
              </View>
              <Pressable style={({ pressed }) => [styles.focusCard, pressed && styles.cardPressed]} onPress={() => openVow(focus)}>
                <View style={styles.statusRow}>
                  <View style={styles.statusPill}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor(focus) }]} />
                    <Text style={styles.statusText}>{statusLabel(focus)}</Text>
                  </View>
                  <Text style={styles.daysLeft}>{timeDisplay(focus)}</Text>
                </View>
                <Text style={styles.focusTitle}>{focus.title}</Text>
                <View style={styles.focusRule} />
                <View style={styles.focusGrid}>
                  <View>
                    <Text style={styles.gridLabel}>On hold</Text>
                    <Text style={[styles.gridValue, styles.goldValue]}>${focus.stake}</Text>
                  </View>
                  <View>
                    <Text style={styles.gridLabel}>{secondMetaLabel(focus)}</Text>
                    <Text style={styles.gridValue}>{secondMetaValue(focus)}</Text>
                  </View>
                  <View style={styles.chevronBox}>
                    <ChevronRight color={uvColors.textDim} size={22} />
                  </View>
                </View>
              </Pressable>
            </View>
          ) : null}

          {!loading && visibleVows.length > 1 ? (
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>All vows</Text>
              {visibleVows.slice(1).map((item) => (
                <Pressable key={item.id} style={({ pressed }) => [styles.listCard, pressed && styles.cardPressed]} onPress={() => openVow(item)}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listStatus}>{statusLabel(item)}</Text>
                    <Text style={styles.listTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.listMeta}>${item.stake} · {item.witness}</Text>
                  </View>
                  <ChevronRight color={uvColors.textDim} size={20} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={() => {
              hapticPrimary();
              router.push('/native-quick-vow');
            }}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <LinearGradient colors={[uvColors.goldBright, uvColors.gold, uvColors.goldDeep]} style={styles.ctaGradient}>
              <Plus color={uvColors.textOnGold} size={19} strokeWidth={3} />
              <Text style={styles.ctaText}>New vow</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function toDashboardVow(row: VowRow): DashboardVow {
  return {
    id: row.id,
    title: row.refined_text || row.raw_input || 'Untitled vow',
    status: row.status,
    stake: Math.round((row.stake_amount || 0) / 100),
    witness: row.witness_name || 'Your witness',
    witnessAcceptedAt: row.witness_accepted_at,
    destination: row.destination || 'ALS Association',
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sealedAt: row.sealed_at,
    token: row.witness_invite_token,
  };
}

function statusLabel(item: DashboardVow) {
  if (item.status === 'local') return 'Draft';
  if (item.status === 'sealed' && !item.witnessAcceptedAt) return `Awaiting ${firstName(item.witness)}`;
  if (item.status === 'awaiting_verdict') return 'Awaiting verdict';
  if (item.status === 'active') {
    const totalDays = totalDayCount(item);
    const daysLeft = dayCountLeft(item.endsAt);
    if (totalDays !== null && daysLeft !== null) {
      return `Active · Day ${Math.max(1, totalDays - daysLeft + 1)} of ${totalDays}`;
    }
    return 'Active';
  }
  if (item.status === 'kept') return 'Kept';
  if (item.status === 'broken') return 'Broken';
  return 'Draft';
}

function statusColor(item: DashboardVow) {
  if (item.status === 'active' || item.status === 'kept') return uvColors.success;
  if (item.status === 'broken') return uvColors.danger;
  if (item.status === 'sealed' || item.status === 'awaiting_verdict') return uvColors.warn;
  return uvColors.textDim;
}

function timeDisplay(item: DashboardVow) {
  if (item.status === 'sealed' && !item.witnessAcceptedAt) {
    const hours = item.sealedAt ? Math.max(1, Math.round((Date.now() - new Date(item.sealedAt).getTime()) / 3600000)) : 1;
    return `Sealed ${hours} hrs ago`;
  }
  if (item.status === 'awaiting_verdict') {
    const hours = item.endsAt ? Math.max(0, Math.round((new Date(item.endsAt).getTime() - Date.now()) / 3600000)) : null;
    return `${firstName(item.witness)} replies in ${hours ?? '?'} hrs`;
  }
  return timeLeftLabel(item.endsAt);
}

function timeLeftLabel(iso: string | null) {
  if (!iso) return 'No deadline';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Time's up";
  const days = Math.ceil(diff / 86400000);
  if (days <= 1) return '1 day left';
  return `${days} days left`;
}

function secondMetaLabel(item: DashboardVow) {
  if (item.status === 'sealed' && !item.witnessAcceptedAt) return 'Starts when';
  if (item.status === 'awaiting_verdict') return 'If broken';
  return 'Until';
}

function secondMetaValue(item: DashboardVow) {
  if (item.status === 'sealed' && !item.witnessAcceptedAt) return `${firstName(item.witness)} accepts`;
  if (item.status === 'awaiting_verdict') return `> ${item.destination}`;
  if (!item.endsAt) return '-';
  return `${new Date(item.endsAt).toLocaleDateString('en-US', { weekday: 'short' })} · 9pm`;
}

function firstName(value: string) {
  if (!value || value === 'Your witness' || value === 'your witness') return 'Witness';
  return value?.split(' ')[0] || 'Witness';
}

function dayCountLeft(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function totalDayCount(item: DashboardVow) {
  if (!item.startsAt || !item.endsAt) return null;
  return Math.ceil((new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 86400000);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: uvColors.bg },
  haloTop: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    right: -185,
    top: -135,
    backgroundColor: 'rgba(200,155,60,0.13)',
  },
  haloSide: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    left: -170,
    top: 245,
    backgroundColor: 'rgba(35,65,95,0.18)',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 132,
    gap: 14,
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: uvColors.goldBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { color: uvColors.text, fontFamily: uvFonts.serifMedium, fontSize: 16 },
  wordmarkEm: { color: uvColors.goldBright, fontStyle: 'italic' },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,233,219,0.04)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
  },
  kicker: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 34,
    lineHeight: 37,
  },
  newVowButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200,155,60,0.10)',
    borderWidth: 1,
    borderColor: uvColors.goldLine,
  },
  newVowText: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
  },
  subtitle: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sans,
    fontSize: 17,
    lineHeight: 24,
    maxWidth: 330,
  },
  loadingCard: {
    minHeight: 210,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(24,21,18,0.82)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
  },
  loadingText: { color: uvColors.textMuted, fontFamily: uvFonts.sansMedium, fontSize: 14 },
  emptyCard: {
    borderRadius: 24,
    padding: 20,
    minHeight: 250,
    justifyContent: 'center',
    gap: 9,
    backgroundColor: 'rgba(24,21,18,0.82)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
  },
  emptyLabel: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  emptyTitle: { color: uvColors.text, fontFamily: uvFonts.serifMedium, fontSize: 35, lineHeight: 39 },
  emptySub: { color: uvColors.textMuted, fontFamily: uvFonts.sans, fontSize: 16, lineHeight: 23 },
  vowsSection: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: uvColors.goldLine,
  },
  sectionHeaderText: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12.5,
    letterSpacing: 3.4,
    textTransform: 'uppercase',
  },
  sectionHeaderCount: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sansMedium,
    fontSize: 12.5,
  },
  focusCard: {
    borderRadius: 24,
    padding: 18,
    gap: 14,
    backgroundColor: 'rgba(24,21,18,0.88)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
  },
  cardPressed: { transform: [{ scale: 0.99 }] },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  statusPill: {
    height: 31,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(200,155,60,0.11)',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  daysLeft: { color: uvColors.textMuted, fontFamily: uvFonts.sansSemibold, fontSize: 13 },
  focusTitle: { color: uvColors.text, fontFamily: uvFonts.sansSemibold, fontSize: 28, lineHeight: 33 },
  focusRule: { height: 1, backgroundColor: uvColors.borderSoft },
  focusGrid: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 },
  gridLabel: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  gridValue: { color: uvColors.text, fontFamily: uvFonts.sansSemibold, fontSize: 18 },
  goldValue: { color: uvColors.goldBright },
  chevronBox: { marginLeft: 'auto', paddingBottom: 2 },
  listSection: { gap: 10 },
  sectionTitle: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },
  listCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(24,21,18,0.78)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
  },
  listCopy: { flex: 1, gap: 5 },
  listStatus: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  listTitle: { color: uvColors.text, fontFamily: uvFonts.sansSemibold, fontSize: 20, lineHeight: 24 },
  listMeta: { color: uvColors.textMuted, fontFamily: uvFonts.sans, fontSize: 13 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: 'rgba(15,13,10,0.94)',
    borderTopWidth: 1,
    borderTopColor: uvColors.borderSoft,
  },
  cta: {
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    shadowColor: uvColors.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
  },
  ctaPressed: { transform: [{ scale: 0.985 }] },
  ctaGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  ctaText: { color: uvColors.textOnGold, fontFamily: uvFonts.sansSemibold, fontSize: 18 },
});

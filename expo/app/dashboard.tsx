import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useFocusEffect } from 'expo-router';
import { History, Settings } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { palette, serifFont } from '@/constants/unbreakable';
import { acceptChallenge, declineChallenge, getIncomingChallenges, getMyVows, getRecentVows, getWitnessingVows } from '@/lib/vow-api';
import { useAuth } from '@/providers/auth-provider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Vow {
  id: string;
  refined_text: string;
  raw_input: string;
  status: string;
  vow_type: string;
  witness_name: string;
  witness_user_id: string | null;
  stake_amount: number;
  starts_at: string | null;
  ends_at: string | null;
  challenge_status: string | null;
  challenge_invite_token: string | null;
  created_at: string;
  verdict: string | null;
  verdict_at: string | null;
}

type SectionId = 'attention' | 'yours' | 'witnessing' | 'recent';

interface SectionHeader {
  type: 'header';
  sectionId: SectionId;
  title: string;
}

interface SectionItem {
  type: 'item';
  sectionId: SectionId;
  vow: Vow;
}

type ListItem = SectionHeader | SectionItem;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function getProgress(startsAt: string | null, endsAt: string | null): number | null {
  if (!startsAt || !endsAt) return null;
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  const now = Date.now();
  return clamp((now - start) / (end - start), 0, 1);
}

function getProgressColor(progress: number): string {
  if (progress < 0.5) return palette.gold;
  if (progress < 0.8) return palette.warmAmber;
  return palette.danger;
}

function getCountdownText(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) {
    const hoursAgo = Math.abs(Math.floor(diff / 3600000));
    if (hoursAgo < 1) return "Time's up";
    return `Ended ${hoursAgo}h ago`;
  }
  const days = Math.ceil(diff / 86400000);
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

function getStatusConfig(vow: Vow, sectionId: SectionId): { color: string; label: string } {
  if (sectionId === 'attention' && vow.challenge_status === 'pending') {
    return { color: '#FF8C00', label: 'Challenge received' };
  }
  switch (vow.status) {
    case 'active': return { color: palette.success, label: 'Active' };
    case 'sealed': return { color: palette.gold, label: 'Sealed' };
    case 'awaiting_verdict': return { color: palette.warmAmber, label: 'Verdict due' };
    case 'kept': return { color: palette.success, label: 'Kept \u2713' };
    case 'broken': return { color: palette.danger, label: 'Broken \u2717' };
    case 'voided': return { color: palette.textMuted, label: 'Withdrawn' };
    default: return { color: palette.textMuted, label: vow.status };
  }
}

// ---------------------------------------------------------------------------
// VowCard
// ---------------------------------------------------------------------------

function VowCard({
  vow,
  sectionId,
  onAcceptChallenge,
  onDeclineChallenge,
}: {
  vow: Vow;
  sectionId: SectionId;
  onAcceptChallenge: (token: string) => void;
  onDeclineChallenge: (token: string) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const statusConfig = getStatusConfig(vow, sectionId);
  const progress = getProgress(vow.starts_at, vow.ends_at);
  const countdown = getCountdownText(vow.ends_at);
  const stakeLabel = vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)} stake` : 'no stake';
  const isChallenge = sectionId === 'attention' && vow.challenge_status === 'pending';
  const personLabel = sectionId === 'witnessing' ? "You're witnessing" : vow.witness_name;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  };
  const handlePress = () => {
    router.push({ pathname: '/vow-detail', params: { vowId: vow.id } });
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        {/* Vow text */}
        <Text style={styles.cardText} numberOfLines={2}>
          {vow.refined_text || vow.raw_input}
        </Text>

        {/* Status row */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.statusLabel, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          {countdown ? (
            <Text style={styles.countdown}>{countdown}</Text>
          ) : null}
        </View>

        {/* Progress bar */}
        {progress !== null ? (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: getProgressColor(progress),
                },
              ]}
            />
          </View>
        ) : null}

        {/* Meta row */}
        <View style={styles.metaRow}>
          {personLabel ? <Text style={styles.metaText}>{personLabel}</Text> : null}
          {personLabel ? <Text style={styles.metaDot}>{'\u00B7'}</Text> : null}
          <Text style={styles.metaText}>{stakeLabel}</Text>
        </View>

        {/* Challenge accept/decline buttons */}
        {isChallenge && vow.challenge_invite_token ? (
          <View style={styles.challengeActions}>
            <Pressable
              style={styles.acceptBtn}
              onPress={() => onAcceptChallenge(vow.challenge_invite_token!)}
              accessibilityLabel="Accept challenge"
            >
              <Text style={styles.acceptBtnText}>Accept</Text>
            </Pressable>
            <Pressable
              style={styles.declineBtn}
              onPress={() => onDeclineChallenge(vow.challenge_invite_token!)}
              accessibilityLabel="Decline challenge"
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Screen
// ---------------------------------------------------------------------------

export default function VowDashboard() {
  const { displayName } = useAuth();

  const [myVows, setMyVows] = useState<Vow[]>([]);
  const [witnessingVows, setWitnessingVows] = useState<Vow[]>([]);
  const [challenges, setChallenges] = useState<Vow[]>([]);
  const [recentVows, setRecentVows] = useState<Vow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [my, witnessing, incoming, recent] = await Promise.all([
        getMyVows(),
        getWitnessingVows(),
        getIncomingChallenges(),
        getRecentVows(5),
      ]);
      setMyVows(my as Vow[]);
      setWitnessingVows(witnessing as Vow[]);
      setChallenges(incoming as Vow[]);
      setRecentVows(recent as Vow[]);
      setFetchError(false);
    } catch (e) {
      console.log('[Dashboard] fetch error:', e);
      setFetchError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAll().finally(() => setLoading(false));
    }, [fetchAll])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const handleAcceptChallenge = useCallback(async (token: string) => {
    try {
      const result = await acceptChallenge(token);
      if (result.success) {
        await fetchAll();
      } else {
        Alert.alert('Error', result.error || 'Could not accept challenge.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong.');
    }
  }, [fetchAll]);

  const handleDeclineChallenge = useCallback(async (token: string) => {
    Alert.alert('Decline challenge?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await declineChallenge(token);
            if (result.success) {
              await fetchAll();
            } else {
              Alert.alert('Error', result.error || 'Could not decline challenge.');
            }
          } catch {
            Alert.alert('Error', 'Something went wrong.');
          }
        },
      },
    ]);
  }, [fetchAll]);

  // ---------------------------------------------------------------------------
  // Build sections
  // ---------------------------------------------------------------------------

  const listData: ListItem[] = useMemo(() => {
    const attentionItems: Vow[] = [
      ...myVows.filter((v) => v.status === 'awaiting_verdict'),
      ...witnessingVows.filter((v) => v.status === 'awaiting_verdict'),
      ...challenges,
    ];

    const yourVowItems = myVows
      .filter((v) => v.status === 'sealed' || v.status === 'active')
      .sort((a, b) => {
        if (!a.ends_at) return 1;
        if (!b.ends_at) return -1;
        return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
      });

    const witnessItems = witnessingVows.filter((v) => v.status === 'active');

    const recentItems = recentVows.slice(0, 5);

    const data: ListItem[] = [];

    if (attentionItems.length > 0) {
      data.push({ type: 'header', sectionId: 'attention', title: 'NEEDS ATTENTION' });
      attentionItems.forEach((vow) => data.push({ type: 'item', sectionId: 'attention', vow }));
    }
    if (yourVowItems.length > 0) {
      data.push({ type: 'header', sectionId: 'yours', title: 'YOUR VOWS' });
      yourVowItems.forEach((vow) => data.push({ type: 'item', sectionId: 'yours', vow }));
    }
    if (witnessItems.length > 0) {
      data.push({ type: 'header', sectionId: 'witnessing', title: 'WITNESSING' });
      witnessItems.forEach((vow) => data.push({ type: 'item', sectionId: 'witnessing', vow }));
    }
    if (recentItems.length > 0) {
      data.push({ type: 'header', sectionId: 'recent', title: 'RECENT' });
      recentItems.forEach((vow) => data.push({ type: 'item', sectionId: 'recent', vow }));
    }

    return data;
  }, [myVows, witnessingVows, challenges, recentVows]);

  const isEmpty = listData.length === 0;

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const activeCount = myVows.filter((v) => v.status === 'active' || v.status === 'sealed' || v.status === 'awaiting_verdict').length;
  const keptCount = myVows.filter((v) => v.status === 'kept').length;
  // Streak: consecutive kept vows from most recent
  let streakCount = 0;
  const sorted = [...myVows]
    .filter((v) => v.status === 'kept' || v.status === 'broken')
    .sort((a, b) => {
      const aDate = a.verdict_at || a.created_at;
      const bDate = b.verdict_at || b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  for (const v of sorted) {
    if (v.status === 'kept') streakCount++;
    else break;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionHeader}>{item.title}</Text>
        </View>
      );
    }
    return (
      <View style={styles.cardWrap}>
        <VowCard
          vow={item.vow}
          sectionId={item.sectionId}
          onAcceptChallenge={handleAcceptChallenge}
          onDeclineChallenge={handleDeclineChallenge}
        />
      </View>
    );
  };

  const keyExtractor = (item: ListItem) =>
    item.type === 'header' ? `header-${item.sectionId}` : `item-${item.sectionId}-${item.vow.id}`;

  const ListHeader = () => (
    <View style={styles.headerArea}>
      {/* Nav row */}
      <View style={styles.navRow}>
        <View style={{ flex: 1 }} />
        <Pressable
          style={styles.navBtn}
          onPress={() => router.push('/history')}
          hitSlop={8}
          accessibilityLabel="History"
        >
          <History color={palette.textSecondary} size={20} />
        </Pressable>
        <Pressable
          style={styles.navBtn}
          onPress={() => router.push('/settings')}
          hitSlop={8}
          accessibilityLabel="Settings"
        >
          <Settings color={palette.textSecondary} size={20} />
        </Pressable>
      </View>

      {/* Greeting */}
      <Text style={styles.greeting}>
        {displayName ? `Hey ${displayName}` : 'Your Vows'}
      </Text>

      {/* Stats */}
      {!isEmpty ? (
        <Text style={styles.statsText}>
          {activeCount} active{' \u00B7 '}{keptCount} kept{' \u00B7 '}{streakCount} streak
        </Text>
      ) : null}
    </View>
  );

  const ListFooter = () => {
    if (isEmpty) return null;
    return (
      <View style={styles.footerWrap}>
        <Pressable
          style={({ pressed }) => [styles.makeVowBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={() => router.push('/')}
        >
          <LinearGradient
            colors={[palette.goldBright, palette.gold, palette.goldDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.makeVowBtnGradient}
          >
            <Text style={styles.makeVowBtnText}>+ Make a Vow</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>No vows yet</Text>
      <Text style={styles.emptySubtitle}>
        Make your first vow and put something on the line.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.makeVowBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={() => router.push('/')}
      >
        <LinearGradient
          colors={[palette.goldBright, palette.gold, palette.goldDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.makeVowBtnGradient}
        >
          <Text style={styles.makeVowBtnText}>Make a Vow</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  if (loading && listData.length === 0) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient
          colors={[palette.bg, '#08101A', palette.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.loadingWrap}>
          <ActivityIndicator color={palette.gold} size="large" />
        </SafeAreaView>
      </View>
    );
  }

  if (fetchError && listData.length === 0) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient
          colors={[palette.bg, '#08101A', palette.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.loadingWrap}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>Could not load your vows. Please try again.</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              setFetchError(false);
              fetchAll().finally(() => setLoading(false));
            }}
            accessibilityLabel="Retry loading vows"
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[palette.bg, '#08101A', palette.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.orbLarge} />
      <View pointerEvents="none" style={styles.orbSmall} />
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={isEmpty ? EmptyState : ListFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.gold}
            />
          }
        />
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  orbLarge: {
    position: 'absolute',
    top: -90,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: palette.goldGlow,
    opacity: 0.7,
  },
  orbSmall: {
    position: 'absolute',
    top: 180,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 160,
    backgroundColor: 'rgba(94,124,250,0.12)',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: serifFont,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: palette.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 8,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  retryBtnText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 40,
  },

  // Header
  headerArea: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 16,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: serifFont,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statsText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },

  // Sections
  sectionHeaderWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionHeader: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Cards
  cardWrap: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  card: {
    backgroundColor: palette.whiteOverlay,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: serifFont,
    lineHeight: 22,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  countdown: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 'auto',
  },

  // Progress bar
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  metaDot: {
    color: palette.textMuted,
    fontSize: 13,
  },

  // Challenge actions
  challengeActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  acceptBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(82,214,154,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.25)',
  },
  acceptBtnText: {
    color: palette.success,
    fontSize: 14,
    fontWeight: '700',
  },
  declineBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  declineBtnText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty state
  emptyWrap: {
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: serifFont,
  },
  emptySubtitle: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },

  // Make a vow button
  footerWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  makeVowBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
  makeVowBtnGradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  makeVowBtnText: {
    color: '#0B0D11',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

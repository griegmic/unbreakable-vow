import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { Plus, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import VowCard from '@/components/vow-card';
import { palette, serifFont } from '@/constants/unbreakable';
import { getIncomingChallenges, getMyVows, getRecentVows, getWitnessingVows } from '@/lib/vow-api';
import type { VowRow } from '@/lib/vow-api';
import { useAuth } from '@/providers/auth-provider';

interface Section {
  key: string;
  title: string;
  data: { vow: VowRow; role: 'maker' | 'witness' | 'challenge' }[];
}

export default function DashboardScreen() {
  const { displayName, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const myVowsQuery = useQuery({ queryKey: ['myVows'], queryFn: getMyVows, enabled: isAuthenticated });
  const witnessingQuery = useQuery({ queryKey: ['witnessingVows'], queryFn: getWitnessingVows, enabled: isAuthenticated });
  const challengesQuery = useQuery({ queryKey: ['challenges'], queryFn: getIncomingChallenges, enabled: isAuthenticated });
  const recentQuery = useQuery({ queryKey: ['recentVows'], queryFn: () => getRecentVows(5), enabled: isAuthenticated });

  const isLoading = myVowsQuery.isLoading || witnessingQuery.isLoading;
  const isRefreshing = myVowsQuery.isRefetching || witnessingQuery.isRefetching || challengesQuery.isRefetching || recentQuery.isRefetching;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const myVows = myVowsQuery.data ?? [];
  const witnessingVows = witnessingQuery.data ?? [];
  const challenges = challengesQuery.data ?? [];
  const recentVows = recentQuery.data ?? [];

  const activeCount = myVows.filter(v => v.status === 'active').length;
  const keptCount = recentVows.filter(v => v.verdict === 'kept').length;

  const needsAttention = useMemo(() => {
    const items: { vow: VowRow; role: 'maker' | 'witness' | 'challenge' }[] = [];
    myVows.filter(v => v.status === 'awaiting_verdict').forEach(v => items.push({ vow: v, role: 'maker' }));
    witnessingVows.filter(v => v.status === 'awaiting_verdict').forEach(v => items.push({ vow: v, role: 'witness' }));
    challenges.forEach(v => items.push({ vow: v, role: 'challenge' }));
    return items;
  }, [myVows, witnessingVows, challenges]);

  const activeVows = useMemo(() => {
    return myVows
      .filter(v => v.status === 'active' || v.status === 'sealed')
      .sort((a, b) => {
        if (!a.ends_at) return 1;
        if (!b.ends_at) return -1;
        return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
      })
      .map(v => ({ vow: v, role: 'maker' as const }));
  }, [myVows]);

  const witnessItems = useMemo(() => {
    return witnessingVows
      .filter(v => v.status === 'active')
      .sort((a, b) => {
        if (!a.ends_at) return 1;
        if (!b.ends_at) return -1;
        return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
      })
      .map(v => ({ vow: v, role: 'witness' as const }));
  }, [witnessingVows]);

  const recentItems = useMemo(() => {
    return recentVows.map(v => ({ vow: v, role: 'maker' as const }));
  }, [recentVows]);

  const sections = useMemo(() => {
    const s: Section[] = [];
    if (needsAttention.length > 0) s.push({ key: 'attention', title: 'NEEDS ATTENTION', data: needsAttention });
    if (activeVows.length > 0) s.push({ key: 'active', title: 'YOUR VOWS', data: activeVows });
    if (witnessItems.length > 0) s.push({ key: 'witnessing', title: 'WITNESSING', data: witnessItems });
    if (recentItems.length > 0) s.push({ key: 'recent', title: 'RECENT', data: recentItems });
    return s;
  }, [needsAttention, activeVows, witnessItems, recentItems]);

  const flatData = useMemo(() => {
    const items: ({ type: 'header'; title: string; key: string } | { type: 'card'; vow: VowRow; role: 'maker' | 'witness' | 'challenge'; key: string })[] = [];
    for (const section of sections) {
      items.push({ type: 'header', title: section.title, key: `header-${section.key}` });
      for (const item of section.data) {
        items.push({ type: 'card', vow: item.vow, role: item.role, key: `card-${item.vow.id}-${item.role}` });
      }
    }
    return items;
  }, [sections]);

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['myVows'] });
    void queryClient.invalidateQueries({ queryKey: ['witnessingVows'] });
    void queryClient.invalidateQueries({ queryKey: ['challenges'] });
    void queryClient.invalidateQueries({ queryKey: ['recentVows'] });
  }, [queryClient]);

  const handleNewVow = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/');
  }, []);

  const firstName = displayName?.split(' ')[0] ?? 'there';
  const isEmpty = sections.length === 0 && !isLoading;

  const renderItem = useCallback(({ item }: { item: typeof flatData[number] }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={[
            styles.sectionTitle,
            item.title === 'NEEDS ATTENTION' && styles.sectionTitleAttention,
          ]}>{item.title}</Text>
        </View>
      );
    }
    return (
      <View style={styles.cardWrapper}>
        <VowCard vow={item.vow} role={item.role} />
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: typeof flatData[number]) => item.key, []);

  const btnScale = useRef(new Animated.Value(1)).current;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#05070B', '#080E18', '#0A0D12']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.ambientOrb} />

      <SafeAreaView style={styles.safe}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.headerSection}>
            <Text style={styles.greeting}>Hey {firstName}</Text>
            <View style={styles.statsRow}>
              {activeCount > 0 && (
                <View style={styles.statChip}>
                  <View style={[styles.statDot, { backgroundColor: '#52D69A' }]} />
                  <Text style={styles.statText}>{activeCount} active</Text>
                </View>
              )}
              {keptCount > 0 && (
                <View style={styles.statChip}>
                  <View style={[styles.statDot, { backgroundColor: palette.gold }]} />
                  <Text style={styles.statText}>{keptCount} kept</Text>
                </View>
              )}
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={palette.goldBright} size="large" />
            </View>
          ) : isEmpty ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Sparkles color={palette.goldBright} size={32} />
              </View>
              <Text style={styles.emptyTitle}>No vows yet</Text>
              <Text style={styles.emptyDesc}>Make your first vow and put something on the line.</Text>
            </View>
          ) : (
            <FlatList
              data={flatData}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={palette.goldBright}
                  colors={[palette.goldBright]}
                />
              }
            />
          )}
        </Animated.View>

        <View style={styles.fabWrap}>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              onPress={handleNewVow}
              onPressIn={() => {
                Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
              }}
              onPressOut={() => {
                Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
              }}
              testID="dashboard-new-vow"
            >
              <LinearGradient
                colors={[palette.goldBright, palette.gold, palette.goldDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fabGradient}
              >
                <Plus color="#0B0D11" size={18} strokeWidth={3} />
                <Text style={styles.fabText}>Make a Vow</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030508',
  },
  safe: {
    flex: 1,
  },
  ambientOrb: {
    position: 'absolute',
    top: -60,
    right: -30,
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: 'rgba(212,162,79,0.12)',
    opacity: 0.6,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  greeting: {
    color: '#F5F5F7',
    fontSize: 28,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    letterSpacing: -0.8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    color: '#8A8A8E',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(212,162,79,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    color: '#F5F5F7',
    fontSize: 20,
    fontWeight: '700' as const,
  },
  emptyDesc: {
    color: '#8A8A8E',
    fontSize: 15,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: '#8A8A8E',
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
  },
  sectionTitleAttention: {
    color: '#F0C86E',
  },
  cardWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  fabWrap: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
    borderRadius: 18,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  fabText: {
    color: '#0B0D11',
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
});

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  MessageCircle,
  Share2,
  ShieldOff,
  XCircle,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { palette, serifFont } from '@/constants/unbreakable';
import {
  getVowDetail,
  getVowTimeline,
  submitCheckIn,
  voidVowV2,
} from '@/lib/vow-api';
import type { AuditEvent, VowRow } from '@/lib/vow-api';
import { useAuth } from '@/providers/auth-provider';

const EVENT_ICONS: Record<string, string> = {
  vow_sealed: '🔒',
  witness_invited: '📩',
  witness_accepted: '✅',
  challenge_sent: '⚔️',
  challenge_accepted: '✅',
  check_in: '📋',
  verdict_submitted: '⚖️',
  vow_voided: '🚫',
  refund_issued: '💰',
};

function eventDescription(event: AuditEvent): string {
  const meta = event.metadata ?? {};
  switch (event.event_type) {
    case 'vow_sealed': return 'Vow sealed';
    case 'witness_invited': return 'Witness invited';
    case 'witness_accepted': return `${meta.name ?? 'Witness'} accepted`;
    case 'challenge_sent': return 'Challenge sent';
    case 'challenge_accepted': return 'Challenge accepted';
    case 'check_in': return `Checked in: ${meta.type ?? 'update'}`;
    case 'verdict_submitted': return `Verdict: ${meta.verdict ?? 'unknown'}`;
    case 'vow_voided': return 'Vow withdrawn';
    case 'refund_issued': return 'Refund issued';
    default: return event.event_type.replace(/_/g, ' ');
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusInfo(vow: VowRow) {
  switch (vow.status) {
    case 'active': return { color: '#52D69A', label: 'Active', bg: 'rgba(82,214,154,0.08)' };
    case 'awaiting_verdict': return { color: '#F0C86E', label: 'Verdict due', bg: 'rgba(240,200,110,0.08)' };
    case 'kept': return { color: '#52D69A', label: 'Kept', bg: 'rgba(82,214,154,0.08)' };
    case 'broken': return { color: '#FF7B7B', label: 'Broken', bg: 'rgba(255,123,123,0.08)' };
    case 'voided': return { color: '#667085', label: 'Withdrawn', bg: 'rgba(102,112,133,0.08)' };
    default: return { color: '#667085', label: vow.status, bg: 'rgba(102,112,133,0.08)' };
  }
}

function getProgress(vow: VowRow): number {
  if (!vow.starts_at || !vow.ends_at) return 0;
  const start = new Date(vow.starts_at).getTime();
  const end = new Date(vow.ends_at).getTime();
  if (end <= start) return 100;
  return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
}

function getProgressColor(pct: number): string {
  if (pct < 50) return palette.gold;
  if (pct < 80) return '#F0C86E';
  return '#FF7B7B';
}

function getCountdown(vow: VowRow): string {
  if (!vow.ends_at) return '';
  const diff = new Date(vow.ends_at).getTime() - Date.now();
  if (diff <= 0) return 'Time\'s up';
  const days = Math.ceil(diff / 86400000);
  if (days === 1) return 'Last day';
  return `${days} days left`;
}

function getWitnessBadge(vow: VowRow): { label: string; color: string } {
  if (vow.witness_accepted_at) return { label: 'Accepted', color: '#52D69A' };
  if (vow.witness_declined) return { label: 'Declined', color: '#FF7B7B' };
  return { label: 'Pending', color: '#F0C86E' };
}

export default function VowDetailScreen() {
  const { vowId } = useLocalSearchParams<{ vowId: string }>();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [lastCheckIn, setLastCheckIn] = useState<number>(0);

  const vowQuery = useQuery({
    queryKey: ['vowDetail', vowId],
    queryFn: () => getVowDetail(vowId!),
    enabled: !!vowId,
  });

  const timelineQuery = useQuery({
    queryKey: ['vowTimeline', vowId],
    queryFn: () => getVowTimeline(vowId!),
    enabled: !!vowId,
  });

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const vow = vowQuery.data;
  const timeline = timelineQuery.data ?? [];
  const isMaker = vow?.user_id === session?.user?.id;
  const isActive = vow?.status === 'active';
  const canCheckIn = isMaker && isActive && (Date.now() - lastCheckIn > 4 * 3600000);

  const checkInMutation = useMutation({
    mutationFn: (type: string) => submitCheckIn(vowId!, type),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastCheckIn(Date.now());
      void queryClient.invalidateQueries({ queryKey: ['vowTimeline', vowId] });
    },
  });

  const voidMutation = useMutation({
    mutationFn: () => voidVowV2(vowId!),
    onSuccess: (result) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      void queryClient.invalidateQueries({ queryKey: ['vowDetail', vowId] });
      void queryClient.invalidateQueries({ queryKey: ['myVows'] });
      Alert.alert('Vow withdrawn', result.refunded ? 'Your stake will be refunded.' : 'This vow has been voided.');
    },
  });

  const handleWithdraw = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Withdraw this vow?',
      'This action cannot be undone. Any stake may be refunded.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Withdraw', style: 'destructive', onPress: () => voidMutation.mutate() },
      ],
    );
  }, [voidMutation]);

  const handleShare = useCallback(async () => {
    if (!vow) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `I made an Unbreakable Vow: "${vow.refined_text}" — $${Math.round(vow.stake_amount / 100)} on the line.`,
      });
    } catch {
      console.log('[VowDetail] share failed');
    }
  }, [vow]);

  const handleTextPerson = useCallback(() => {
    if (!vow) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const phone = vow.witness_phone;
    if (phone) {
      const smsUrl = Platform.OS === 'ios' ? `sms:${phone}` : `sms:${phone}`;
      Linking.openURL(smsUrl).catch(() => console.log('[VowDetail] SMS failed'));
    }
  }, [vow]);

  const handleCheckIn = useCallback((type: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkInMutation.mutate(type);
  }, [checkInMutation]);

  if (vowQuery.isLoading || !vow) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={palette.goldBright} size="large" />
        </View>
      </View>
    );
  }

  const statusInfo = getStatusInfo(vow);
  const progress = getProgress(vow);
  const progressColor = getProgressColor(progress);
  const countdown = getCountdown(vow);
  const witnessBadge = getWitnessBadge(vow);
  const stakeAmount = Math.round(vow.stake_amount / 100);
  const canWithdraw = isMaker && (vow.status === 'active' || vow.status === 'awaiting_verdict');

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#05070B', '#080E18', '#0A0D12']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.container, { opacity: fadeAnim, paddingTop: insets.top }]}>
        <Pressable
          onPress={() => { void Haptics.selectionAsync(); router.back(); }}
          style={styles.backBtn}
          testID="detail-back"
        >
          <ArrowLeft color="#F5F5F7" size={18} />
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.vowTitle}>{vow.refined_text || vow.raw_input}</Text>

          <View style={[styles.statusBlock, { backgroundColor: statusInfo.bg }]}>
            <View style={styles.statusTopRow}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              {countdown ? <Text style={styles.countdownText}>{countdown}</Text> : null}
            </View>
            {(vow.status === 'active' || vow.status === 'awaiting_verdict') && vow.starts_at && vow.ends_at && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progressColor }]} />
              </View>
            )}
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>Started: {formatDate(vow.starts_at)}</Text>
              <Text style={styles.dateText}>Ends: {formatDate(vow.ends_at)}</Text>
            </View>
          </View>

          <View style={styles.peopleBlock}>
            <Text style={styles.blockTitle}>PEOPLE</Text>
            <View style={styles.personRow}>
              <Text style={styles.personLabel}>Maker</Text>
              <Text style={styles.personValue}>{isMaker ? 'You' : 'Someone'}</Text>
            </View>
            <View style={styles.personRow}>
              <Text style={styles.personLabel}>Witness</Text>
              <View style={styles.witnessValueRow}>
                <Text style={styles.personValue}>{vow.witness_name || 'None'}</Text>
                <View style={[styles.witnessBadge, { borderColor: witnessBadge.color + '40' }]}>
                  <Text style={[styles.witnessBadgeText, { color: witnessBadge.color }]}>{witnessBadge.label}</Text>
                </View>
              </View>
            </View>
            {stakeAmount > 0 ? (
              <View style={styles.personRow}>
                <Text style={styles.personLabel}>Stake</Text>
                <Text style={styles.personValue}>${stakeAmount} → {vow.destination || 'charity'}</Text>
              </View>
            ) : (
              <View style={styles.personRow}>
                <Text style={styles.personLabel}>Stake</Text>
                <Text style={styles.personValueMuted}>No stake</Text>
              </View>
            )}
          </View>

          {canCheckIn && (
            <View style={styles.checkInBlock}>
              <Text style={styles.blockTitle}>HOW'S IT GOING?</Text>
              <View style={styles.checkInRow}>
                {(['On track', 'Struggling', 'Done early'] as const).map((type) => (
                  <Pressable
                    key={type}
                    style={({ pressed }) => [
                      styles.checkInBtn,
                      pressed && styles.checkInBtnPressed,
                      checkInMutation.isPending && styles.checkInBtnDisabled,
                    ]}
                    onPress={() => handleCheckIn(type.toLowerCase().replace(' ', '_'))}
                    disabled={checkInMutation.isPending}
                    testID={`checkin-${type.toLowerCase().replace(' ', '-')}`}
                  >
                    {type === 'On track' && <CheckCircle color="#52D69A" size={16} />}
                    {type === 'Struggling' && <Clock color="#F0C86E" size={16} />}
                    {type === 'Done early' && <CheckCircle color={palette.goldBright} size={16} />}
                    <Text style={styles.checkInText}>{type}</Text>
                  </Pressable>
                ))}
              </View>
              {!canCheckIn && isMaker && isActive && (
                <Text style={styles.checkInCooldown}>Check in available in a few hours</Text>
              )}
            </View>
          )}

          {timeline.length > 0 && (
            <View style={styles.timelineBlock}>
              <Text style={styles.blockTitle}>TIMELINE</Text>
              {timeline.map((event, index) => (
                <View key={event.id} style={styles.timelineItem}>
                  <View style={styles.timelineLine}>
                    <View style={styles.timelineNode} />
                    {index < timeline.length - 1 && <View style={styles.timelineConnector} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineRow}>
                      <Text style={styles.timelineIcon}>{EVENT_ICONS[event.event_type] ?? '📌'}</Text>
                      <Text style={styles.timelineDesc}>{eventDescription(event)}</Text>
                    </View>
                    <Text style={styles.timelineTime}>{relativeTime(event.created_at)}</Text>
                  </View>
                </View>
              ))}
              {isActive && vow.ends_at && (
                <View style={styles.timelineItem}>
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineNode, styles.timelineFutureNode]} />
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineRow}>
                      <Text style={styles.timelineIcon}>⏳</Text>
                      <Text style={styles.timelineDescFuture}>Verdict day — {formatDate(vow.ends_at)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={styles.actionsBlock}>
            <Text style={styles.blockTitle}>ACTIONS</Text>
            <Pressable style={styles.actionRow} onPress={() => { void handleShare(); }} testID="detail-share">
              <Share2 color={palette.goldBright} size={18} />
              <Text style={styles.actionText}>Share vow</Text>
            </Pressable>
            {vow.witness_phone && (
              <Pressable style={styles.actionRow} onPress={handleTextPerson} testID="detail-text">
                <MessageCircle color={palette.goldBright} size={18} />
                <Text style={styles.actionText}>Text {vow.witness_name || 'witness'}</Text>
              </Pressable>
            )}
            {canWithdraw && (
              <Pressable
                style={[styles.actionRow, styles.actionRowDanger]}
                onPress={handleWithdraw}
                disabled={voidMutation.isPending}
                testID="detail-withdraw"
              >
                {voidMutation.isPending ? (
                  <ActivityIndicator color="#FF7B7B" size="small" />
                ) : (
                  <ShieldOff color="#FF7B7B" size={18} />
                )}
                <Text style={styles.actionTextDanger}>Withdraw vow</Text>
              </Pressable>
            )}
          </View>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030508',
  },
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 20,
  },
  vowTitle: {
    color: '#F5F5F7',
    fontSize: 24,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  statusBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
  },
  statusTopRow: {
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
    fontSize: 14,
    fontWeight: '700' as const,
  },
  countdownText: {
    color: '#8A8A8E',
    fontSize: 13,
    marginLeft: 'auto',
    fontWeight: '500' as const,
  },
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
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    color: '#8A8A8E',
    fontSize: 13,
  },
  peopleBlock: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
  },
  blockTitle: {
    color: '#8A8A8E',
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  personRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personLabel: {
    color: '#8A8A8E',
    fontSize: 14,
  },
  personValue: {
    color: '#F5F5F7',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  personValueMuted: {
    color: '#667085',
    fontSize: 14,
  },
  witnessValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  witnessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  witnessBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  checkInBlock: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
  },
  checkInRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkInBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 44,
  },
  checkInBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  checkInBtnDisabled: {
    opacity: 0.4,
  },
  checkInText: {
    color: '#F5F5F7',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  checkInCooldown: {
    color: '#667085',
    fontSize: 12,
    textAlign: 'center' as const,
  },
  timelineBlock: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 44,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
  },
  timelineNode: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.gold,
    marginTop: 6,
  },
  timelineFutureNode: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  timelineConnector: {
    flex: 1,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 16,
    gap: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineIcon: {
    fontSize: 14,
  },
  timelineDesc: {
    color: '#F5F5F7',
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  timelineDescFuture: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '500' as const,
    fontStyle: 'italic' as const,
    flex: 1,
  },
  timelineTime: {
    color: '#667085',
    fontSize: 12,
    paddingLeft: 22,
  },
  actionsBlock: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    minHeight: 44,
  },
  actionRowDanger: {
    borderBottomWidth: 0,
  },
  actionText: {
    color: palette.goldBright,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  actionTextDanger: {
    color: '#FF7B7B',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});

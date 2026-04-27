import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppMenuButton } from '@/components/app-menu';
import { palette, serifFont } from '@/constants/unbreakable';
import { hapticSealComplete, hapticSelection } from '@/lib/haptics';
import { getVowDetail, getVowTimeline, voidVowV2 } from '@/lib/vow-api';
import { useAuth } from '@/providers/auth-provider';
import type { AuditEvent } from '@/types/database';

type VowRow = {
  id: string;
  user_id: string;
  raw_input: string;
  refined_text: string;
  status: string;
  vow_type?: string;
  witness_name: string;
  witness_phone: string | null;
  witness_invite_token: string | null;
  witness_accepted_at: string | null;
  witness_declined: boolean;
  stake_amount: number;
  consequence: string;
  destination: string;
  starts_at: string | null;
  ends_at: string | null;
  verdict: string | null;
  verdict_at: string | null;
  sealed_at: string | null;
  created_at: string;
};

const EVENT_META: Record<string, { emoji: string; label: string }> = {
  vow_sealed: { emoji: '\u{1F512}', label: 'Vow sealed' },
  witness_invited: { emoji: '\u{1F4E9}', label: 'Witness invited' },
  witness_accepted: { emoji: '\u2705', label: 'Witness accepted' },
  witness_declined: { emoji: '\u274C', label: 'Witness declined' },
  challenge_sent: { emoji: '\u2694\uFE0F', label: 'Challenge sent' },
  challenge_accepted: { emoji: '\u2705', label: 'Challenge accepted' },
  challenge_declined: { emoji: '\u274C', label: 'Challenge declined' },
  check_in: { emoji: '\u{1F4CB}', label: 'Checked in' },
  verdict_submitted: { emoji: '\u2696\uFE0F', label: 'Verdict' },
  vow_voided: { emoji: '\u{1F6AB}', label: 'Vow withdrawn' },
  refund_issued: { emoji: '\u{1F4B0}', label: 'Refund issued' },
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getEventLabel(event: AuditEvent, vow: VowRow | null): string {
  const meta = EVENT_META[event.event_type];
  if (!meta) return event.event_type;

  if (event.event_type === 'check_in' && event.metadata?.type) {
    return `Checked in: ${event.metadata.type}`;
  }
  if (event.event_type === 'verdict_submitted') {
    const v = event.metadata?.verdict || vow?.verdict || '';
    return v ? `Verdict: ${v}` : 'Verdict submitted';
  }
  return meta.label;
}

function getEventEmoji(eventType: string): string {
  return EVENT_META[eventType]?.emoji ?? '\u{1F4CC}';
}

// --- Status helpers ---

type StatusConfig = {
  color: string;
  label: string;
  pulse: boolean;
};

function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'active':
      return { color: palette.success, label: 'Active', pulse: false };
    case 'awaiting_verdict':
      return { color: palette.warmAmber, label: 'Awaiting verdict', pulse: true };
    case 'kept':
      return { color: palette.success, label: 'Kept', pulse: false };
    case 'broken':
      return { color: palette.danger, label: 'Broken', pulse: false };
    case 'voided':
      return { color: palette.textMuted, label: 'Withdrawn', pulse: false };
    default:
      return { color: palette.textSecondary, label: status, pulse: false };
  }
}

function getProgressColor(pct: number): string {
  if (pct < 50) return palette.goldBright;
  if (pct < 80) return palette.warmAmber;
  return palette.danger;
}

function getWitnessBadge(vow: VowRow): { label: string; color: string } {
  if (vow.witness_accepted_at) return { label: 'accepted', color: palette.success };
  if (vow.witness_declined) return { label: 'declined', color: palette.danger };
  return { label: 'pending', color: palette.warmAmber };
}

export default function VowDetailScreen() {
  const { vowId, justSealed } = useLocalSearchParams<{ vowId: string; justSealed?: string }>();
  const { session } = useAuth();

  const [vow, setVow] = useState<VowRow | null>(null);
  const [timeline, setTimeline] = useState<AuditEvent[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Pulse animation for awaiting_verdict
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (vowId) {
      getVowDetail(vowId)
        .then((data) => {
          if (data) setVow(data as unknown as VowRow);
          else setLoadError(true);
        })
        .catch(() => setLoadError(true));
      getVowTimeline(vowId)
        .then(setTimeline)
        .catch(console.error);
    }
  }, [vowId]);

  useEffect(() => {
    if (vow?.status === 'awaiting_verdict') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    }
  }, [vow?.status, pulseAnim]);

  const isMaker = session?.user?.id === vow?.user_id;

  // Calculate progress
  const progress = useMemo(() => {
    if (!vow?.starts_at || !vow?.ends_at) return 0;
    const start = new Date(vow.starts_at).getTime();
    const end = new Date(vow.ends_at).getTime();
    const now = Date.now();
    if (end <= start) return 100;
    const pct = ((now - start) / (end - start)) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [vow?.starts_at, vow?.ends_at]);

  // Countdown text
  const countdown = useMemo(() => {
    if (!vow?.ends_at) return 'No end date';
    const end = new Date(vow.ends_at).getTime();
    const now = Date.now();
    if (vow.status === 'kept' || vow.status === 'broken' || vow.status === 'voided') return 'Ended';
    if (now >= end) return "Time's up";
    const daysLeft = Math.ceil((end - now) / 86400000);
    return daysLeft === 1 ? '1 day left' : `${daysLeft} days left`;
  }, [vow?.ends_at, vow?.status]);

  const handleWithdraw = () => {
    if (!vowId) return;
    Alert.alert(
      'Withdraw this vow?',
      vow && vow.stake_amount > 0
        ? 'This cannot be undone. Your stake will be refunded.'
        : 'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            setWithdrawing(true);
            const result = await voidVowV2(vowId);
            setWithdrawing(false);
            if (result.success) {
              hapticSealComplete();
              router.replace('/dashboard');
            } else {
              Alert.alert('Failed', result.error || 'Could not withdraw vow.');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!vow) return;
    const witnessUrl = vow.witness_invite_token
      ? `https://unbreakablevow.app/w/${vow.witness_invite_token}`
      : '';
    const stakeText = vow.stake_amount > 0 ? ` with $${vow.stake_amount / 100} on the line` : '';
    await Share.share({
      message: witnessUrl && !vow.witness_accepted_at && vow.witness_name !== 'Just me'
        ? `I made an Unbreakable Vow: "${vow.refined_text}"${stakeText}. You are the judge: ${witnessUrl}`
        : `I made an Unbreakable Vow: "${vow.refined_text}"${stakeText}. Witness: ${vow.witness_name}.`,
    });
  };

  const handleInviteWitness = async () => {
    if (!vow?.witness_invite_token) {
      await handleShare();
      return;
    }
    const witnessUrl = `https://unbreakablevow.app/w/${vow.witness_invite_token}`;
    const amount = vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)} on the line` : 'my word on the line';
    const message = `I made a vow: "${vow.refined_text}" — ${amount}. You are the judge: ${witnessUrl}`;

    if (vow.witness_phone) {
      const sep = Platform.OS === 'android' ? '?' : '&';
      await Linking.openURL(`sms:${vow.witness_phone}${sep}body=${encodeURIComponent(message)}`).catch(() => {});
      return;
    }

    await Share.share({ message });
  };

  const handleEarlyJudgment = async () => {
    if (!vow) return;
    hapticSelection();

    if (vow.witness_name === 'Just me') {
      router.push({ pathname: '/self-resolve', params: { vowId: vow.id } });
      return;
    }

    const verdictUrl = vow.witness_invite_token
      ? `https://unbreakablevow.app/w/${vow.witness_invite_token}/verdict`
      : '';
    const message = `I kept my vow early: "${vow.refined_text}". Can you judge it now?${verdictUrl ? ` ${verdictUrl}` : ''}`;

    if (vow.witness_phone) {
      const sep = Platform.OS === 'android' ? '?' : '&';
      await Linking.openURL(`sms:${vow.witness_phone}${sep}body=${encodeURIComponent(message)}`).catch(() => {});
      return;
    }

    await Share.share({ message });
  };

  // --- Render ---

  if (!vowId) {
    return (
      <SafeAreaView style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>No vow ID provided.</Text>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Vow not found.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/dashboard')}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!vow) {
    return (
      <SafeAreaView style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={palette.goldBright} />
      </SafeAreaView>
    );
  }

  const statusCfg = getStatusConfig(vow.status);
  const witnessBadge = getWitnessBadge(vow);
  const showWithdraw = isMaker && (vow.status === 'active' || vow.status === 'awaiting_verdict');
  const canJudgeEarly = isMaker
    && vow.status === 'active'
    && !!vow.witness_invite_token
    && (vow.witness_name === 'Just me' || !!vow.witness_accepted_at);
  const needsWitnessAction = isMaker
    && vow.status === 'active'
    && vow.witness_name !== 'Just me'
    && !vow.witness_accepted_at
    && !vow.witness_declined;

  // Future verdict marker
  const showFutureVerdict =
    vow.status === 'active' && vow.ends_at && new Date(vow.ends_at).getTime() > Date.now();

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button + menu */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable
            onPress={() => {
              hapticSelection();
              router.replace('/dashboard');
            }}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
            testID="vow-detail-back"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backArrow}>{'\u2190'}</Text>
          </Pressable>
          <AppMenuButton />
        </View>

        {justSealed === '1' ? (
          <View style={styles.justSealedCard}>
            <Text style={styles.justSealedKicker}>SEALED</Text>
            <Text style={styles.justSealedTitle}>
              {needsWitnessAction ? `Now get ${vow.witness_name} in.` : 'Your vow is live.'}
            </Text>
            <Text style={styles.justSealedBody}>
              {needsWitnessAction
                ? 'Your card is saved. The vow starts clean once your witness accepts.'
                : 'Your card is saved. Nothing charges unless the vow is broken.'}
            </Text>
            {needsWitnessAction ? (
              <Pressable
                style={({ pressed }) => [styles.justSealedCta, pressed && { opacity: 0.84 }]}
                onPress={() => void handleInviteWitness()}
                testID="vow-detail-just-sealed-cta"
              >
                <Text style={styles.justSealedCtaText}>
                  {vow.witness_phone ? `Text ${vow.witness_name}` : 'Share judge link'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Vow text */}
        <View style={styles.vowTextBlock}>
          <Text style={styles.goldQuote}>{'\u201C'}</Text>
          <Text style={styles.vowText}>{vow.refined_text}</Text>
          <Text style={styles.goldQuote}>{'\u201D'}</Text>
        </View>

        {/* Status block */}
        <View style={styles.card}>
          {/* Status pill */}
          <View style={styles.statusRow}>
            {statusCfg.pulse ? (
              <Animated.View style={[styles.statusDot, { backgroundColor: statusCfg.color, opacity: pulseAnim }]} />
            ) : (
              <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
            )}
            <Text style={[styles.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progress)}%` as any,
                  backgroundColor: getProgressColor(progress),
                },
              ]}
            />
          </View>

          {/* Countdown */}
          <Text style={styles.countdownText}>{countdown}</Text>

          {/* Dates */}
          <View style={styles.datesRow}>
            <Text style={styles.dateText}>Started: {formatDate(vow.starts_at)}</Text>
            <Text style={styles.dateText}>Ends: {formatDate(vow.ends_at)}</Text>
          </View>
        </View>

        {/* People block */}
        <View style={styles.card}>
          <View style={styles.peopleRow}>
            <Text style={styles.peopleLabel}>Witness</Text>
            <View style={styles.witnessInfo}>
              <Text style={styles.witnessName}>{vow.witness_name}</Text>
              <View style={[styles.witnessBadge, { backgroundColor: `${witnessBadge.color}20` }]}>
                <Text style={[styles.witnessBadgeText, { color: witnessBadge.color }]}>
                  {witnessBadge.label}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.peopleRow}>
            <Text style={styles.peopleLabel}>Stake</Text>
            <Text style={styles.stakeText}>
              {vow.stake_amount > 0
                ? `$${vow.stake_amount / 100} \u2192 ${vow.destination}`
                : 'No stake \u2014 accountability only'}
            </Text>
          </View>

          {vow.vow_type === 'challenge' && (
            <>
              <View style={styles.divider} />
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>CHALLENGE</Text>
              </View>
            </>
          )}
        </View>

        {/* Timeline block */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionLabel}>TIMELINE</Text>
          <View style={styles.timelineList}>
            {timeline.map((event, idx) => (
              <View key={event.id} style={styles.timelineItem}>
                {/* Vertical line */}
                {idx < timeline.length - 1 && <View style={styles.timelineLine} />}
                {/* Dot */}
                <View style={styles.timelineDotWrap}>
                  <Text style={styles.timelineEmoji}>{getEventEmoji(event.event_type)}</Text>
                </View>
                {/* Content */}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDesc}>{getEventLabel(event, vow)}</Text>
                  <Text style={styles.timelineTime}>{relativeTime(event.created_at)}</Text>
                </View>
              </View>
            ))}
            {/* Future verdict marker */}
            {showFutureVerdict && (
              <View style={styles.timelineItem}>
                <View style={styles.timelineDotWrap}>
                  <Text style={styles.timelineEmoji}>{'\u23F3'}</Text>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDesc}>
                    Verdict day \u2014 {formatDate(vow.ends_at)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Actions block */}
        <View style={styles.actionsBlock}>
          {needsWitnessAction ? (
            <Pressable
              style={({ pressed }) => [styles.primaryActionBtn, pressed && { opacity: 0.82 }]}
              onPress={() => void handleInviteWitness()}
              testID="vow-detail-invite-witness"
              accessibilityLabel="Invite witness"
            >
              <Text style={styles.primaryActionText}>
                {vow.witness_phone ? `Text ${vow.witness_name}` : 'Share judge link'}
              </Text>
            </Pressable>
          ) : null}

          {canJudgeEarly ? (
            <Pressable
              style={({ pressed }) => [styles.earlyActionBtn, pressed && { opacity: 0.82 }]}
              onPress={() => void handleEarlyJudgment()}
              testID="vow-detail-early-judgment"
              accessibilityLabel="Ask for early judgment"
            >
              <Text style={styles.earlyActionText}>
                {vow.witness_name === 'Just me' ? 'Judge it now' : 'I kept it early'}
              </Text>
              <Text style={styles.earlyActionSubtext}>
                {vow.witness_name === 'Just me'
                  ? 'Close it honestly, right now.'
                  : `Ask ${vow.witness_name} to make the call.`}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
            onPress={() => void handleShare()}
            testID="vow-detail-share"
            accessibilityLabel="Share vow"
          >
            <Text style={styles.shareBtnText}>Share vow</Text>
          </Pressable>

          {showWithdraw && (
            <Pressable
              style={({ pressed }) => [styles.withdrawBtn, pressed && { opacity: 0.7 }]}
              onPress={handleWithdraw}
              disabled={withdrawing}
              testID="vow-detail-withdraw"
              accessibilityLabel="Withdraw vow"
            >
              {withdrawing ? (
                <ActivityIndicator size="small" color={palette.danger} />
              ) : (
                <Text style={styles.withdrawText}>Withdraw vow</Text>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  centered: {
    flex: 1,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: palette.textSecondary,
    fontSize: 16,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  backBtnText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: palette.text,
    fontSize: 20,
  },
  justSealedCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(200,155,60,0.32)',
    backgroundColor: 'rgba(200,155,60,0.08)',
    padding: 18,
    gap: 8,
  },
  justSealedKicker: {
    color: palette.goldBright,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  justSealedTitle: {
    color: palette.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  justSealedBody: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  justSealedCta: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: palette.goldBright,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  justSealedCtaText: {
    color: '#0B0D11',
    fontSize: 15,
    fontWeight: '800',
  },
  vowTextBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  goldQuote: {
    color: palette.goldBright,
    fontSize: 32,
    fontFamily: serifFont,
    lineHeight: 36,
  },
  vowText: {
    flex: 1,
    color: palette.text,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: serifFont,
    lineHeight: 30,
    letterSpacing: -0.5,
    paddingTop: 4,
  },

  // Card
  card: {
    backgroundColor: palette.whiteOverlay,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },

  // Status
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
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Progress
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Countdown
  countdownText: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
  },

  // Dates
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },

  // People
  peopleRow: {
    gap: 6,
  },
  peopleLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  witnessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  witnessName: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  witnessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  witnessBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stakeText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  typeBadgeText: {
    color: palette.goldBright,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Timeline
  timelineSection: {
    marginBottom: 20,
    gap: 12,
  },
  sectionLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  timelineList: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 48,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 14,
    top: 28,
    bottom: 0,
    width: 1,
    backgroundColor: palette.border,
  },
  timelineDotWrap: {
    width: 30,
    alignItems: 'center',
    paddingTop: 2,
  },
  timelineEmoji: {
    fontSize: 16,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 16,
    gap: 2,
  },
  timelineDesc: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '500',
  },
  timelineTime: {
    color: palette.textMuted,
    fontSize: 12,
  },

  // Actions
  actionsBlock: {
    gap: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryActionBtn: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: palette.goldBright,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 18,
  },
  primaryActionText: {
    color: '#0B0D11',
    fontSize: 16,
    fontWeight: '800',
  },
  shareBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  shareBtnText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  earlyActionBtn: {
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(82,214,154,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.24)',
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 2,
  },
  earlyActionText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  earlyActionSubtext: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  withdrawBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  withdrawText: {
    color: palette.danger,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

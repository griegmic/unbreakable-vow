import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/unbreakable';
import type { VowRow } from '@/lib/vow-api';

interface VowCardProps {
  vow: VowRow;
  role: 'maker' | 'witness' | 'challenge';
}

function getStatusConfig(vow: VowRow, role: string) {
  if (role === 'challenge' && vow.challenge_status === 'pending') {
    return { color: '#FF9F43', label: 'Challenge received', pulse: false };
  }
  // For challenge vows with pending challenge_status, show waiting state
  if (vow.vow_type === 'challenge' && vow.challenge_status === 'pending' && role !== 'challenge') {
    return { color: '#F0C86E', label: 'Waiting for response', pulse: false };
  }
  switch (vow.status) {
    case 'active':
      return { color: '#52D69A', label: 'Active', pulse: false };
    case 'awaiting_verdict':
      return { color: '#F0C86E', label: 'Verdict due', pulse: true };
    case 'kept':
      return { color: '#52D69A', label: 'Kept', pulse: false };
    case 'broken':
      return { color: '#FF7B7B', label: 'Broken', pulse: false };
    case 'voided':
      return { color: '#667085', label: 'Withdrawn', pulse: false };
    case 'sealed':
    case 'draft':
      if (vow.vow_type === 'challenge') {
        return { color: '#F0C86E', label: 'Waiting for response', pulse: false };
      }
      return { color: '#667085', label: vow.status === 'sealed' ? 'Sealed' : 'Draft', pulse: false };
    default:
      return { color: '#667085', label: vow.status, pulse: false };
  }
}

function getProgressPercent(vow: VowRow): number {
  if (!vow.starts_at || !vow.ends_at) return 0;
  const start = new Date(vow.starts_at).getTime();
  const end = new Date(vow.ends_at).getTime();
  const now = Date.now();
  if (end <= start) return 100;
  const pct = ((now - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, pct));
}

function getProgressColor(pct: number): string {
  if (pct < 50) return palette.gold;
  if (pct < 80) return '#F0C86E';
  return '#FF7B7B';
}

function getCountdownText(vow: VowRow): string {
  if (!vow.ends_at) return '';
  const end = new Date(vow.ends_at).getTime();
  const diff = end - Date.now();
  if (diff <= 0) {
    const hoursAgo = Math.abs(Math.floor(diff / 3600000));
    if (hoursAgo < 1) return 'Ended just now';
    return `Ended ${hoursAgo}h ago`;
  }
  const days = Math.ceil(diff / 86400000);
  if (days === 1) return 'Last day';
  return `${days} days left`;
}

function getPersonLabel(vow: VowRow, role: string): string {
  if (role === 'witness') {
    return vow.witness_name || 'Unknown';
  }
  if (role === 'challenge') {
    // Target sees the challenger's name (who is also the witness)
    return `By ${vow.witness_name || 'someone'}`;
  }
  // Maker: for challenge vows, witness_name is the challenger's own name — show "Challenge sent"
  if (vow.vow_type === 'challenge') {
    return 'Challenge sent';
  }
  return vow.witness_name || 'Solo';
}

function getStakeLabel(vow: VowRow): string {
  if (!vow.stake_amount || vow.stake_amount === 0) return 'no stake';
  return `$${Math.round(vow.stake_amount / 100)} stake`;
}

export default React.memo(function VowCard({ vow, role }: VowCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const status = getStatusConfig(vow, role);
  const progress = getProgressPercent(vow);
  const progressColor = getProgressColor(progress);
  const countdown = getCountdownText(vow);
  const personLabel = getPersonLabel(vow, role);
  const stakeLabel = getStakeLabel(vow);
  const isChallengePending = role === 'challenge' && vow.challenge_status === 'pending';
  const isCompleted = vow.status === 'kept' || vow.status === 'broken' || vow.status === 'voided';

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (!status.pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [status.pulse, pulseAnim]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/vow-detail', params: { vowId: vow.id } });
  }, [vow.id]);

  const handleOpenChallenge = useCallback(() => {
    if (!vow.challenge_invite_token) return;
    void Haptics.selectionAsync();
    router.push({
      pathname: '/external-web',
      params: { url: encodeURIComponent(`https://unbreakablevow.app/c/${vow.challenge_invite_token}`) },
    } as never);
  }, [vow.challenge_invite_token]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
        testID={`vow-card-${vow.id}`}
      >
        <View style={styles.topRow}>
          <Text style={styles.vowText} numberOfLines={2}>{vow.refined_text || vow.raw_input}</Text>
          <View style={styles.statusRow}>
            <Animated.View style={[styles.statusDot, { backgroundColor: status.color, opacity: status.pulse ? pulseAnim : 1 }]} />
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
            {vow.status === 'kept' && <Check color="#52D69A" size={12} />}
            {vow.status === 'broken' && <X color="#FF7B7B" size={12} />}
          </View>
        </View>

        {!isCompleted && vow.starts_at && vow.ends_at && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progressColor }]} />
            </View>
          </View>
        )}

        <View style={styles.metaRow}>
          {countdown ? <Text style={styles.metaText}>{countdown}</Text> : null}
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{personLabel}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{stakeLabel}</Text>
        </View>

        {isChallengePending && (
          <View style={styles.challengeActions}>
            <Pressable
              style={[styles.challengeBtn, styles.acceptBtn]}
              onPress={handleOpenChallenge}
              testID={`open-challenge-${vow.id}`}
            >
              <Text style={styles.acceptText}>Open dare</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  topRow: {
    gap: 8,
  },
  vowText: {
    color: '#F5F5F7',
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 21,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  progressWrap: {
    paddingTop: 2,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#8A8A8E',
    fontSize: 13,
  },
  metaDot: {
    color: '#8A8A8E',
    fontSize: 13,
  },
  challengeActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  challengeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 44,
  },
  acceptBtn: {
    backgroundColor: palette.goldBright,
  },
  acceptText: {
    color: '#0B0D11',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  declineBtn: {
    backgroundColor: 'rgba(255,123,123,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,123,123,0.2)',
  },
  declineText: {
    color: '#FF7B7B',
    fontSize: 13,
    fontWeight: '600' as const,
  },
});

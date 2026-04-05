import Constants from 'expo-constants';
import { Stack, router } from 'expo-router';
import { AlertCircle, CheckCircle2, Clock, MessageCircleMore, RefreshCw, ShieldCheck, User, UserMinus } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualCard, RitualScreen, SecondaryButton, StatPill, TitleBlock } from '@/components/vow-ui';
import { getVowVerdictDate, palette } from '@/constants/unbreakable';
import { supabase } from '@/lib/supabase';
import { useVowFlow } from '@/providers/vow-flow';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

type WitnessStatus = 'pending' | 'accepted' | 'declined' | 'unknown';

export default function LiveScreen() {
  const { activeVowText, vow, isSelfWitness } = useVowFlow();
  const dates = getVowVerdictDate(vow.rawInput);

  const brokenTarget =
    vow.stake.consequence === 'witness'
      ? (isSelfWitness ? 'charity' : vow.witnessName)
      : vow.stake.destination;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [witnessStatus, setWitnessStatus] = useState<WitnessStatus>(IS_EXPO_GO ? 'accepted' : 'unknown');

  useEffect(() => {
    if (!vow.rawInput) {
      console.log('[LiveScreen] empty vow state, redirecting home');
      router.replace('/');
    }
  }, [vow.rawInput]);

  // Fetch witness acceptance status from DB
  useEffect(() => {
    if (isSelfWitness || IS_EXPO_GO || !vow.vowId) return;

    async function checkWitnessStatus() {
      try {
        const { data } = await supabase
          .from('vows')
          .select('witness_accepted_at, witness_declined')
          .eq('id', vow.vowId)
          .single();

        if (data?.witness_accepted_at) {
          setWitnessStatus('accepted');
        } else if (data?.witness_declined) {
          setWitnessStatus('declined');
        } else {
          setWitnessStatus('pending');
        }
      } catch {
        setWitnessStatus('pending');
      }
    }

    checkWitnessStatus();

    // Poll every 30s for updates
    const interval = setInterval(checkWitnessStatus, 30000);
    return () => clearInterval(interval);
  }, [vow.vowId, isSelfWitness]);

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
        ) : witnessStatus === 'accepted' ? (
          <>
            <View style={styles.infoRow}>
              <CheckCircle2 color={palette.success} size={18} />
              <Text style={styles.infoText}>
                <Text style={styles.witnessAccepted}>{vow.witnessName} accepted!</Text> They're locked in and will deliver the verdict on {dates.endLabel}.
              </Text>
            </View>
          </>
        ) : witnessStatus === 'declined' ? (
          <>
            <View style={styles.infoRow}>
              <UserMinus color={palette.warmAmber} size={18} />
              <Text style={styles.infoText}>
                {vow.witnessName} can't be your witness. Pick a new one or switch to solo.
              </Text>
            </View>
            <View style={styles.witnessActions}>
              <Pressable style={styles.witnessActionBtn} onPress={() => router.push('/witness')}>
                <RefreshCw color={palette.goldBright} size={14} />
                <Text style={styles.witnessActionText}>New witness</Text>
              </Pressable>
              <Pressable style={styles.witnessActionBtn} onPress={() => {
                Alert.alert(
                  'Switch to solo?',
                  'Your vow continues with the same stake and deadline. You\'ll judge yourself. This can\'t be undone.',
                  [
                    { text: 'Keep waiting', style: 'cancel' },
                    { text: 'Go solo', onPress: () => console.log('[LiveScreen] TODO: switch to solo mid-vow') },
                  ]
                );
              }}>
                <User color={palette.goldBright} size={14} />
                <Text style={styles.witnessActionText}>Go solo</Text>
              </Pressable>
            </View>
          </>
        ) : witnessStatus === 'pending' ? (
          <>
            <View style={styles.infoRow}>
              <Clock color={palette.warmAmber} size={18} />
              <Text style={styles.infoText}>
                <Text style={styles.witnessPending}>Waiting for {vow.witnessName}</Text> to accept.
              </Text>
            </View>
            <View style={styles.witnessActions}>
              <Pressable style={styles.witnessActionBtn} onPress={() => {
                Alert.alert('Invite resent', `We sent another SMS to ${vow.witnessName}.`);
              }}>
                <RefreshCw color={palette.goldBright} size={14} />
                <Text style={styles.witnessActionText}>Resend invite</Text>
              </Pressable>
              <Pressable style={styles.witnessActionBtn} onPress={() => {
                Alert.alert(
                  'Switch to solo?',
                  'Your vow continues with the same stake and deadline. You\'ll judge yourself. This can\'t be undone.',
                  [
                    { text: 'Keep waiting', style: 'cancel' },
                    { text: 'Go solo', onPress: () => console.log('[LiveScreen] TODO: switch to solo mid-vow') },
                  ]
                );
              }}>
                <User color={palette.goldBright} size={14} />
                <Text style={styles.witnessActionText}>Go solo</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <MessageCircleMore color={palette.goldBright} size={18} />
              <Text style={styles.infoText}>
                {vow.witnessName} is your witness. They'll get an SMS at verdict time.
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
  witnessAccepted: {
    color: palette.success,
    fontWeight: '700' as const,
  },
  witnessPending: {
    color: palette.warmAmber,
    fontWeight: '600' as const,
  },
  witnessActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  witnessActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceElevated,
  },
  witnessActionText: {
    color: palette.goldBright,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  footerNote: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
  },
});

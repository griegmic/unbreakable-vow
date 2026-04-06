import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Clock, RefreshCw, Send, Share2, ShieldCheck, User, UserMinus } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { VowCertificate } from '@/components/vow-certificate';
import { PrimaryButton, RitualCard, RitualScreen, SecondaryButton, StatPill, TitleBlock } from '@/components/vow-ui';
import { getVowVerdictDate, palette } from '@/constants/unbreakable';
import { supabase } from '@/lib/supabase';
import { extendVowDeadline, resendWitnessInvite, switchToSoloWitness } from '@/lib/vow-api';
import { useVowFlow } from '@/providers/vow-flow';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

type WitnessStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'unknown';

export default function LiveScreen() {
  const { activeVowText, vow, isSelfWitness, switchToSolo } = useVowFlow();
  const dates = getVowVerdictDate(vow.rawInput);

  const brokenTarget =
    vow.stake.consequence === 'witness'
      ? (isSelfWitness ? 'charity' : vow.witnessName)
      : vow.stake.destination;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [witnessStatus, setWitnessStatus] = useState<WitnessStatus>(IS_EXPO_GO ? 'pending' : 'unknown');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resending, setResending] = useState<boolean>(false);
  const [goingSolo, setGoingSolo] = useState<boolean>(false);
  const [extending, setExtending] = useState<boolean>(false);
  const [showCertificate, setShowCertificate] = useState<boolean>(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!vow.rawInput) {
      console.log('[LiveScreen] empty vow state, redirecting home');
      router.replace('/');
    }
  }, [vow.rawInput]);

  useEffect(() => {
    if (isSelfWitness || IS_EXPO_GO || !vow.vowId) return;

    async function checkWitnessStatus() {
      try {
        const { data } = await supabase
          .from('vows')
          .select('witness_accepted_at, witness_declined, ends_at')
          .eq('id', vow.vowId!)
          .single();

        if (data?.witness_accepted_at) {
          setWitnessStatus('accepted');
        } else if (data?.witness_declined) {
          setWitnessStatus('declined');
        } else if (data?.ends_at) {
          const endsAt = new Date(data.ends_at);
          const now = new Date();
          if (now >= endsAt) {
            setWitnessStatus('expired');
          } else {
            setWitnessStatus('pending');
          }
        } else {
          setWitnessStatus('pending');
        }
      } catch {
        setWitnessStatus('pending');
      }
    }

    void checkWitnessStatus();
    const interval = setInterval(() => void checkWitnessStatus(), 30000);
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

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startResendCooldown = useCallback(() => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleResendInvite = useCallback(async () => {
    if (resendCooldown > 0 || resending || !vow.vowId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setResending(true);

    if (IS_EXPO_GO) {
      setTimeout(() => {
        setResending(false);
        startResendCooldown();
        Alert.alert('SMS sent', `Invite resent to ${vow.witnessName}.`);
      }, 800);
      return;
    }

    const result = await resendWitnessInvite(vow.vowId);
    setResending(false);

    if (result.success) {
      startResendCooldown();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('SMS sent', `Invite resent to ${vow.witnessName}.`);
    } else {
      Alert.alert('Couldn\'t resend', result.error || 'Please try again later.');
    }
  }, [resendCooldown, resending, vow.vowId, vow.witnessName, startResendCooldown]);

  const handleGoSolo = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Switch to solo?',
      `You'll judge yourself on ${dates.endLabel}. This can't be undone.`,
      [
        { text: 'Keep waiting', style: 'cancel' },
        {
          text: 'Go solo',
          style: 'destructive',
          onPress: async () => {
            setGoingSolo(true);

            if (IS_EXPO_GO) {
              switchToSolo();
              setGoingSolo(false);
              return;
            }

            if (vow.vowId) {
              const result = await switchToSoloWitness(vow.vowId);
              if (result.success) {
                switchToSolo();
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else {
                Alert.alert('Something went wrong', result.error || 'Please try again.');
              }
            } else {
              switchToSolo();
            }
            setGoingSolo(false);
          },
        },
      ],
    );
  }, [dates.endLabel, vow.vowId, switchToSolo]);

  const handlePickNewWitness = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/witness', params: { midVow: '1' } });
  }, []);

  const handleShareInviteLink = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const inviteUrl = vow.witnessInviteToken
        ? `https://unbreakablevow.app/w/${vow.witnessInviteToken}`
        : 'https://unbreakablevow.app';
      const msg = `I made an Unbreakable Vow: "${activeVowText}" — and I need you to hold me to it. ${vow.stake.amount} is on the line. ${inviteUrl}`;
      console.log('[LiveScreen] sharing invite link:', inviteUrl);
      await Share.share(
        Platform.OS === 'ios'
          ? { message: msg, url: inviteUrl }
          : { message: msg }
      );
    } catch {
      console.log('[LiveScreen] share invite failed');
    }
  }, [activeVowText, vow.stake.amount, vow.witnessInviteToken]);

  const handleShareCertificate = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const msg = `I made an Unbreakable Vow: ${activeVowText}. ${vow.stake.amount} on the line. unbreakablevow.app`;
      await Share.share({ message: msg });
    } catch {
      console.log('[LiveScreen] share failed');
    }
  }, [activeVowText, vow.stake.amount]);

  const handleExtendDeadline = useCallback(async () => {
    if (extending || !vow.vowId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExtending(true);

    if (IS_EXPO_GO) {
      setTimeout(() => {
        setExtending(false);
        setWitnessStatus('pending');
        Alert.alert('Extended', `${vow.witnessName} has 48 more hours to respond.`);
      }, 800);
      return;
    }

    const result = await extendVowDeadline(vow.vowId, 48);
    setExtending(false);

    if (result.success) {
      setWitnessStatus('pending');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Extended', `${vow.witnessName} has 48 more hours to respond.`);
    } else {
      Alert.alert('Couldn\'t extend', result.error || 'Please try again.');
    }
  }, [extending, vow.vowId, vow.witnessName]);

  const renderWitnessCard = () => {
    if (isSelfWitness) {
      return (
        <View style={styles.infoRow}>
          <ShieldCheck color={palette.goldBright} size={18} />
          <Text style={styles.infoText}>
            You're holding yourself accountable. On {dates.endLabel}, you'll deliver your own honest verdict.
          </Text>
        </View>
      );
    }

    if (witnessStatus === 'accepted') {
      return (
        <View style={styles.infoRow}>
          <CheckCircle2 color={palette.success} size={18} />
          <Text style={styles.infoText}>
            <Text style={styles.witnessAccepted}>{vow.witnessName} is locked in.</Text> They'll deliver the verdict on {dates.endLabel}.
          </Text>
        </View>
      );
    }

    if (witnessStatus === 'declined') {
      return (
        <>
          <View style={styles.infoRow}>
            <UserMinus color={palette.warmAmber} size={18} />
            <Text style={styles.infoText}>
              {vow.witnessName} can't be your witness.
            </Text>
          </View>
          <View style={styles.witnessActions}>
            <Pressable
              style={styles.witnessActionBtn}
              onPress={handlePickNewWitness}
              testID="live-new-witness"
            >
              <RefreshCw color={palette.goldBright} size={14} />
              <Text style={styles.witnessActionText}>Pick a new witness</Text>
            </Pressable>
            <Pressable
              style={[styles.witnessActionBtn, goingSolo && styles.witnessActionBtnDisabled]}
              onPress={handleGoSolo}
              disabled={goingSolo}
              testID="live-go-solo-declined"
            >
              {goingSolo ? (
                <ActivityIndicator size="small" color={palette.goldBright} />
              ) : (
                <User color={palette.goldBright} size={14} />
              )}
              <Text style={styles.witnessActionText}>Go solo</Text>
            </Pressable>
          </View>
        </>
      );
    }

    if (witnessStatus === 'expired') {
      return (
        <>
          <View style={styles.infoRow}>
            <AlertCircle color={palette.warmAmber} size={18} />
            <Text style={styles.infoText}>
              Time's up. <Text style={styles.witnessPending}>{vow.witnessName}</Text> didn't respond.
            </Text>
          </View>
          <View style={styles.witnessActions}>
            <Pressable
              style={styles.witnessActionBtn}
              onPress={() => router.push('/self-resolve')}
              testID="live-judge-myself"
            >
              <ShieldCheck color={palette.goldBright} size={14} />
              <Text style={styles.witnessActionText}>Judge myself</Text>
            </Pressable>
            <Pressable
              style={[styles.witnessActionBtn, extending && styles.witnessActionBtnDisabled]}
              onPress={handleExtendDeadline}
              disabled={extending}
              testID="live-extend-deadline"
            >
              {extending ? (
                <ActivityIndicator size="small" color={palette.goldBright} />
              ) : (
                <Clock color={palette.goldBright} size={14} />
              )}
              <Text style={styles.witnessActionText}>Give them 48 more hours</Text>
            </Pressable>
          </View>
        </>
      );
    }

    if (witnessStatus === 'pending') {
      return (
        <>
          <View style={styles.infoRow}>
            <Clock color={palette.warmAmber} size={18} />
            <Text style={styles.infoText}>
              Waiting for <Text style={styles.witnessPending}>{vow.witnessName}</Text> to accept.
            </Text>
          </View>
          <Pressable
            style={styles.nudgeBtn}
            onPress={handleShareInviteLink}
            testID="live-share-invite"
          >
            <Share2 color={palette.goldBright} size={15} />
            <Text style={styles.nudgeBtnText}>Nudge {vow.witnessName}</Text>
          </Pressable>
          <View style={styles.witnessActions}>
            {vow.phoneNumber ? (
              <Pressable
                style={[
                  styles.witnessActionBtn,
                  (resendCooldown > 0 || resending) && styles.witnessActionBtnDisabled,
                ]}
                onPress={handleResendInvite}
                disabled={resendCooldown > 0 || resending}
                testID="live-resend-invite"
              >
                {resending ? (
                  <ActivityIndicator size="small" color={palette.goldBright} />
                ) : (
                  <Send color={palette.goldBright} size={14} />
                )}
                <Text style={styles.witnessActionText}>
                  {resendCooldown > 0 ? `Resend SMS (${resendCooldown}s)` : 'Resend SMS'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.witnessActionBtn, goingSolo && styles.witnessActionBtnDisabled]}
              onPress={handleGoSolo}
              disabled={goingSolo}
              testID="live-go-solo-pending"
            >
              {goingSolo ? (
                <ActivityIndicator size="small" color={palette.goldBright} />
              ) : (
                <User color={palette.goldBright} size={14} />
              )}
              <Text style={styles.witnessActionText}>Go solo</Text>
            </Pressable>
          </View>
        </>
      );
    }

    return (
      <View style={styles.infoRow}>
        <Clock color={palette.textMuted} size={18} />
        <Text style={styles.infoText}>
          Checking witness status...
        </Text>
      </View>
    );
  };

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label={
              isSelfWitness || witnessStatus === 'expired'
                ? 'Deliver your verdict'
                : 'Preview the witness verdict'
            }
            onPress={() => router.push(
              isSelfWitness || witnessStatus === 'expired'
                ? '/self-resolve'
                : '/witness-verdict'
            )}
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
        subtitle={`$${vow.stake.amount} at stake \u00B7 Goes to ${brokenTarget} if broken`}
      />

      <View style={styles.statsRow}>
        <StatPill value={dates.range} label="vow window" />
        <StatPill value={dates.endLabel} label="verdict date" />
      </View>

      <RitualCard>
        {renderWitnessCard()}
      </RitualCard>

      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          setShowCertificate((prev) => !prev);
        }}
        style={styles.certToggle}
        testID="live-toggle-certificate"
      >
        <Text style={styles.certToggleText}>
          {showCertificate ? 'Hide vow card' : 'View your vow'}
        </Text>
        {showCertificate
          ? <ChevronUp color={palette.textMuted} size={14} />
          : <ChevronDown color={palette.textMuted} size={14} />
        }
      </Pressable>

      {showCertificate && (
        <>
          <VowCertificate
            vowText={activeVowText}
            stakeAmount={vow.stake.amount}
            sealDate={dates.range}
          />
          <Pressable
            onPress={handleShareCertificate}
            style={({ pressed }) => [styles.shareRow, pressed && styles.shareRowPressed]}
            testID="live-share-certificate"
          >
            <Share2 color={palette.goldBright} size={15} />
            <Text style={styles.shareRowText}>Share</Text>
          </Pressable>
        </>
      )}

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
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceElevated,
  },
  witnessActionBtnDisabled: {
    opacity: 0.5,
  },
  witnessActionText: {
    color: palette.goldBright,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  footerNote: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
  },
  certToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  certToggleText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.2)',
    backgroundColor: 'rgba(212,162,79,0.04)',
  },
  shareRowPressed: {
    opacity: 0.7,
  },
  shareRowText: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: palette.warmAmberBorder,
    backgroundColor: 'rgba(212,162,79,0.06)',
    marginTop: 4,
  },
  nudgeBtnText: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

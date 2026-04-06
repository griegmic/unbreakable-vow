import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { AlertCircle, Check, ChevronDown, ChevronUp, Clock, RefreshCw, Share2, ShieldCheck, User, UserMinus } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { VowCertificate } from '@/components/vow-certificate';
import { PrimaryButton, RitualScreen, SecondaryButton, StatPill, TitleBlock } from '@/components/vow-ui';
import { getVowVerdictDate, palette } from '@/constants/unbreakable';
import { supabase } from '@/lib/supabase';
import { extendVowDeadline, resendWitnessInvite, switchToSoloWitness } from '@/lib/vow-api';
import { useVowFlow } from '@/providers/vow-flow';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

type WitnessStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'unknown';
type VowPhase = 'witness_pending' | 'vow_active' | 'verdict_due';

export default function LiveScreen() {
  const { activeVowText, vow, isSelfWitness, switchToSolo } = useVowFlow();
  const params = useLocalSearchParams<{ justSealed?: string }>();
  const [showSealedBanner, setShowSealedBanner] = useState<boolean>(params.justSealed === '1');
  const dates = getVowVerdictDate(vow.rawInput);
  const sealedBannerFade = useRef(new Animated.Value(0)).current;
  const sealedBannerSlide = useRef(new Animated.Value(20)).current;

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

  const now = new Date();
  const endDateStr = dates.endLabel;
  const endDate = new Date(endDateStr);
  const isVerdictDue = !isNaN(endDate.getTime()) && now >= endDate;

  const witnessAccepted = witnessStatus === 'accepted';
  const isWitnessPending = !isSelfWitness && !witnessAccepted && !isVerdictDue && witnessStatus !== 'declined' && witnessStatus !== 'expired';

  const phase: VowPhase = isVerdictDue ? 'verdict_due' : (isWitnessPending ? 'witness_pending' : 'vow_active');

  console.log('[LiveScreen] phase:', phase, '| witnessStatus:', witnessStatus, '| isSelfWitness:', isSelfWitness);

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
          const n = new Date();
          if (n >= endsAt) {
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
    if (showSealedBanner) {
      console.log('[LiveScreen] just sealed, showing celebration banner');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.timing(sealedBannerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(sealedBannerSlide, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 8 }),
      ]).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const _handleResendInvite = useCallback(async () => {
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

  const renderWitnessPendingCard = () => {
    if (witnessStatus === 'declined') {
      return (
        <View style={styles.pendingCard}>
          <View style={styles.pendingIconRow}>
            <UserMinus color={palette.warmAmber} size={20} />
            <Text style={styles.pendingTitle}>{vow.witnessName} can't be your witness.</Text>
          </View>
          <Text style={styles.pendingDesc}>Pick someone else or go solo — you'll judge yourself on {dates.endLabel}.</Text>
          <View style={styles.declinedActions}>
            <Pressable
              style={styles.declinedActionBtn}
              onPress={handlePickNewWitness}
              testID="live-new-witness"
            >
              <RefreshCw color={palette.goldBright} size={14} />
              <Text style={styles.declinedActionText}>Pick a new witness</Text>
            </Pressable>
            <Pressable
              style={[styles.declinedActionBtn, goingSolo && styles.declinedActionBtnDisabled]}
              onPress={handleGoSolo}
              disabled={goingSolo}
              testID="live-go-solo-declined"
            >
              {goingSolo ? (
                <ActivityIndicator size="small" color={palette.goldBright} />
              ) : (
                <User color={palette.goldBright} size={14} />
              )}
              <Text style={styles.declinedActionText}>Go solo</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (witnessStatus === 'expired') {
      return (
        <View style={styles.pendingCard}>
          <View style={styles.pendingIconRow}>
            <AlertCircle color={palette.warmAmber} size={20} />
            <Text style={styles.pendingTitle}>{vow.witnessName} didn't respond.</Text>
          </View>
          <Text style={styles.pendingDesc}>You can judge yourself or give them more time.</Text>
          <View style={styles.declinedActions}>
            <Pressable
              style={styles.declinedActionBtn}
              onPress={() => router.push('/self-resolve')}
              testID="live-judge-myself"
            >
              <ShieldCheck color={palette.goldBright} size={14} />
              <Text style={styles.declinedActionText}>Judge myself</Text>
            </Pressable>
            <Pressable
              style={[styles.declinedActionBtn, extending && styles.declinedActionBtnDisabled]}
              onPress={handleExtendDeadline}
              disabled={extending}
              testID="live-extend-deadline"
            >
              {extending ? (
                <ActivityIndicator size="small" color={palette.goldBright} />
              ) : (
                <Clock color={palette.goldBright} size={14} />
              )}
              <Text style={styles.declinedActionText}>Give 48 more hours</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.pendingCard}>
        <View style={styles.pendingIconRow}>
          <Clock color={palette.warmAmber} size={20} />
          <Text style={styles.pendingTitle}>Waiting for {vow.witnessName} to accept</Text>
        </View>
        <Text style={styles.pendingDesc}>
          {vow.phoneNumber
            ? `We sent them an invite. Share the link below to nudge them personally.`
            : `Share the invite so ${vow.witnessName} can accept and hold you to it.`
          }
        </Text>
        <Pressable
          onPress={() => { void handleShareInviteLink(); }}
          style={({ pressed }) => [styles.shareInviteBtn, pressed && styles.shareInviteBtnPressed]}
          testID="live-share-invite"
        >
          <Share2 color="#0B0D11" size={16} />
          <Text style={styles.shareInviteText}>Share with {vow.witnessName}</Text>
        </Pressable>
        <Pressable
          style={[styles.goSoloLink, goingSolo && { opacity: 0.5 }]}
          onPress={handleGoSolo}
          disabled={goingSolo}
          testID="live-go-solo-pending"
        >
          {goingSolo ? (
            <ActivityIndicator size="small" color={palette.textMuted} />
          ) : (
            <Text style={styles.goSoloText}>or go solo</Text>
          )}
        </Pressable>
      </View>
    );
  };

  const renderVowActiveCard = () => {
    if (isSelfWitness) {
      return (
        <View style={styles.activeCard}>
          <View style={styles.activeIconRow}>
            <View style={styles.activeCheckBg}>
              <ShieldCheck color={palette.goldBright} size={18} />
            </View>
            <Text style={styles.activeTitle}>You're the Vowkeeper.</Text>
          </View>
          <Text style={styles.activeQuote}>
            You'll deliver your own honest verdict on {dates.endLabel}.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.activeCard}>
        <View style={styles.activeIconRow}>
          <View style={styles.activeCheckBg}>
            <Check color={palette.success} size={18} />
          </View>
          <Text style={styles.activeTitle}>{vow.witnessName} is watching.</Text>
        </View>
        <Text style={styles.activeQuote}>
          {vow.witnessName} will deliver the verdict on {dates.endLabel}.
        </Text>
      </View>
    );
  };

  const renderVerdictDueCard = () => {
    const isVowkeeper = isSelfWitness;
    return (
      <View style={styles.verdictCard}>
        <Text style={styles.verdictHeadline}>Time's up.</Text>
        <Text style={styles.verdictSub}>
          {isVowkeeper
            ? 'How did it go?'
            : `${vow.witnessName}, it's your call.`
          }
        </Text>
      </View>
    );
  };

  const renderBadge = () => {
    if (phase === 'verdict_due') {
      return (
        <View style={styles.statusBadgeWrap}>
          <View style={styles.statusBadgeRow}>
            <View style={styles.verdictBadge}>
              <View style={styles.verdictDot} />
              <Text style={styles.verdictBadgeText}>VERDICT DUE</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.statusBadgeWrap}>
        <View style={styles.statusBadgeRow}>
          <Animated.View style={[styles.statusPulse, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>VOW ACTIVE</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (phase === 'verdict_due') {
      return (
        <>
          <PrimaryButton
            label={isSelfWitness ? 'Deliver your verdict' : `Nudge ${vow.witnessName} to decide`}
            onPress={() => router.push(isSelfWitness ? '/self-resolve' : '/witness-verdict')}
            testID="live-verdict"
          />
          <SecondaryButton label="View history" onPress={() => router.push('/history')} testID="live-history" />
        </>
      );
    }

    return (
      <SecondaryButton label="View history" onPress={() => router.push('/history')} testID="live-history" />
    );
  };

  return (
    <RitualScreen footer={renderFooter()}>
      <Stack.Screen options={{ headerShown: false }} />

      {renderBadge()}

      {showSealedBanner && phase === 'witness_pending' && (
        <Animated.View style={[styles.sealedBanner, { opacity: sealedBannerFade, transform: [{ translateY: sealedBannerSlide }] }]}>
          <Text style={styles.sealedBannerTitle}>
            {isSelfWitness ? 'Sealed. Your vow is locked.' : `Sealed. Now get ${vow.witnessName} on board.`}
          </Text>
          <Text style={styles.sealedBannerSub}>
            {vow.phoneNumber
              ? `We texted ${vow.witnessName}. Share the link below to nudge them personally.`
              : `Share the invite so ${vow.witnessName} can accept and hold you to it.`
            }
          </Text>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              Animated.timing(sealedBannerFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                setShowSealedBanner(false);
              });
            }}
            style={styles.sealedDismissX}
            testID="live-sealed-dismiss"
          >
            <Text style={styles.sealedDismissXText}>✕</Text>
          </Pressable>
        </Animated.View>
      )}

      {showSealedBanner && isSelfWitness && (
        <Animated.View style={[styles.sealedBanner, { opacity: sealedBannerFade, transform: [{ translateY: sealedBannerSlide }] }]}>
          <Text style={styles.sealedBannerTitle}>Sealed. Your vow is locked.</Text>
          <Text style={styles.sealedBannerSub}>You'll judge yourself when the time comes.</Text>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              Animated.timing(sealedBannerFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                setShowSealedBanner(false);
              });
            }}
            style={styles.sealedDismissX}
            testID="live-sealed-dismiss-solo"
          >
            <Text style={styles.sealedDismissXText}>✕</Text>
          </Pressable>
        </Animated.View>
      )}

      <TitleBlock
        title={activeVowText}
        subtitle={`${vow.stake.amount} at stake \u00B7 Goes to ${brokenTarget} if broken`}
      />

      {phase !== 'verdict_due' && (
        <View style={styles.statsRow}>
          <StatPill value={dates.range} label="vow window" />
          <StatPill value={dates.endLabel} label="verdict date" />
        </View>
      )}

      {phase === 'witness_pending' && renderWitnessPendingCard()}
      {phase === 'vow_active' && renderVowActiveCard()}
      {phase === 'verdict_due' && renderVerdictDueCard()}

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
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  verdictDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.goldBright,
  },
  verdictBadgeText: {
    color: palette.goldBright,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pendingCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    padding: 20,
    gap: 14,
  },
  pendingIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingTitle: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  pendingDesc: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  shareInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: palette.goldBright,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  shareInviteBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  shareInviteText: {
    color: '#0B0D11',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  goSoloLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  goSoloText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  declinedActions: {
    flexDirection: 'row',
    gap: 10,
  },
  declinedActionBtn: {
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
  declinedActionBtnDisabled: {
    opacity: 0.5,
  },
  declinedActionText: {
    color: palette.goldBright,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  activeCard: {
    backgroundColor: 'rgba(82,214,154,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.22)',
    padding: 20,
    gap: 12,
  },
  activeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeCheckBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(82,214,154,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTitle: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  activeQuote: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  verdictCard: {
    backgroundColor: 'rgba(212,162,79,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    padding: 24,
    gap: 8,
    alignItems: 'center',
  },
  verdictHeadline: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  verdictSub: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center' as const,
  },
  sealedBanner: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(82,214,154,0.25)',
    padding: 22,
    gap: 12,
    alignItems: 'center',
    shadowColor: palette.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  sealedBannerTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    letterSpacing: -0.3,
  },
  sealedBannerSub: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center' as const,
  },
  sealedDismissX: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sealedDismissXText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
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
});

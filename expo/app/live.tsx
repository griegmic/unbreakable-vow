import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { AlertCircle, ChevronLeft, ChevronRight, Clock, ExternalLink, FastForward, Flame, Layout, MessageCircle, RefreshCw, Share2, ShieldCheck, Sparkles, ThumbsUp, Trophy, User, UserMinus, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualScreen, SecondaryButton, TitleBlock } from '@/components/vow-ui';
import { getDailyNudge, getVowVerdictDate, palette, serifFont } from '@/constants/unbreakable';
import { supabase } from '@/lib/supabase';
import { extendVowDeadline, resendWitnessInvite, submitCheckIn, switchToSoloWitness } from '@/lib/vow-api';
import { useVowFlow } from '@/providers/vow-flow';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

type WitnessStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'unknown';
type VowPhase = 'witness_pending' | 'vow_active' | 'verdict_due';
type CheckInType = 'on_track' | 'struggling' | 'done_early';

const CHECK_IN_COOLDOWN_MS = 4 * 60 * 60 * 1000;

export default function LiveScreen() {
  const vowFlow = useVowFlow();
  const { activeVowText, vow, isSelfWitness, switchToSolo, setVowId, setDeadline } = vowFlow;
  const searchParams = useLocalSearchParams<{ justSealed?: string; vowId?: string }>();
  const dates = useMemo(() => {
    if (vow.deadlineIso) {
      const end = new Date(vow.deadlineIso);
      const start = new Date();
      const formatShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const formatLong = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return {
        verdictLabel: `Verdict on ${formatLong(end)}`,
        endLabel: formatLong(end),
        range: `${formatShort(start)} \u2013 ${formatShort(end)}`,
        isCustomDate: true,
      };
    }
    return getVowVerdictDate(vow.rawInput);
  }, [vow.deadlineIso, vow.rawInput]);

  const brokenTarget = vow.stake.destination;

  // Share banner for witnessed vows just sealed
  const [shareBannerDismissed, setShareBannerDismissed] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkInScaleOn = useRef(new Animated.Value(1)).current;
  const checkInScaleStruggle = useRef(new Animated.Value(1)).current;
  const checkInScaleDone = useRef(new Animated.Value(1)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;

  const [witnessStatus, setWitnessStatus] = useState<WitnessStatus>(IS_EXPO_GO ? 'pending' : 'unknown');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resending, setResending] = useState<boolean>(false);
  const [goingSolo, setGoingSolo] = useState<boolean>(false);
  const [extending, setExtending] = useState<boolean>(false);
  const [checkingIn, setCheckingIn] = useState<boolean>(false);
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [checkInFeedback, setCheckInFeedback] = useState<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const now = new Date();
  const endDateStr = dates.endLabel;
  const endDate = vow.deadlineIso ? new Date(vow.deadlineIso) : new Date(NaN);
  const isVerdictDue = !isNaN(endDate.getTime()) && now >= endDate;

  const witnessAccepted = witnessStatus === 'accepted';
  const witnessStatusKnown = witnessStatus !== 'unknown';
  const isWitnessPending = !isSelfWitness && !witnessAccepted && !isVerdictDue && witnessStatus !== 'declined' && witnessStatus !== 'expired' && witnessStatusKnown;

  const phase: VowPhase = isVerdictDue ? 'verdict_due' : (isWitnessPending ? 'witness_pending' : 'vow_active');

  console.log('[LiveScreen] phase:', phase, '| witnessStatus:', witnessStatus, '| isSelfWitness:', isSelfWitness);

  // Hydrate VowFlow from DB when arriving from dashboard with vowId param
  const [hydrating, setHydrating] = useState(false);
  useEffect(() => {
    const paramVowId = searchParams.vowId;
    if (!paramVowId || vow.rawInput) return; // already hydrated or no param

    setHydrating(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('vows')
          .select('*')
          .eq('id', paramVowId)
          .single();
        if (!data) { setHydrating(false); return; }

        vowFlow.setRawInput(data.raw_input);
        vowFlow.setRefinedText(data.refined_text);
        vowFlow.setVowId(data.id, data.witness_invite_token);
        if (data.ends_at) vowFlow.setDeadline(new Date(data.ends_at).toISOString());
        vowFlow.setStake({
          amount: Math.round(data.stake_amount / 100),
          consequence: (data.consequence || 'charity') as 'charity' | 'anti',
          destination: data.destination,
        });
        if (data.witness_name === 'Just me') {
          vowFlow.setWitnessType('self');
          vowFlow.setWitness('Just me', 'link');
        } else {
          vowFlow.setWitnessType('friend');
          vowFlow.setWitness(data.witness_name, data.witness_phone ? 'sms' : 'link', data.witness_phone || undefined);
        }
      } catch (err) {
        console.error('[LiveScreen] hydration from DB failed:', err);
      }
      setHydrating(false);
    })();
  }, [searchParams.vowId]);

  useEffect(() => {
    if (!vow.rawInput && !searchParams.vowId && !hydrating) {
      console.log('[LiveScreen] empty vow state, redirecting home');
      router.replace('/');
    }
  }, [vow.rawInput, searchParams.vowId, hydrating]);

  useEffect(() => {
    if (!vow.vowId) return;

    async function hydrateFromDb() {
      try {
        const { data } = await supabase
          .from('vows')
          .select('witness_invite_token, witness_accepted_at, witness_declined, ends_at')
          .eq('id', vow.vowId!)
          .single();

        if (!data) return;

        if (!vow.witnessInviteToken && data.witness_invite_token) {
          setVowId(vow.vowId!, data.witness_invite_token);
        }

        // Sync DB ends_at into VowFlow so display dates stay accurate
        if (data.ends_at) {
          setDeadline(new Date(data.ends_at).toISOString());
        }

        if (!isSelfWitness) {
          if (data.witness_accepted_at) {
            setWitnessStatus((prev) => {
              if (prev !== 'accepted') {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              return 'accepted';
            });
          } else if (data.witness_declined) {
            setWitnessStatus('declined');
          } else if (data.ends_at) {
            const endsAt = new Date(data.ends_at);
            if (new Date() >= endsAt) {
              setWitnessStatus('expired');
            } else {
              setWitnessStatus('pending');
            }
          } else {
            setWitnessStatus('pending');
          }
        }
      } catch {
        // fallback
      }
    }

    void hydrateFromDb();
  }, [vow.vowId, vow.witnessInviteToken, setVowId, setDeadline, isSelfWitness]);

  useEffect(() => {
    if (!vow.vowId) return;
    async function fetchLastCheckIn() {
      try {
        const { data } = await supabase
          .from('audit_events')
          .select('created_at')
          .eq('vow_id', vow.vowId!)
          .eq('event_type', 'check_in')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (data?.created_at) {
          setLastCheckIn(data.created_at);
          console.log('[LiveScreen] last check-in:', data.created_at);
        }
      } catch {
        // no check-ins yet
      }
    }
    void fetchLastCheckIn();
  }, [vow.vowId]);

  useEffect(() => {
    if (isSelfWitness || !vow.vowId) return;

    async function checkWitnessStatus() {
      try {
        const { data } = await supabase
          .from('vows')
          .select('witness_accepted_at, witness_declined, ends_at')
          .eq('id', vow.vowId!)
          .single();

        if (data?.witness_accepted_at) {
          setWitnessStatus((prev) => {
            if (prev !== 'accepted') {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            return 'accepted';
          });
        } else if (data?.witness_declined) {
          setWitnessStatus('declined');
        } else if (data?.ends_at) {
          const endsAt = new Date(data.ends_at);
          if (new Date() >= endsAt) {
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

    const interval = setInterval(() => void checkWitnessStatus(), 5000);
    return () => clearInterval(interval);
  }, [vow.vowId, isSelfWitness]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(fadeInAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const progressPercent = useMemo(() => {
    if (isNaN(endDate.getTime())) return 0;
    const startDate = vow.vowId ? new Date(endDate.getTime() - 7 * 86400000) : now;
    const total = endDate.getTime() - startDate.getTime();
    if (total <= 0) return 100;
    const elapsed = now.getTime() - startDate.getTime();
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endDate.getTime()]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progressPercent, progressAnim]);

  const progressColor = useMemo(() => {
    if (progressPercent < 50) return palette.goldBright;
    if (progressPercent < 80) return palette.warmAmber;
    return palette.danger;
  }, [progressPercent]);

  const canCheckIn = useMemo(() => {
    if (!lastCheckIn) return true;
    const lastTime = new Date(lastCheckIn).getTime();
    return Date.now() - lastTime > CHECK_IN_COOLDOWN_MS;
  }, [lastCheckIn]);

  const checkInCooldownLabel = useMemo(() => {
    if (!lastCheckIn || canCheckIn) return null;
    const lastTime = new Date(lastCheckIn).getTime();
    const remaining = CHECK_IN_COOLDOWN_MS - (Date.now() - lastTime);
    const hours = Math.ceil(remaining / (60 * 60 * 1000));
    return `Next check-in in ${hours}h`;
  }, [lastCheckIn, canCheckIn]);

  const daysLeft = useMemo(() => {
    if (isNaN(endDate.getTime())) return null;
    const ms = endDate.getTime() - now.getTime();
    return Math.ceil(ms / 86400000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endDate.getTime()]);

  const countdownLabel = daysLeft === null ? null
    : daysLeft <= 0 ? "Today's the day"
    : daysLeft === 1 ? 'Last day'
    : `${daysLeft} days left`;

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
      const msg = vow.stake.amount > 0
        ? `I made an Unbreakable Vow: "${activeVowText}" — and I need you to hold me to it. $${vow.stake.amount} is on the line. ${inviteUrl}`
        : `I made an Unbreakable Vow: "${activeVowText}" — hold me to it. ${inviteUrl}`;
      console.log('[LiveScreen] sharing invite link:', inviteUrl);
      await Share.share({ message: msg });
    } catch {
      console.log('[LiveScreen] share invite failed');
    }
  }, [activeVowText, vow.stake.amount, vow.witnessInviteToken]);

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
      if (result.newEndDate) {
        setDeadline(result.newEndDate);
      }
      setWitnessStatus('pending');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Extended', `${vow.witnessName} has 48 more hours to respond.`);
    } else {
      Alert.alert('Couldn\'t extend', result.error || 'Please try again.');
    }
  }, [extending, vow.vowId, vow.witnessName, setDeadline]);

  const handleFastForward = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (vow.vowId) {
      await supabase.from('vows').update({
        status: 'awaiting_verdict',
        ends_at: new Date(Date.now() - 60000).toISOString(),
        witness_accepted_at: new Date().toISOString(),
      }).eq('id', vow.vowId);
      setWitnessStatus('accepted');
    }
    router.push('/witness-verdict');
  }, [vow.vowId]);

  const handleCheckIn = useCallback(async (type: CheckInType) => {
    if (checkingIn || !canCheckIn || !vow.vowId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCheckingIn(true);

    const scaleRef = type === 'on_track' ? checkInScaleOn
      : type === 'struggling' ? checkInScaleStruggle
      : checkInScaleDone;

    Animated.sequence([
      Animated.timing(scaleRef, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleRef, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }),
    ]).start();

    if (IS_EXPO_GO) {
      setTimeout(() => {
        setCheckingIn(false);
        setLastCheckIn(new Date().toISOString());
        const feedbackMap: Record<CheckInType, string> = {
          on_track: "Keep it up. You're doing this.",
          struggling: "Rough days count too. Stay in the fight.",
          done_early: "Look at you. Ahead of schedule.",
        };
        setCheckInFeedback(feedbackMap[type]);
        setTimeout(() => setCheckInFeedback(null), 4000);
      }, 500);
      return;
    }

    const result = await submitCheckIn(vow.vowId, type);
    setCheckingIn(false);

    if (result.success) {
      setLastCheckIn(new Date().toISOString());
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const feedbackMap: Record<CheckInType, string> = {
        on_track: "Keep it up. You're doing this.",
        struggling: "Rough days count too. Stay in the fight.",
        done_early: "Look at you. Ahead of schedule.",
      };
      setCheckInFeedback(feedbackMap[type]);
      setTimeout(() => setCheckInFeedback(null), 4000);
    } else {
      Alert.alert('Check-in failed', 'Please try again.');
    }
  }, [checkingIn, canCheckIn, vow.vowId, checkInScaleOn, checkInScaleStruggle, checkInScaleDone]);

  const witnessWebUrl = vow.witnessInviteToken
    ? `https://unbreakablevow.app/w/${vow.witnessInviteToken}`
    : null;

  const handleViewWitnessScreen = useCallback(() => {
    if (witnessWebUrl) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(witnessWebUrl);
    }
  }, [witnessWebUrl]);

  const witnessMessages = useMemo(() => [
    { label: `Report to ${vow.witnessName}`, emoji: '📣', subtext: 'Send a quick update' },
    { label: `Tell ${vow.witnessName} you crushed it`, emoji: '💪', subtext: "They're rooting for you" },
    { label: `Prove it to ${vow.witnessName}`, emoji: '🔥', subtext: 'Actions speak louder' },
    { label: `${vow.witnessName} is waiting`, emoji: '👀', subtext: 'Don\'t leave them hanging' },
    { label: `Confess to ${vow.witnessName}`, emoji: '🫣', subtext: 'Honesty builds trust' },
    { label: `${vow.witnessName} demands proof`, emoji: '⚡', subtext: 'Show, don\'t tell' },
    { label: `Check in with ${vow.witnessName}`, emoji: '🤝', subtext: 'Accountability is a two-way street' },
    { label: `Update ${vow.witnessName}`, emoji: '📱', subtext: 'A quick text goes a long way' },
  ], [vow.witnessName]);

  const todaysMessage = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % witnessMessages.length;
    return witnessMessages[dayIndex];
  }, [witnessMessages]);

  const witnessInitial = useMemo(() => {
    return (vow.witnessName || '?').charAt(0).toUpperCase();
  }, [vow.witnessName]);

  const witnessBtnScale = useRef(new Animated.Value(1)).current;
  const witnessGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(witnessGlowAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(witnessGlowAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const handleShareProgress = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const stakeLabel = vow.stake.amount ? `$${vow.stake.amount}` : '';
    const msg = `I'm ${daysLeft ?? 0} days into my vow: "${activeVowText}"${stakeLabel ? ` — ${stakeLabel} on the line` : ''}. Holding strong 💪`;
    try {
      await Share.share({ message: msg });
    } catch {
      console.log('[LiveScreen] share progress failed');
    }
  }, [activeVowText, vow.stake.amount, daysLeft]);

  const getCountdownTint = useCallback((days: number | null): { bg: string; border: string; accent: string } => {
    if (days === null) return { bg: 'rgba(82,214,154,0.06)', border: 'rgba(82,214,154,0.18)', accent: palette.success };
    if (days <= 0) return { bg: 'rgba(255,123,123,0.10)', border: 'rgba(255,123,123,0.25)', accent: palette.danger };
    if (days === 1) return { bg: 'rgba(255,180,80,0.10)', border: 'rgba(255,180,80,0.25)', accent: '#FFB450' };
    if (days <= 3) return { bg: 'rgba(212,162,79,0.08)', border: 'rgba(212,162,79,0.20)', accent: palette.warmAmber };
    return { bg: 'rgba(82,214,154,0.06)', border: 'rgba(82,214,154,0.18)', accent: palette.success };
  }, []);

  const dailyNudge = useMemo(() => getDailyNudge(), []);

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

  const cheekyLabels = useMemo(() => [
    `Report to ${vow.witnessName}`,
    `Text ${vow.witnessName} an update`,
    `Prove it to ${vow.witnessName}`,
    `${vow.witnessName}'s watching. Say something.`,
    `Confess to ${vow.witnessName}`,
    `${vow.witnessName} demands an update`,
  ], [vow.witnessName]);

  const todaysLabel = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % cheekyLabels.length;
    return cheekyLabels[dayIndex];
  }, [cheekyLabels]);

  const handleTextWitness = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const phone = vow.phoneNumber;
    const stakeLabel = vow.stake.amount ? `$${vow.stake.amount}` : '';
    const body = encodeURIComponent(
      `Still holding my vow: "${activeVowText}"${stakeLabel ? ` — ${stakeLabel} on the line` : ''}. Just checking in 👀`
    );
    if (phone) {
      const smsUrl = Platform.OS === 'ios'
        ? `sms:${phone}&body=${body}`
        : `sms:${phone}?body=${body}`;
      console.log('[LiveScreen] opening SMS to witness:', smsUrl);
      Linking.openURL(smsUrl).catch(() => {
        console.log('[LiveScreen] failed to open SMS');
      });
    } else {
      Share.share({ message: `Checking in on my vow: "${activeVowText}"` }).catch(() => {
        console.log('[LiveScreen] share failed');
      });
    }
  }, [vow.phoneNumber, vow.stake.amount, activeVowText]);

  const renderVowActiveCard = () => {
    const tint = getCountdownTint(daysLeft);
    const witnessLabel = isSelfWitness
      ? "You're the judge"
      : `${vow.witnessName} is watching`;

    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={{ opacity: fadeInAnim }}>
        <View style={[
          styles.countdownCard,
          { backgroundColor: tint.bg, borderColor: tint.border },
        ]}>
          <Text style={styles.countdownBig}>{countdownLabel ?? 'Vow active'}</Text>

          <View style={styles.progressBarWrap}>
            <View style={styles.progressBarBg}>
              <Animated.View style={[
                styles.progressBarFill,
                { width: progressWidth, backgroundColor: progressColor },
              ]} />
            </View>
            <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
          </View>

          <Text style={styles.countdownDate}>Verdict day: {dates.endLabel}</Text>

          <View style={styles.witnessRow}>
            <View style={[styles.witnessDot, { backgroundColor: tint.accent }]} />
            <Text style={[styles.witnessText, { color: tint.accent }]}>{witnessLabel}</Text>
          </View>
        </View>

        <View style={styles.checkInSection}>
          <Text style={styles.checkInTitle}>How's it going?</Text>
          {checkInFeedback ? (
            <View style={styles.checkInFeedbackWrap}>
              <Sparkles color={palette.goldBright} size={14} />
              <Text style={styles.checkInFeedbackText}>{checkInFeedback}</Text>
            </View>
          ) : !canCheckIn ? (
            <Text style={styles.checkInCooldownText}>{checkInCooldownLabel}</Text>
          ) : (
            <View style={styles.checkInButtons}>
              <Animated.View style={[styles.checkInBtnWrap, { transform: [{ scale: checkInScaleOn }] }]}>
                <Pressable
                  style={[styles.checkInBtn, styles.checkInBtnOnTrack]}
                  onPress={() => { void handleCheckIn('on_track'); }}
                  disabled={checkingIn || !canCheckIn}
                  testID="live-checkin-ontrack"
                >
                  <ThumbsUp color={palette.success} size={18} />
                  <Text style={[styles.checkInBtnLabel, { color: palette.success }]}>On track</Text>
                </Pressable>
              </Animated.View>

              <Animated.View style={[styles.checkInBtnWrap, { transform: [{ scale: checkInScaleStruggle }] }]}>
                <Pressable
                  style={[styles.checkInBtn, styles.checkInBtnStruggling]}
                  onPress={() => { void handleCheckIn('struggling'); }}
                  disabled={checkingIn || !canCheckIn}
                  testID="live-checkin-struggling"
                >
                  <Flame color={palette.warmAmber} size={18} />
                  <Text style={[styles.checkInBtnLabel, { color: palette.warmAmber }]}>Struggling</Text>
                </Pressable>
              </Animated.View>

              <Animated.View style={[styles.checkInBtnWrap, { transform: [{ scale: checkInScaleDone }] }]}>
                <Pressable
                  style={[styles.checkInBtn, styles.checkInBtnDone]}
                  onPress={() => { void handleCheckIn('done_early'); }}
                  disabled={checkingIn || !canCheckIn}
                  testID="live-checkin-done"
                >
                  <Trophy color={palette.goldBright} size={18} />
                  <Text style={[styles.checkInBtnLabel, { color: palette.goldBright }]}>Done early</Text>
                </Pressable>
              </Animated.View>
            </View>
          )}
        </View>

        <View style={styles.nudgeWrap}>
          <Text style={styles.nudgeText}>{dailyNudge}</Text>
        </View>

        {!isSelfWitness ? (
          <View style={styles.witnessConnectionCard}>
            <View style={styles.witnessConnectionHeader}>
              <View style={styles.witnessAvatarWrap}>
                <Animated.View style={[
                  styles.witnessAvatarGlow,
                  { opacity: witnessGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] }) },
                ]} />
                <View style={styles.witnessAvatar}>
                  <Text style={styles.witnessAvatarText}>{witnessInitial}</Text>
                </View>
                <View style={styles.witnessOnlineDot} />
              </View>
              <View style={styles.witnessConnectionInfo}>
                <Text style={styles.witnessConnectionName}>{vow.witnessName}</Text>
                <Text style={styles.witnessConnectionRole}>Your witness</Text>
              </View>
              <Text style={styles.witnessConnectionEmoji}>{todaysMessage.emoji}</Text>
            </View>

            <View style={styles.witnessConnectionDivider} />

            <Animated.View style={{ transform: [{ scale: witnessBtnScale }] }}>
              <Pressable
                style={({ pressed }) => [styles.smsActionBtn, pressed && styles.smsActionBtnPressed]}
                onPress={() => {
                  Animated.sequence([
                    Animated.timing(witnessBtnScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
                    Animated.spring(witnessBtnScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 15 }),
                  ]).start();
                  handleTextWitness();
                }}
                testID="live-text-witness"
              >
                <MessageCircle color="#0B0D11" size={18} />
                <Text style={styles.smsActionBtnText}>{todaysMessage.label}</Text>
              </Pressable>
            </Animated.View>
            <Text style={styles.witnessSubtext}>{todaysMessage.subtext}</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.shareProgressBtn, pressed && styles.shareProgressBtnPressed]}
            onPress={() => { void handleShareProgress(); }}
            testID="live-share-progress"
          >
            <Share2 color={palette.goldBright} size={16} />
            <Text style={styles.shareProgressBtnText}>Share your progress</Text>
          </Pressable>
        )}
      </Animated.View>
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

    if (phase === 'witness_pending') {
      return (
        <View style={styles.statusBadgeWrap}>
          <View style={styles.statusBadgeRow}>
            <Animated.View style={[styles.statusPulse, styles.pendingPulse, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.pendingBadge}>
              <View style={styles.pendingDot} />
              <Text style={styles.pendingBadgeText}>VOW PENDING</Text>
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
      <>
        <Pressable
          style={({ pressed }) => [styles.dashboardLink, pressed && styles.dashboardLinkPressed]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/dashboard');
          }}
          testID="live-my-vows"
        >
          <Layout color={palette.textSecondary} size={16} />
          <Text style={styles.dashboardLinkText}>My Vows</Text>
          <ChevronRight color={palette.textMuted} size={16} />
        </Pressable>
        {IS_EXPO_GO && phase === 'vow_active' && (
          <Pressable style={styles.testSkipBtn} onPress={handleFastForward} testID="live-fast-forward">
            <FastForward color={palette.warmAmber} size={14} />
            <Text style={styles.testSkipText}>Fast-forward to verdict (test mode)</Text>
          </Pressable>
        )}
      </>
    );
  };

  return (
    <RitualScreen footer={renderFooter()}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Back button when navigated from dashboard */}
      {searchParams.vowId && (
        <Pressable
          style={styles.backRow}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          hitSlop={8}
        >
          <ChevronLeft color={palette.textSecondary} size={20} />
          <Text style={styles.backText}>My Vows</Text>
        </Pressable>
      )}

      {renderBadge()}

      <TitleBlock
        title={activeVowText}
        subtitle={`$${vow.stake.amount} at stake \u00B7 Goes to ${brokenTarget} if broken`}
      />

      {/* Share banner for witnessed vows */}
      {!isSelfWitness && !witnessAccepted && !shareBannerDismissed && vow.witnessName && (
        <View style={styles.shareBanner}>
          <View style={styles.shareBannerContent}>
            <Text style={styles.shareBannerText}>Send your vow to {vow.witnessName}</Text>
            <View style={styles.shareBannerActions}>
              <Pressable
                onPress={async () => {
                  const witnessUrl = vow.witnessInviteToken ? `https://unbreakablevow.app/w/${vow.witnessInviteToken}` : '';
                  if (witnessUrl) {
                    try {
                      await Share.share({
                        message: `I just made a vow: "${activeVowText}" — I picked you to hold me accountable. Tap here to accept: ${witnessUrl}`,
                      });
                    } catch {}
                  }
                }}
                style={styles.shareBannerBtn}
              >
                <Share2 color="#0B0D11" size={14} />
                <Text style={styles.shareBannerBtnText}>Share</Text>
              </Pressable>
              <Pressable onPress={() => setShareBannerDismissed(true)} hitSlop={8}>
                <X color={palette.textMuted} size={16} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {phase === 'witness_pending' && renderWitnessPendingCard()}
      {phase === 'vow_active' && renderVowActiveCard()}
      {phase === 'verdict_due' && renderVerdictDueCard()}

      {witnessWebUrl && !isSelfWitness && witnessAccepted && (
        <Pressable style={styles.witnessLinkRow} onPress={handleViewWitnessScreen}>
          <ExternalLink color={palette.goldBright} size={16} />
          <Text style={styles.witnessLinkText}>View witness screen</Text>
        </Pressable>
      )}
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    alignSelf: 'flex-start' as const,
    paddingVertical: 4,
    marginBottom: 4,
  },
  backText: {
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  statusBadgeWrap: {
    alignItems: 'center' as const,
  },
  statusBadgeRow: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statusPulse: {
    position: 'absolute' as const,
    width: 60,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(82,214,154,0.1)',
  },
  pendingPulse: {
    backgroundColor: 'rgba(212,162,79,0.1)',
  },
  pendingBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(212,162,79,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.2)',
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.goldBright,
  },
  pendingBadgeText: {
    color: palette.goldBright,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
  pendingCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    padding: 20,
    gap: 14,
  },
  pendingIconRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
    alignItems: 'center' as const,
    paddingVertical: 4,
  },
  goSoloText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  declinedActions: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  declinedActionBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
  countdownCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 10,
    alignItems: 'center' as const,
  },
  countdownBig: {
    color: palette.text,
    fontSize: 32,
    fontWeight: '800' as const,
    fontFamily: serifFont,
    letterSpacing: -0.5,
  },
  progressBarWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    width: '100%' as const,
    paddingHorizontal: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  progressPercent: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
    minWidth: 32,
    textAlign: 'right' as const,
  },
  countdownDate: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  witnessRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 2,
  },
  witnessDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  witnessText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  checkInSection: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: 14,
  },
  checkInTitle: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  checkInButtons: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  checkInBtnWrap: {
    flex: 1,
  },
  checkInBtn: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  checkInBtnOnTrack: {
    backgroundColor: 'rgba(82,214,154,0.06)',
    borderColor: 'rgba(82,214,154,0.18)',
  },
  checkInBtnStruggling: {
    backgroundColor: 'rgba(212,162,79,0.06)',
    borderColor: 'rgba(212,162,79,0.18)',
  },
  checkInBtnDone: {
    backgroundColor: 'rgba(240,200,110,0.06)',
    borderColor: 'rgba(240,200,110,0.18)',
  },
  checkInBtnLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  checkInFeedbackWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 8,
  },
  checkInFeedbackText: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '600' as const,
    fontStyle: 'italic' as const,
  },
  checkInCooldownText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  nudgeWrap: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  nudgeText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontStyle: 'italic' as const,
    lineHeight: 18,
    textAlign: 'center' as const,
  },
  witnessConnectionCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    padding: 18,
    gap: 14,
  },
  witnessConnectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  witnessAvatarWrap: {
    position: 'relative' as const,
  },
  witnessAvatarGlow: {
    position: 'absolute' as const,
    top: -4,
    left: -4,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.goldGlow,
  },
  witnessAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,162,79,0.15)',
    borderWidth: 2,
    borderColor: palette.goldBright,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  witnessAvatarText: {
    color: palette.goldBright,
    fontSize: 18,
    fontWeight: '800' as const,
    fontFamily: serifFont,
  },
  witnessOnlineDot: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.success,
    borderWidth: 2,
    borderColor: palette.surface,
  },
  witnessConnectionInfo: {
    flex: 1,
    gap: 2,
  },
  witnessConnectionName: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  witnessConnectionRole: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  witnessConnectionEmoji: {
    fontSize: 24,
  },
  witnessConnectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: -2,
  },
  smsActionBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: palette.goldBright,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  smsActionBtnPressed: {
    opacity: 0.9,
  },
  smsActionBtnText: {
    color: '#0B0D11',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  witnessSubtext: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
    marginTop: -4,
  },
  shareProgressBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: 'rgba(212,162,79,0.06)',
  },
  shareProgressBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  shareProgressBtnText: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  verdictCard: {
    backgroundColor: 'rgba(212,162,79,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    padding: 24,
    gap: 8,
    alignItems: 'center' as const,
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
  witnessLinkRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(212,162,79,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.15)',
  },
  witnessLinkText: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  dashboardLink: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  dashboardLinkPressed: {
    opacity: 0.8,
    backgroundColor: palette.surfaceElevated,
  },
  dashboardLinkText: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  testSkipBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(212,162,79,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.15)',
    borderStyle: 'dashed' as const,
  },
  testSkipText: {
    color: palette.warmAmber,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  shareBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: 'rgba(212,162,79,0.08)',
    padding: 14,
  },
  shareBannerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  shareBannerText: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  shareBannerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  shareBannerBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: palette.goldBright,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  shareBannerBtnText: {
    color: '#0B0D11',
    fontSize: 13,
    fontWeight: '700' as const,
  },
});

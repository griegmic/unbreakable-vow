import * as Calendar from 'expo-calendar';
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { AlertCircle, Check, CheckCircle2, MessageCircle, Shield } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualCard, RitualScreen, SecondaryButton, TitleBlock } from '@/components/vow-ui';
import { palette, serifFont } from '@/constants/unbreakable';
import { acceptWitnessInvite, declineWitnessInvite, getVowByWitnessToken, type WitnessVowData } from '@/lib/vow-api';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

type ScreenState = 'loading' | 'invite' | 'accepted' | 'declined' | 'already_accepted' | 'error';

export default function WitnessInviteScreen() {
  const { displayName } = useAuth();
  const { activeVowText, vow } = useVowFlow();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = params.token;

  const [screenState, setScreenState] = useState<ScreenState>(token ? 'loading' : 'invite');
  const [remoteVow, setRemoteVow] = useState<WitnessVowData | null>(null);
  const [sworn, setSworn] = useState<boolean>(false);
  const [accepting, setAccepting] = useState<boolean>(false);
  const [declining, setDeclining] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const isRemote = !!token;
  const vowText = isRemote ? (remoteVow?.refined_text ?? '') : activeVowText;
  const stakeAmount = isRemote ? ((remoteVow?.stake_amount ?? 0) / 100) : vow.stake.amount;
  const makerName = isRemote ? (remoteVow?.user_display_name || 'Your friend') : (displayName || 'Your friend');
  const consequence = isRemote ? (remoteVow?.consequence ?? 'charity') : vow.stake.consequence;
  const destination = isRemote ? (remoteVow?.destination ?? '') : vow.stake.destination;
  const brokenTarget = destination;

  const verdictDate = isRemote && remoteVow?.ends_at
    ? new Date(remoteVow.ends_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  console.log('[WitnessInviteScreen] token:', token, 'isRemote:', isRemote, 'screenState:', screenState);

  useEffect(() => {
    if (!token) return;

    async function loadVow() {
      console.log('[WitnessInviteScreen] fetching vow by token:', token);
      const result = await getVowByWitnessToken(token!);

      if (!result.success || !result.vow) {
        console.log('[WitnessInviteScreen] vow not found:', result.error);
        setErrorMsg(result.error || 'This vow link is no longer valid.');
        setScreenState('error');
        return;
      }

      console.log('[WitnessInviteScreen] vow loaded:', result.vow.id);
      setRemoteVow(result.vow);

      if (result.vow.witness_accepted_at) {
        setScreenState('already_accepted');
      } else if (result.vow.witness_declined) {
        setErrorMsg('This invite has been declined.');
        setScreenState('error');
      } else {
        setScreenState('invite');
      }
    }

    void loadVow();
  }, [token]);

  const checkboxScale = useRef(new Animated.Value(1)).current;
  const swearGlow = useRef(new Animated.Value(0)).current;

  const handleSwear = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSworn(true);
    Animated.parallel([
      Animated.timing(swearGlow, { toValue: 1, duration: 600, useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(checkboxScale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
        Animated.spring(checkboxScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
      ]),
    ]).start();
  };

  const handleUnswear = () => {
    void Haptics.selectionAsync();
    setSworn(false);
    Animated.timing(swearGlow, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  };

  const handleAccept = useCallback(async () => {
    if (accepting) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (!isRemote) {
      router.push('/live');
      return;
    }

    if (!remoteVow) return;
    setAccepting(true);

    const result = await acceptWitnessInvite(token!);
    setAccepting(false);

    if (result.success) {
      console.log('[WitnessInviteScreen] witness accepted successfully');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScreenState('accepted');
    } else {
      Alert.alert('Something went wrong', result.error || 'Please try again.');
    }
  }, [accepting, isRemote, remoteVow]);

  const handleDecline = useCallback(async () => {
    if (!isRemote) {
      router.back();
      return;
    }

    if (!remoteVow) {
      router.back();
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Decline this invite?',
      `${makerName} chose you to hold them accountable. Are you sure?`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setDeclining(true);
            const result = await declineWitnessInvite(token!);
            setDeclining(false);
            if (result.success) {
              setScreenState('declined');
            } else {
              Alert.alert('Something went wrong', result.error || 'Please try again.');
            }
          },
        },
      ],
    );
  }, [isRemote, remoteVow, makerName]);

  const swearBorderColor = swearGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.border, palette.borderStrong],
  });

  const swearBgOpacity = swearGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.06],
  });

  if (screenState === 'loading') {
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredWrap}>
          <ActivityIndicator size="large" color={palette.goldBright} />
          <Text style={styles.loadingText}>Loading vow...</Text>
        </View>
      </RitualScreen>
    );
  }

  if (screenState === 'error') {
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredWrap}>
          <View style={styles.errorIconWrap}>
            <AlertCircle color={palette.warmAmber} size={32} />
          </View>
          <Text style={styles.errorTitle}>Vow not found</Text>
          <Text style={styles.errorBody}>{errorMsg}</Text>
        </View>
      </RitualScreen>
    );
  }

  // SMS helper
  const sendSms = (phone: string | null | undefined, body: string) => {
    const encoded = encodeURIComponent(body);
    const sep = Platform.OS === 'android' ? '?' : '&';
    if (phone) {
      const cleanPhone = phone.replace(/[^\d+\-]/g, '');
      void Linking.openURL(`sms:${cleanPhone}${sep}body=${encoded}`);
    } else {
      void Linking.openURL(`sms:${sep}body=${encoded}`);
    }
  };

  const handleAddToNativeCalendar = async () => {
    if (!remoteVow?.ends_at) return;
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Calendar access needed', 'Allow calendar access in Settings to add a reminder.');
        return;
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCal = calendars.find((c) => c.allowsModifications) || calendars[0];
      if (!defaultCal) {
        Alert.alert('No calendar found', 'Could not find a writable calendar on this device.');
        return;
      }
      const endDate = new Date(remoteVow.ends_at);
      endDate.setHours(9, 0, 0, 0);
      await Calendar.createEventAsync(defaultCal.id, {
        title: `Deliver your verdict — ${makerName}'s vow`,
        startDate: endDate,
        endDate: new Date(endDate.getTime() + 30 * 60 * 1000),
        notes: `Time to decide: did ${makerName} keep their vow?\n"${remoteVow.refined_text}"`,
        alarms: [{ relativeOffset: -15 }],
      });
      Alert.alert('Added!', 'Calendar reminder set for verdict day.');
    } catch (err) {
      console.error('[WitnessInvite] calendar error:', err);
      Alert.alert('Calendar error', 'Could not add to calendar. Please try again.');
    }
  };

  // Elapsed computation for time-based nudges
  const getElapsed = (): number => {
    if (!remoteVow?.starts_at || !remoteVow?.ends_at) return 0;
    const start = new Date(remoteVow.starts_at).getTime();
    const end = new Date(remoteVow.ends_at).getTime();
    if (end <= start) return 0;
    return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
  };

  const getNudgeCopy = (elapsed: number): { cta: string; sms: string } => {
    if (elapsed < 0.15) return { cta: `Send ${makerName} a message`, sms: "How's the vow going?" };
    if (elapsed < 0.85) return { cta: `Check in on ${makerName}`, sms: "Still keeping the vow? I'm paying attention." };
    return { cta: `The clock is ticking — message ${makerName}`, sms: 'Almost verdict time. You good?' };
  };

  if (screenState === 'accepted') {
    const makerPhone = remoteVow?.maker_phone ?? null;
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredWrap}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 color={palette.success} size={36} />
          </View>
          <Text style={styles.successTitle}>You're locked in.</Text>
          <Text style={styles.successBody}>
            {makerName} is counting on your honesty. You'll deliver your verdict{verdictDate ? ` on ${verdictDate}` : ' when time\'s up'}.
          </Text>

          {/* Vow quote */}
          <RitualCard>
            <Text style={styles.sectionLabel}>THE VOW</Text>
            <Text style={styles.vowTextStyle}>{vowText}</Text>
          </RitualCard>

          {/* Primary CTA: Tell them you're watching */}
          {makerPhone ? (
            <Pressable
              onPress={() => sendSms(makerPhone, "Just accepted your vow. I'm watching.")}
              style={styles.goldButton}
            >
              <MessageCircle color="#0B0D11" size={18} />
              <Text style={styles.goldButtonText}>Tell {makerName} you're watching</Text>
            </Pressable>
          ) : null}

          {/* Secondary: Calendar reminder */}
          <Pressable onPress={handleAddToNativeCalendar} style={styles.outlinedButton}>
            <Text style={styles.outlinedButtonText}>Remind me on verdict day</Text>
          </Pressable>

          {/* Tertiary: Viral CTA */}
          <Pressable
            onPress={() => Linking.openURL('https://unbreakablevow.app/?new=1')}
            style={styles.outlinedButton}
          >
            <Text style={styles.outlinedButtonText}>Your turn — what will you commit to?</Text>
          </Pressable>
        </View>
      </RitualScreen>
    );
  }

  if (screenState === 'already_accepted') {
    const elapsed = getElapsed();
    const makerPhone = remoteVow?.maker_phone ?? null;

    // Check if verdict is due
    const nowMs = Date.now();
    const endMs = remoteVow?.ends_at ? new Date(remoteVow.ends_at).getTime() : 0;
    const isVerdictDue = endMs > 0 && nowMs >= endMs;

    if (isVerdictDue) {
      return (
        <RitualScreen>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.centeredWrap}>
            <View style={styles.successIconWrap}>
              <CheckCircle2 color={palette.goldBright} size={36} />
            </View>
            <Text style={styles.successTitle}>Time's up.</Text>
            <Text style={styles.successBody}>
              Did {makerName} keep their word? Your call.
            </Text>

            <RitualCard>
              <Text style={styles.sectionLabel}>THE VOW</Text>
              <Text style={styles.vowTextStyle}>{vowText}</Text>
            </RitualCard>

            <Pressable
              onPress={() => Linking.openURL(`https://unbreakablevow.app/w/${token}/verdict`)}
              style={styles.goldButton}
            >
              <Text style={styles.goldButtonText}>Deliver your verdict</Text>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL('https://unbreakablevow.app/?new=1')}
              style={styles.outlinedButton}
            >
              <Text style={styles.outlinedButtonText}>Your turn — what will you commit to?</Text>
            </Pressable>
          </View>
        </RitualScreen>
      );
    }

    // Return visit — active vow
    const nudge = getNudgeCopy(elapsed);
    const progressPct = Math.round(elapsed * 100);

    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredWrap}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 color={palette.success} size={36} />
          </View>
          <Text style={styles.successTitle}>You're watching.</Text>
          <Text style={styles.successBody}>
            {makerName} is counting on your honesty.
          </Text>

          <RitualCard>
            <Text style={styles.sectionLabel}>THE VOW</Text>
            <Text style={styles.vowTextStyle}>{vowText}</Text>
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.progressLabel}>{progressPct}%</Text>
            </View>
          </RitualCard>

          {/* Primary CTA: Text the maker */}
          {makerPhone ? (
            <Pressable
              onPress={() => sendSms(makerPhone, nudge.sms)}
              style={styles.goldButton}
            >
              <MessageCircle color="#0B0D11" size={16} />
              <Text style={styles.goldButtonText}>{nudge.cta}</Text>
            </Pressable>
          ) : null}

          {/* Secondary: Calendar reminder */}
          <Pressable onPress={handleAddToNativeCalendar} style={styles.outlinedButton}>
            <Text style={styles.outlinedButtonText}>Remind me on verdict day</Text>
          </Pressable>

          {/* Tertiary: Viral CTA */}
          <Pressable
            onPress={() => Linking.openURL('https://unbreakablevow.app/?new=1')}
            style={styles.outlinedButton}
          >
            <Text style={styles.outlinedButtonText}>Your turn — what will you commit to?</Text>
          </Pressable>
        </View>
      </RitualScreen>
    );
  }

  if (screenState === 'declined') {
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredWrap}>
          <Text style={styles.declinedTitle}>Invite declined</Text>
          <Text style={styles.declinedBody}>
            {makerName} will be notified so they can find another witness.
          </Text>
        </View>
      </RitualScreen>
    );
  }

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label={accepting ? 'Accepting...' : 'I accept \u2014 hold them to it'}
            onPress={handleAccept}
            disabled={!sworn || accepting}
            testID="witness-invite-accept"
          />
          <SecondaryButton
            label={declining ? 'Declining...' : 'Decline'}
            onPress={handleDecline}
            testID="witness-invite-decline"
          />
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.badgeWrap}>
        <View style={styles.badge}>
          <Shield color={palette.goldBright} size={16} />
          <Text style={styles.badgeText}>YOU'VE BEEN CHOSEN AS A WITNESS</Text>
        </View>
      </View>

      <TitleBlock
        title={`${makerName} made a vow and named you as their witness.`}
        subtitle="Real money is on the line. Your job: decide if they kept their word."
      />

      <RitualCard>
        <Text style={styles.sectionLabel}>THE VOW</Text>
        <Text style={styles.vowTextStyle}>{vowText}</Text>
        <View style={styles.rule} />
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>At stake</Text>
          <Text style={styles.metaValueGold}>${stakeAmount}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>If broken</Text>
          <Text style={styles.metaValue}>${stakeAmount} goes to {brokenTarget}</Text>
        </View>
      </RitualCard>

      <RitualCard>
        <Text style={styles.whatTitle}>What happens when you accept</Text>
        <View style={styles.stepRow}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
          <Text style={styles.stepText}>You'll get an SMS when it's verdict time.</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
          <Text style={styles.stepText}>No daily check-ins — just be aware of the vow.</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
          <Text style={styles.stepText}>{verdictDate ? `On ${verdictDate}` : 'When time\'s up'}: kept or broken. One tap.</Text>
        </View>
      </RitualCard>

      <Animated.View style={[styles.swearCard, { borderColor: swearBorderColor }]}>
        <Animated.View style={[styles.swearGlowBg, { opacity: swearBgOpacity }]} />
        <Pressable
          onPress={sworn ? handleUnswear : handleSwear}
          style={styles.swearRow}
          testID="witness-invite-swear"
        >
          <Animated.View style={[styles.checkbox, sworn && styles.checkboxChecked, { transform: [{ scale: checkboxScale }] }]}>
            {sworn ? <Check color="#0B0D11" size={14} strokeWidth={3} /> : null}
          </Animated.View>
          <View style={styles.swearCopy}>
            <Text style={styles.swearTitle}>I solemnly swear</Text>
            <Text style={styles.swearText}>
              to judge honestly and deliver a fair verdict.
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  centeredWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.warmAmberMuted,
    borderWidth: 1,
    borderColor: palette.warmAmberBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  errorBody: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center' as const,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.successMuted,
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    textAlign: 'center' as const,
  },
  successBody: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center' as const,
  },
  declinedTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  declinedBody: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center' as const,
  },
  badgeWrap: {
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(212,162,79,0.08)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  badgeText: {
    color: palette.goldBright,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  sectionLabel: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.1,
  },
  vowTextStyle: {
    color: palette.text,
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '600' as const,
  },
  rule: {
    height: 1,
    backgroundColor: palette.border,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    color: palette.textMuted,
    fontSize: 13,
  },
  metaValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  metaValueGold: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  whatTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(212,162,79,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    color: palette.goldBright,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  stepText: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  swearCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    backgroundColor: palette.surface,
    overflow: 'hidden',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  swearGlowBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.goldBright,
  },
  swearRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: palette.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: palette.goldBright,
    borderColor: palette.goldBright,
  },
  swearCopy: {
    flex: 1,
    gap: 6,
  },
  swearTitle: {
    color: palette.goldBright,
    fontSize: 18,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    letterSpacing: -0.3,
  },
  swearText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  goldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: palette.goldBright,
    borderRadius: 18,
    paddingVertical: 16,
    width: '100%',
  },
  goldButtonText: {
    color: '#0B0D11',
    fontSize: 15,
    fontWeight: '800',
  },
  outlinedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
  },
  outlinedButtonText: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.gold,
  },
  progressLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
});

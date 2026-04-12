import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Check, Sparkles, Star } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, Share, StyleSheet, Text, View } from 'react-native';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

import AuthSheet from '@/components/auth-sheet';
import { BackButton, PrimaryButton, RitualCard, RitualScreen, SecondaryButton, TitleBlock } from '@/components/vow-ui';
import { getVowVerdictDate, palette, serifFont } from '@/constants/unbreakable';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { createPaymentIntent, setupPaymentSheet, showPaymentSheet } from '@/lib/stripe';
import { createVow, voidVowV2 } from '@/lib/vow-api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export default function SealScreen() {
  const { isAuthenticated, displayName } = useAuth();
  const { activeVowText, vow, setVowId, isSelfWitness } = useVowFlow();

  useEffect(() => {
    if (!vow.witnessName && vow.witnessType !== 'self') {
      router.replace('/witness');
    }
  }, [vow.witnessName, vow.witnessType]);

  const [sealed, setSealed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [paidVowId, setPaidVowId] = useState<string | null>(null);
  const [smsExpanded, setSmsExpanded] = useState<boolean>(false);
  const glow = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const oathFlashOpacity = useRef(new Animated.Value(0)).current;

  const [authSheetVisible, setAuthSheetVisible] = useState<boolean>(false);
  const pendingSealRef = useRef<boolean>(false);

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

  const hasWitnessPhone = !isSelfWitness && !!vow.phoneNumber;
  const smsPreview = useMemo(() => {
    if (!hasWitnessPhone) return '';
    const senderName = displayName || 'You';
    const stakeText = vow.stake.amount > 0
      ? `with $${vow.stake.amount} on the line`
      : 'accountability only — no money, just their word';
    const vowPreview = activeVowText.length > 100
      ? activeVowText.substring(0, 97) + '...'
      : activeVowText;
    return `${senderName} just made an Unbreakable Vow: "${vowPreview}" — ${stakeText}. You're the witness.`;
  }, [hasWitnessPhone, displayName, vow.stake.amount, activeVowText]);

  const sealLabel = loading
    ? 'Processing...'
    : hasWitnessPhone
      ? `Seal & text ${vow.witnessName}`
      : 'Seal this vow';

  const registerPush = useCallback(async () => {
    try {
      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken(token);
      }
    } catch (err) {
      console.log('[SealScreen] push registration failed:', err);
    }
  }, []);

  const playSealAnimation = () => {
    Animated.timing(glow, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSealed(true);

      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 10,
        }),
        Animated.sequence([
          Animated.timing(oathFlashOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(300),
          Animated.timing(oathFlashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]).start();

      setTimeout(async () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Auto-share witness invite link (same as QuickVow)
        if (!isSelfWitness && vow.witnessInviteToken) {
          const inviteUrl = `https://unbreakablevow.app/w/${vow.witnessInviteToken}`;
          try {
            await Share.share({
              message: `I just made a vow: "${activeVowText}" — I picked you to hold me accountable. Tap here to accept: ${inviteUrl}`,
            });
          } catch {}
        }
        router.push({ pathname: '/live', params: { justSealed: '1' } });
      }, 700);
    });
  };

  const invokeSealEdgeFunction = async (vowId: string) => {
    console.log('[SealScreen] invoking seal-vow edge function for:', vowId);
    const { data, error } = await supabase.functions.invoke('seal-vow', {
      body: { vow_id: vowId },
    });
    console.log('[SealScreen] seal-vow response:', { data, error: error ? JSON.stringify(error) : null });
    if (error) {
      // Do NOT fall back to direct DB write — that skips Stripe capture and causes
      // refund failures later. Propagate the error so the caller can retry or alert.
      throw new Error(`seal-vow failed: ${error.message || 'Unknown error'}`);
    }
  };

  const retrySeal = async (vowId: string) => {
    setLoading(true);
    try {
      await invokeSealEdgeFunction(vowId);
      setLoading(false);
      playSealAnimation();
    } catch (err) {
      console.error('[SealScreen] retry seal error:', err);
      setLoading(false);
      Alert.alert(
        'Still having trouble',
        'Your payment was captured. Please try again or contact support.',
        [
          { text: 'Try again', onPress: () => retrySeal(vowId) },
          { text: 'OK' },
        ],
      );
    }
  };

  const handleSealFlow = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (IS_EXPO_GO) {
      console.log('[SealScreen] Expo Go dev mode — creating real vow, skipping payment');
      try {
        const vowRecord = await createVow({
          rawInput: vow.rawInput,
          refinedText: activeVowText,
          witnessName: vow.witnessName,
          witnessPhone: vow.phoneNumber ? formatE164(vow.phoneNumber) : null,
          stakeAmount: vow.stake.amount,
          consequence: vow.stake.consequence,
          destination: vow.stake.destination,
          deadlineIso: vow.deadlineIso,
        });
        // Mark as active directly (skip payment — no fake Stripe IDs)
        await supabase.from('vows').update({
          status: 'active',
          sealed_at: new Date().toISOString(),
        }).eq('id', vowRecord.id);
        setVowId(vowRecord.id, vowRecord.witness_invite_token);
      } catch (err) {
        console.error('[SealScreen] Expo Go dev mode vow creation failed:', err);
        // Fallback to fake IDs if DB fails (e.g. no auth)
        setVowId('dev-' + Date.now(), 'dev-token-' + Date.now());
      }
      setLoading(false);
      playSealAnimation();
      return;
    }

    if (paidVowId) {
      await retrySeal(paidVowId);
      return;
    }

    let vowId: string | null = null;
    let paymentCaptured = false;

    try {
      console.log('[SealScreen] step 1: creating vow record');
      const vowRecord = await createVow({
        rawInput: vow.rawInput,
        refinedText: activeVowText,
        witnessName: vow.witnessName,
        witnessPhone: vow.phoneNumber ? formatE164(vow.phoneNumber) : null,
        stakeAmount: vow.stake.amount,
        consequence: vow.stake.consequence,
        destination: vow.stake.destination,
        deadlineIso: vow.deadlineIso,
      });
      vowId = vowRecord.id;
      console.log('[SealScreen] step 1 done, vowId:', vowId);
      setVowId(vowId, vowRecord.witness_invite_token);

      console.log('[SealScreen] step 2: creating payment intent');
      const { clientSecret } = await createPaymentIntent(vowId, vow.stake.amount * 100);
      console.log('[SealScreen] step 2 done, got clientSecret');

      console.log('[SealScreen] step 3: setup payment sheet');
      await setupPaymentSheet(clientSecret);
      console.log('[SealScreen] step 3 done');

      console.log('[SealScreen] step 4: showing payment sheet');
      const paid = await showPaymentSheet();

      if (!paid) {
        await voidVowV2(vowId).catch(() => {});
        setLoading(false);
        Alert.alert('Payment cancelled', 'No charge was made. You can try again whenever you\'re ready.');
        return;
      }

      paymentCaptured = true;
      setPaidVowId(vowId);

      await invokeSealEdgeFunction(vowId);

      setLoading(false);
      playSealAnimation();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[SealScreen] seal flow error:', errMsg);
      console.error('[SealScreen] full error:', JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Error ? err : {})));
      setLoading(false);
      if (paidVowId || paymentCaptured) {
        // Payment was captured — don't void, let user retry the seal step
        setPaidVowId(vowId || paidVowId);
        Alert.alert(
          'Almost there',
          `Your payment went through but we couldn't finish sealing. Tap "${sealLabel}" to try again.`,
        );
      } else {
        if (vowId) {
          await voidVowV2(vowId).catch(() => {});
        }
        Alert.alert('Something went wrong', errMsg || 'Please try again.');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, paidVowId, vow, activeVowText]);

  const handleSeal = async () => {
    if (loading) return;

    if (!isAuthenticated) {
      setAuthSheetVisible(true);
      return;
    }

    await handleSealFlow();
  };

  // Safety net: if auth state propagates after handleAuthSuccess sets the flag,
  // this effect catches it and triggers the seal flow.
  useEffect(() => {
    if (pendingSealRef.current && isAuthenticated) {
      pendingSealRef.current = false;
      void handleSealFlow();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleAuthSuccess = useCallback(async () => {
    console.log('[SealScreen] auth success, proceeding to seal');
    setAuthSheetVisible(false);
    await registerPush();
    // Mark intent to seal — the useEffect on isAuthenticated will trigger
    // handleSealFlow once the Supabase session has fully propagated.
    // If already authenticated, trigger directly.
    if (isAuthenticated) {
      void handleSealFlow();
    } else {
      pendingSealRef.current = true;
    }
  }, [registerPush, handleSealFlow, isAuthenticated]);

  const handleAuthDismiss = useCallback(() => {
    setAuthSheetVisible(false);
  }, []);

  const haloOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.55],
  });

  const ringBorderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.borderStrong, 'rgba(82,214,154,0.35)'],
  });

  return (
    <RitualScreen
      footer={
        sealed ? null : (
          <>
            <PrimaryButton label={sealLabel} onPress={handleSeal} disabled={loading} testID="seal-primary" />
            <SecondaryButton label="Back" onPress={() => router.back()} testID="seal-back" />
          </>
        )
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      {!sealed ? <BackButton /> : null}
      <TitleBlock
        title={sealed ? 'Sealed.' : 'Your Unbreakable Vow'}
        subtitle={sealed ? 'The terms are locked.' : 'No takebacks. No excuses.'}
      />

      <View style={styles.sealCenter}>
        <Animated.View style={[styles.sealHalo, { opacity: haloOpacity }]} />
        <Animated.View style={[styles.sealRing, { borderColor: ringBorderColor }]}>
          {sealed ? (
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <Check color={palette.success} size={20} />
            </Animated.View>
          ) : (
            <Star color={palette.goldBright} fill={palette.goldBright} size={18} />
          )}
        </Animated.View>
      </View>

      <RitualCard>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>THE VOW</Text>
          <Sparkles color={palette.goldBright} size={14} />
        </View>
        <Text style={styles.summaryText}>{activeVowText}</Text>
        <View style={styles.rule} />
        <View style={styles.twoCol}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>{isSelfWitness ? 'ACCOUNTABILITY' : 'WITNESS'}</Text>
            <Text style={styles.metaValue}>{isSelfWitness ? 'Self-judged' : vow.witnessName}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>AT STAKE</Text>
            <Text style={[styles.metaValue, styles.goldValue]}>${vow.stake.amount}</Text>
          </View>
        </View>
        <Text style={styles.verdictNote}>{dates.verdictLabel}</Text>
      </RitualCard>

      {/* SMS preview — what the witness will receive */}
      {!sealed && hasWitnessPhone ? (
        <View style={styles.smsPreviewCard}>
          <Pressable onPress={() => setSmsExpanded(!smsExpanded)} style={styles.smsPreviewRow}>
            <Text style={styles.smsPreviewSummary}>
              {vow.witnessName} will get a text with your vow and a link to accept
            </Text>
            <Text style={styles.smsExpandToggle}>{smsExpanded ? 'Hide' : 'Preview'}</Text>
          </Pressable>
          {smsExpanded ? (
            <Text style={styles.smsPreviewText}>{smsPreview}</Text>
          ) : null}
        </View>
      ) : null}

      {sealed ? (
        <Animated.View style={[styles.oathFlash, { opacity: oathFlashOpacity }]} pointerEvents="none">
          <Text style={styles.oathFlashText}>{activeVowText ? `"${activeVowText}"` : 'Your vow is sealed.'}</Text>
        </Animated.View>
      ) : null}

      {!sealed ? (
        <View style={styles.oathPassive}>
          <Text style={styles.oathPassiveText}>
            By sealing, you put your word — and your wallet — on the line.
          </Text>
          <Text style={styles.paymentNote}>Anyone can make a promise. You're about to back yours.</Text>
          {vow.stake.amount > 0 ? (
            <Text style={styles.paymentNote}>You'll confirm payment after tapping seal.</Text>
          ) : null}
        </View>
      ) : null}

      <AuthSheet
        visible={authSheetVisible}
        onDismiss={handleAuthDismiss}
        onAuthSuccess={handleAuthSuccess}
      />
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  sealCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  sealHalo: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 96,
    backgroundColor: palette.goldGlow,
  },
  sealRing: {
    width: 48,
    height: 48,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(212,162,79,0.06)',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.1,
  },
  summaryText: {
    color: palette.text,
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '600' as const,
  },
  rule: {
    height: 1,
    backgroundColor: palette.border,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  metaCell: {
    flex: 1,
    gap: 4,
  },
  metaLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  metaValue: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
  goldValue: {
    color: palette.goldBright,
    fontWeight: '800' as const,
  },
  oathPassive: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  oathPassiveText: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center' as const,
    fontFamily: serifFont,
    fontStyle: 'italic' as const,
  },
  paymentNote: {
    color: palette.textMuted,
    fontSize: 12,
    textAlign: 'center' as const,
  },
  verdictNote: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  smsPreviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.15)',
    backgroundColor: 'rgba(212,162,79,0.04)',
    padding: 14,
    gap: 8,
  },
  smsPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  smsPreviewSummary: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  smsExpandToggle: {
    color: palette.gold,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  smsPreviewText: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic' as const,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,162,79,0.1)',
  },
  oathFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,7,11,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    paddingHorizontal: 40,
  },
  oathFlashText: {
    color: palette.goldBright,
    fontSize: 26,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    textAlign: 'center' as const,
    lineHeight: 38,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(212,162,79,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
});

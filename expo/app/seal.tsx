import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Check, Sparkles, Star } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

import AuthSheet from '@/components/auth-sheet';
import { BackButton, PrimaryButton, RitualCard, RitualScreen, SecondaryButton, TitleBlock } from '@/components/vow-ui';
import { getVowVerdictDate, palette, serifFont } from '@/constants/unbreakable';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { createPaymentIntent, setupPaymentSheet, showPaymentSheet } from '@/lib/stripe';
import { createVow, sealVow, voidVow } from '@/lib/vow-api';
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
  const { isAuthenticated } = useAuth();
  const { activeVowText, vow, setVowId, isSelfWitness } = useVowFlow();

  useEffect(() => {
    if (!vow.witnessName && vow.witnessType !== 'self') {
      router.replace('/witness');
    }
  }, [vow.witnessName, vow.witnessType]);

  const [sworn, setSworn] = useState<boolean>(false);
  const [sealed, setSealed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [paidVowId, setPaidVowId] = useState<string | null>(null);
  const glow = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const swearGlow = useRef(new Animated.Value(0)).current;
  const checkboxScale = useRef(new Animated.Value(1)).current;
  const oathFlashOpacity = useRef(new Animated.Value(0)).current;

  const [authSheetVisible, setAuthSheetVisible] = useState<boolean>(false);
  const pendingSealRef = useRef<boolean>(false);

  const dates = getVowVerdictDate(vow.rawInput);

  const brokenLabel =
    isSelfWitness && vow.stake.consequence === 'witness'
      ? 'Donated to charity'
      : vow.stake.consequence === 'witness'
        ? `${vow.witnessName} gets it`
        : `Donated to ${vow.stake.destination}`;

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

  const playSealAnimation = () => {
    Animated.timing(glow, {
      toValue: 1,
      duration: 900,
      useNativeDriver: false,
    }).start(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSealed(true);

      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 8,
          bounciness: 14,
        }),
        Animated.sequence([
          Animated.timing(oathFlashOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.delay(600),
          Animated.timing(oathFlashOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();

      setTimeout(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/sent');
      }, 1600);
    });
  };

  const invokeSealEdgeFunction = async (vowId: string) => {
    console.log('[SealScreen] invoking seal-vow edge function for:', vowId);
    try {
      const { data, error } = await supabase.functions.invoke('seal-vow', {
        body: { vow_id: vowId },
      });
      console.log('[SealScreen] seal-vow response:', { data, error: error ? JSON.stringify(error) : null });
      if (error) {
        console.warn('[SealScreen] seal-vow edge function failed, falling back to direct seal:', error.message);
        await sealVow(vowId);
        console.log('[SealScreen] direct seal fallback succeeded');
      }
    } catch (invokeErr) {
      console.warn('[SealScreen] seal-vow invoke threw, falling back to direct seal:', invokeErr);
      await sealVow(vowId);
      console.log('[SealScreen] direct seal fallback succeeded after throw');
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
      console.log('[SealScreen] Expo Go dev mode — skipping backend, simulating seal');
      setVowId('dev-' + Date.now(), 'dev-token-' + Date.now());
      setLoading(false);
      playSealAnimation();
      return;
    }

    if (paidVowId) {
      await retrySeal(paidVowId);
      return;
    }

    let vowId: string | null = null;

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
        await voidVow(vowId);
        setLoading(false);
        Alert.alert('Payment cancelled', 'No charge was made. You can try again whenever you\'re ready.');
        return;
      }

      setPaidVowId(vowId);

      await invokeSealEdgeFunction(vowId);

      setLoading(false);
      playSealAnimation();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[SealScreen] seal flow error:', errMsg);
      console.error('[SealScreen] full error:', JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Error ? err : {})));
      setLoading(false);
      if (paidVowId || (vowId && vowId === paidVowId)) {
        Alert.alert(
          'Almost there',
          'Your payment went through but we couldn\'t finish sealing. Tap "Seal this vow" to try again.',
        );
      } else {
        if (vowId) {
          await voidVow(vowId).catch(() => {});
        }
        Alert.alert('Something went wrong', errMsg || 'Please try again.');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, paidVowId, vow, activeVowText]);

  const handleSeal = async () => {
    if (!sworn || loading) return;

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

  const swearBorderColor = swearGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.border, palette.borderStrong],
  });

  const swearBgOpacity = swearGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.06],
  });

  return (
    <RitualScreen
      footer={
        sealed ? null : (
          <>
            <PrimaryButton label={loading ? 'Processing...' : 'Seal this vow'} onPress={handleSeal} disabled={!sworn || loading} testID="seal-primary" />
            <SecondaryButton label="Back" onPress={() => router.back()} testID="seal-back" />
          </>
        )
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      {!sealed ? <BackButton /> : null}
      <TitleBlock
        title={sealed ? 'Sealed.' : 'Your Unbreakable Vow'}
        subtitle={sealed ? 'The terms are locked.' : 'Review below. Once sealed, terms are final.'}
      />

      <View style={styles.sealCenter}>
        <Animated.View style={[styles.sealHalo, { opacity: haloOpacity }]} />
        <Animated.View style={[styles.sealRing, { borderColor: ringBorderColor }]}>
          {sealed ? (
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <Check color={palette.success} size={30} />
            </Animated.View>
          ) : (
            <Star color={palette.goldBright} fill={palette.goldBright} size={26} />
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
        <View style={styles.twoCol}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>DURATION</Text>
            <Text style={styles.metaValue}>{dates.isCustomDate ? `Until ${dates.endLabel}` : '7 days'}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>IF BROKEN</Text>
            <Text style={styles.metaValue}>{brokenLabel}</Text>
          </View>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>VERDICT</Text>
          <Text style={styles.metaValue}>{isSelfWitness ? `You decide on ${dates.endLabel}` : `${vow.witnessName} decides on ${dates.endLabel}`}</Text>
        </View>
      </RitualCard>

      {sealed ? (
        <Animated.View style={[styles.oathFlash, { opacity: oathFlashOpacity }]} pointerEvents="none">
          <Text style={styles.oathFlashText}>I solemnly swear{"\n"}to keep my word this week.</Text>
        </Animated.View>
      ) : null}

      {!sealed ? (
        <Animated.View style={[styles.swearCard, { borderColor: swearBorderColor }]}>
          <Animated.View style={[styles.swearGlowBg, { opacity: swearBgOpacity }]} />
          <Pressable
            onPress={sworn ? handleUnswear : handleSwear}
            style={styles.swearRow}
            testID="seal-swear"
          >
            <Animated.View style={[styles.checkbox, sworn && styles.checkboxChecked, { transform: [{ scale: checkboxScale }] }]}>
              {sworn ? <Check color="#0B0D11" size={14} strokeWidth={3} /> : null}
            </Animated.View>
            <View style={styles.swearCopy}>
              <Text style={styles.swearTitle}>I solemnly swear</Text>
              <Text style={styles.swearText}>
                to honor this vow and accept the consequences.
              </Text>
            </View>
          </Pressable>
        </Animated.View>
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
    height: 110,
  },
  sealHalo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 200,
    backgroundColor: palette.goldGlow,
  },
  sealRing: {
    width: 100,
    height: 100,
    borderRadius: 100,
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

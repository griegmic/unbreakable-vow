import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Check, Mail, MoveRight, Phone, Sparkles, Star } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

import { BackButton, PrimaryButton, RitualCard, RitualScreen, SecondaryButton, TitleBlock } from '@/components/vow-ui';
import { getVowVerdictDate, palette, serifFont } from '@/constants/unbreakable';
import { type AuthResult, GOOGLE_SIGN_IN_AVAILABLE, sendEmailOtp, sendPhoneOtp, signInWithGoogle, verifyEmailOtp, verifyPhoneOtp } from '@/lib/auth';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { createPaymentIntent, setupPaymentSheet, showPaymentSheet } from '@/lib/stripe';
import { createVow, voidVow } from '@/lib/vow-api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

type AuthStep = 'pick' | 'phone' | 'phone-otp' | 'email' | 'email-otp';

const SHEET_HEIGHT = 420;

export default function SealScreen() {
  const { isAuthenticated } = useAuth();
  const { activeVowText, vow, setVowId, isSelfWitness } = useVowFlow();

  useEffect(() => {
    if (!vow.witnessName && vow.witnessType !== 'self') {
      console.log('[SealScreen] no witness set, redirecting');
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
  const [authStep, setAuthStep] = useState<AuthStep>('pick');
  const [authPhone, setAuthPhone] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authOtp, setAuthOtp] = useState<string>('');
  const [authLoading2, setAuthLoading2] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRef = useRef<TextInput>(null);
  const authSheetFade = useRef(new Animated.Value(0)).current;
  const pendingSealRef = useRef<boolean>(false);

  const dates = getVowVerdictDate(vow.rawInput);

  console.log('[SealScreen] rendering, sworn:', sworn, 'sealed:', sealed, 'isAuthenticated:', isAuthenticated);

  const brokenLabel =
    isSelfWitness && vow.stake.consequence === 'witness'
      ? 'Donated to charity'
      : vow.stake.consequence === 'witness'
        ? `${vow.witnessName} gets it`
        : `Donated to ${vow.stake.destination}`;

  const startCooldown = useCallback(() => {
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

  const dismissAuthSheet = useCallback(() => {
    Animated.timing(authSheetFade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setAuthSheetVisible(false);
      setAuthStep('pick');
      setAuthError('');
      setAuthOtp('');
    });
  }, [authSheetFade]);

  const showAuthSheet = useCallback(() => {
    setAuthSheetVisible(true);
    setAuthStep('pick');
    setAuthError('');
    setAuthOtp('');
    Animated.timing(authSheetFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [authSheetFade]);

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

  const handleAuthSuccess = useCallback(async () => {
    console.log('[SealScreen] auth success, proceeding to seal');
    await registerPush();
    dismissAuthSheet();
    pendingSealRef.current = true;
  }, [registerPush, dismissAuthSheet]);

  useEffect(() => {
    if (pendingSealRef.current && isAuthenticated) {
      pendingSealRef.current = false;
      console.log('[SealScreen] auth confirmed, auto-continuing seal');
      void handleSealFlow();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

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

  const retrySeal = async (vowId: string) => {
    setLoading(true);
    try {
      await supabase.functions.invoke('seal-vow', {
        body: { vow_id: vowId },
      });
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

  const handleSealFlow = async () => {
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
      setVowId(vowId, vowRecord.witness_invite_token);

      const { clientSecret } = await createPaymentIntent(vowId, vow.stake.amount * 100);

      await setupPaymentSheet(clientSecret);
      const paid = await showPaymentSheet();

      if (!paid) {
        await voidVow(vowId);
        setLoading(false);
        Alert.alert('Payment cancelled', 'No charge was made. You can try again whenever you\'re ready.');
        return;
      }

      setPaidVowId(vowId);

      await supabase.functions.invoke('seal-vow', {
        body: { vow_id: vowId },
      });

      setLoading(false);
      playSealAnimation();
    } catch (err) {
      console.error('[SealScreen] seal flow error:', err);
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
        Alert.alert('Something went wrong', 'Please try again.');
      }
    }
  };

  const handleSeal = async () => {
    if (!sworn || loading) return;

    if (!isAuthenticated) {
      showAuthSheet();
      return;
    }

    await handleSealFlow();
  };

  const handleGoogleAuth = async () => {
    if (authLoading2) return;
    if (!GOOGLE_SIGN_IN_AVAILABLE) {
      setAuthError('Google Sign-In is not available in this environment.');
      return;
    }
    setAuthLoading2('google');
    setAuthError('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const timeout = new Promise<AuthResult>((resolve) =>
      setTimeout(() => resolve({ success: false, error: 'Sign-in timed out. Please try again.' }), 30000)
    );
    const result = await Promise.race([signInWithGoogle(), timeout]);

    if (result.success) {
      await handleAuthSuccess();
    } else if (result.error !== 'Sign-in cancelled') {
      setAuthError(result.error || 'Please try again.');
    }
    setAuthLoading2(null);
  };

  const handleSendPhoneOtp = async () => {
    const digits = authPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      setAuthError('Please enter a valid phone number.');
      return;
    }
    if (authLoading2) return;
    setAuthLoading2('phone');
    setAuthError('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await sendPhoneOtp(authPhone);
    setAuthLoading2(null);

    if (result.success) {
      startCooldown();
      setAuthStep('phone-otp');
      setTimeout(() => otpRef.current?.focus(), 300);
    } else {
      setAuthError(result.error || 'Please try again.');
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (authOtp.length < 6) return;
    if (authLoading2) return;
    setAuthLoading2('otp');
    setAuthError('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await verifyPhoneOtp(authPhone, authOtp);
    setAuthLoading2(null);

    if (result.success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await handleAuthSuccess();
    } else {
      setAuthError(result.error || 'Invalid code. Please try again.');
      setAuthOtp('');
    }
  };

  const handleSendEmailOtp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authEmail)) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (authLoading2) return;
    setAuthLoading2('email');
    setAuthError('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await sendEmailOtp(authEmail);
    setAuthLoading2(null);

    if (result.success) {
      startCooldown();
      setAuthStep('email-otp');
      setTimeout(() => otpRef.current?.focus(), 300);
    } else {
      setAuthError(result.error || 'Please try again.');
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (authOtp.length < 6) return;
    if (authLoading2) return;
    setAuthLoading2('email-otp');
    setAuthError('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await verifyEmailOtp(authEmail, authOtp);
    setAuthLoading2(null);

    if (result.success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await handleAuthSuccess();
    } else {
      setAuthError(result.error || 'Invalid code. Check your email and try again.');
      setAuthOtp('');
    }
  };

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

  const renderAuthSheetContent = () => {
    if (authStep === 'phone-otp' || authStep === 'email-otp') {
      const isPhoneOtp = authStep === 'phone-otp';
      const masked = isPhoneOtp
        ? (authPhone.length >= 4 ? `\u00B7\u00B7\u00B7${authPhone.slice(-4)}` : authPhone)
        : (authEmail.length > 5 ? `${authEmail.slice(0, 3)}\u00B7\u00B7\u00B7${authEmail.slice(authEmail.indexOf('@'))}` : authEmail);

      return (
        <View style={s.sheetInner}>
          <Pressable
            onPress={() => { setAuthStep(isPhoneOtp ? 'phone' : 'email'); setAuthOtp(''); setAuthError(''); }}
            style={s.sheetBackBtn}
          >
            <ArrowLeft color={palette.textSecondary} size={16} />
          </Pressable>
          <Text style={s.sheetTitle}>Enter the code</Text>
          <Text style={s.sheetSubtitle}>Sent to {masked}</Text>

          <View style={s.otpContainer}>
            <TextInput
              ref={otpRef}
              style={s.otpHidden}
              value={authOtp}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, '').slice(0, 6);
                setAuthOtp(cleaned);
                if (cleaned.length === 6) {
                  setTimeout(() => { void (isPhoneOtp ? handleVerifyPhoneOtp() : handleVerifyEmailOtp()); }, 100);
                }
              }}
              keyboardType="number-pad"
              autoFocus
              maxLength={6}
              textContentType="oneTimeCode"
              testID="seal-auth-otp-input"
            />
            <View style={s.otpBoxes} pointerEvents="none">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={[s.otpBox, authOtp.length === i && s.otpBoxActive]}>
                  <Text style={s.otpDigit}>{authOtp[i] || ''}</Text>
                </View>
              ))}
            </View>
          </View>

          {authError ? <Text style={s.sheetError}>{authError}</Text> : null}

          <Pressable
            onPress={() => {
              if (resendCooldown > 0) return;
              setAuthOtp('');
              if (isPhoneOtp) void handleSendPhoneOtp();
              else void handleSendEmailOtp();
            }}
            disabled={resendCooldown > 0}
            style={[s.resendBtn, resendCooldown > 0 && { opacity: 0.5 }]}
          >
            <Text style={s.resendText}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't get the code? Resend"}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (authStep === 'phone') {
      return (
        <View style={s.sheetInner}>
          <Pressable onPress={() => { setAuthStep('pick'); setAuthError(''); }} style={s.sheetBackBtn}>
            <ArrowLeft color={palette.textSecondary} size={16} />
          </Pressable>
          <Text style={s.sheetTitle}>Enter your number</Text>
          <Text style={s.sheetSubtitle}>We'll text you a code.</Text>

          <View style={s.phoneInputShell}>
            <Text style={s.phonePrefix}>+1</Text>
            <TextInput
              style={s.phoneInput}
              placeholder="(555) 123-4567"
              placeholderTextColor={palette.textMuted}
              keyboardType="phone-pad"
              value={authPhone}
              onChangeText={setAuthPhone}
              autoFocus
              testID="seal-auth-phone-input"
            />
          </View>

          {authError ? <Text style={s.sheetError}>{authError}</Text> : null}

          <Pressable
            onPress={handleSendPhoneOtp}
            disabled={authPhone.replace(/\D/g, '').length < 10 || authLoading2 === 'phone'}
            style={[s.sheetPrimaryBtn, (authPhone.replace(/\D/g, '').length < 10 || authLoading2 === 'phone') && s.sheetPrimaryBtnDisabled]}
            testID="seal-auth-send-otp"
          >
            <Text style={s.sheetPrimaryBtnText}>{authLoading2 === 'phone' ? 'Sending...' : 'Send code'}</Text>
          </Pressable>
        </View>
      );
    }

    if (authStep === 'email') {
      return (
        <View style={s.sheetInner}>
          <Pressable onPress={() => { setAuthStep('pick'); setAuthError(''); }} style={s.sheetBackBtn}>
            <ArrowLeft color={palette.textSecondary} size={16} />
          </Pressable>
          <Text style={s.sheetTitle}>Enter your email</Text>
          <Text style={s.sheetSubtitle}>We'll send a 6-digit code.</Text>

          <View style={s.phoneInputShell}>
            <TextInput
              style={[s.phoneInput, { paddingLeft: 4 }]}
              placeholder="you@example.com"
              placeholderTextColor={palette.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              value={authEmail}
              onChangeText={setAuthEmail}
              autoFocus
              testID="seal-auth-email-input"
            />
          </View>

          {authError ? <Text style={s.sheetError}>{authError}</Text> : null}

          <Pressable
            onPress={handleSendEmailOtp}
            disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail) || authLoading2 === 'email'}
            style={[s.sheetPrimaryBtn, (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail) || authLoading2 === 'email') && s.sheetPrimaryBtnDisabled]}
            testID="seal-auth-send-email"
          >
            <Text style={s.sheetPrimaryBtnText}>{authLoading2 === 'email' ? 'Sending...' : 'Send code'}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={s.sheetInner}>
        <Text style={s.sheetTitle}>Quick sign-in</Text>
        <Text style={s.sheetSubtitle}>Verify your identity before money goes on the line.</Text>

        <Pressable onPress={() => { setAuthStep('email'); setAuthError(''); }} style={s.authRow} testID="seal-auth-email">
          <View style={s.authIcon}>
            <Mail color={palette.text} size={16} />
          </View>
          <Text style={s.authRowLabel}>Continue with email</Text>
          <MoveRight color={palette.textMuted} size={14} />
        </Pressable>

        <Pressable onPress={handleGoogleAuth} style={s.authRow} testID="seal-auth-google">
          <View style={s.authIcon}>
            {authLoading2 === 'google' ? (
              <ActivityIndicator size="small" color={palette.text} />
            ) : (
              <Text style={s.googleMark}>G</Text>
            )}
          </View>
          <Text style={s.authRowLabel}>Continue with Google</Text>
          <MoveRight color={palette.textMuted} size={14} />
        </Pressable>

        <Pressable onPress={() => { setAuthStep('phone'); setAuthError(''); }} style={s.authRow} testID="seal-auth-phone">
          <View style={s.authIcon}>
            <Phone color={palette.text} size={16} />
          </View>
          <Text style={s.authRowLabel}>Continue with phone</Text>
          <MoveRight color={palette.textMuted} size={14} />
        </Pressable>

        {authError ? <Text style={s.sheetError}>{authError}</Text> : null}
      </View>
    );
  };

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

      <Modal
        visible={authSheetVisible}
        transparent
        animationType="none"
        onRequestClose={dismissAuthSheet}
      >
        <Animated.View style={[s.modalOverlay, { opacity: authSheetFade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissAuthSheet} />
          <Animated.View
            style={[
              s.sheetContainer,
              {
                transform: [{
                  translateY: authSheetFade.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SHEET_HEIGHT, 0],
                  }),
                }],
              },
            ]}
          >
            {renderAuthSheetContent()}
          </Animated.View>
        </Animated.View>
      </Modal>
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

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: SHEET_HEIGHT,
    backgroundColor: palette.surfaceElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  sheetInner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 14,
  },
  sheetBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  sheetTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  sheetError: {
    color: '#FF7B7B',
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  authRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: palette.surface,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  authIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authRowLabel: {
    flex: 1,
    color: palette.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  googleMark: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  phoneInputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  phonePrefix: {
    color: palette.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  phoneInput: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  sheetPrimaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: palette.goldBright,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  sheetPrimaryBtnDisabled: {
    backgroundColor: palette.surfaceStrong,
  },
  sheetPrimaryBtnText: {
    color: '#0B0D11',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  otpContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  otpHidden: {
    position: 'absolute',
    width: '100%',
    height: 54,
    opacity: 0,
    fontSize: 24,
  },
  otpBoxes: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  otpBox: {
    width: 42,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: palette.goldBright,
  },
  otpDigit: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '700' as const,
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  resendText: {
    color: palette.textMuted,
    fontSize: 12,
  },
});

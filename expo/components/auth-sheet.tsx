import * as Haptics from 'expo-haptics';
import { ArrowLeft, Mail, MoveRight, Phone } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { palette, serifFont } from '@/constants/unbreakable';
import {
  GOOGLE_SIGN_IN_AVAILABLE,
  sendEmailOtp,
  sendPhoneOtp,
  signInWithGoogle,
  verifyEmailOtp,
  verifyPhoneOtp,
} from '@/lib/auth';

type AuthStep = 'pick' | 'phone-otp' | 'email' | 'email-otp';

const SHEET_HEIGHT = 440;

interface AuthSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onAuthSuccess: () => void;
}

function AuthSheet({ visible, onDismiss, onAuthSuccess }: AuthSheetProps) {
  const [step, setStep] = useState<AuthStep>('pick');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const kbOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep('pick');
      setError('');
      setOtp('');
      setBusy(null);
      setPhone('');
      setEmail('');
      setCooldown(0);
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      // Auto-focus phone input after animation
      setTimeout(() => phoneRef.current?.focus(), 350);
    }
  }, [visible, fade]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvt, (e) => {
      Animated.timing(kbOffset, {
        toValue: -e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });
    const s2 = Keyboard.addListener(hideEvt, (e) => {
      Animated.timing(kbOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e.duration ?? 200) : 200,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      s1.remove();
      s2.remove();
    };
  }, [kbOffset]);

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      onDismiss();
    });
  }, [fade, onDismiss]);

  const startCooldownTimer = useCallback(() => {
    setCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((p) => {
        if (p <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  }, []);

  const handleSuccess = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();
    Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      onAuthSuccess();
    });
  }, [fade, onAuthSuccess]);

  const handleGoogle = useCallback(async () => {
    if (busy) return;
    if (!GOOGLE_SIGN_IN_AVAILABLE) {
      setError('Google Sign-In is not available in this environment.');
      return;
    }
    setBusy('google');
    setError('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const timeout = new Promise<{ success: boolean; error?: string }>((resolve) =>
      setTimeout(() => resolve({ success: false, error: 'Sign-in timed out. Please try again.' }), 30000),
    );
    const result = await Promise.race([signInWithGoogle(), timeout]);

    if (result.success) {
      handleSuccess();
    } else if (result.error !== 'Sign-in cancelled') {
      setError(result.error || 'Please try again.');
    }
    setBusy(null);
  }, [busy, handleSuccess]);

  const handleSendPhone = useCallback(async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid phone number.');
      return;
    }
    if (busy) return;
    setBusy('phone');
    setError('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await sendPhoneOtp(phone);
    setBusy(null);

    if (result.success) {
      startCooldownTimer();
      setStep('phone-otp');
      setTimeout(() => otpRef.current?.focus(), 300);
    } else {
      setError(result.error || 'Please try again.');
    }
  }, [phone, busy, startCooldownTimer]);

  const handleSendEmail = useCallback(async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (busy) return;
    setBusy('email');
    setError('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await sendEmailOtp(email);
    setBusy(null);

    if (result.success) {
      startCooldownTimer();
      setStep('email-otp');
      setTimeout(() => otpRef.current?.focus(), 300);
    } else {
      setError(result.error || 'Please try again.');
    }
  }, [email, busy, startCooldownTimer]);

  const verifyCode = useCallback(
    async (code: string) => {
      if (code.length < 6 || busy) return;
      const isPhone = step === 'phone-otp';
      setBusy(isPhone ? 'otp' : 'email-otp');
      setError('');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = isPhone
        ? await verifyPhoneOtp(phone, code)
        : await verifyEmailOtp(email, code);

      setBusy(null);

      if (result.success) {
        handleSuccess();
      } else {
        setError(result.error || 'Invalid code. Please try again.');
        setOtp('');
      }
    },
    [busy, step, phone, email, handleSuccess],
  );

  const renderContent = () => {
    // ─── OTP verification (phone or email) ───
    if (step === 'phone-otp' || step === 'email-otp') {
      const isPhone = step === 'phone-otp';
      const masked = isPhone
        ? phone.length >= 4
          ? `\u00B7\u00B7\u00B7${phone.slice(-4)}`
          : phone
        : email.length > 5
          ? `${email.slice(0, 3)}\u00B7\u00B7\u00B7${email.slice(email.indexOf('@'))}`
          : email;

      return (
        <View style={s.sheetInner}>
          <Pressable
            onPress={() => {
              setStep('pick');
              setOtp('');
              setError('');
            }}
            style={s.sheetBackBtn}
          >
            <ArrowLeft color={palette.textSecondary} size={16} />
          </Pressable>
          <Text style={s.sheetTitle}>Enter the code.</Text>
          <Text style={s.sheetSubtitle}>
            {isPhone ? `We texted a 6-digit code to ${masked}` : `Sent to ${masked}`}
          </Text>

          <View style={s.otpContainer}>
            <TextInput
              ref={otpRef}
              style={s.otpHidden}
              value={otp}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, '').slice(0, 6);
                setOtp(cleaned);
                if (cleaned.length === 6) {
                  void verifyCode(cleaned);
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
                <View key={i} style={[s.otpBox, otp.length === i && s.otpBoxActive]}>
                  <Text style={s.otpDigit}>{otp[i] || ''}</Text>
                </View>
              ))}
            </View>
          </View>

          {isPhone ? (
            <Text style={s.autofillHint}>Auto-fills from your texts on iOS.</Text>
          ) : null}

          {error ? <Text style={s.sheetError}>{error}</Text> : null}

          <Pressable
            onPress={() => {
              if (cooldown > 0) return;
              setOtp('');
              if (isPhone) void handleSendPhone();
              else void handleSendEmail();
            }}
            disabled={cooldown > 0}
            style={[s.resendBtn, cooldown > 0 && { opacity: 0.5 }]}
          >
            <Text style={s.resendText}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </Text>
          </Pressable>
        </View>
      );
    }

    // ─── Email entry ───
    if (step === 'email') {
      return (
        <View style={s.sheetInner}>
          <Pressable onPress={() => { setStep('pick'); setError(''); }} style={s.sheetBackBtn}>
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
              value={email}
              onChangeText={setEmail}
              autoFocus
              testID="seal-auth-email-input"
            />
          </View>

          {error ? <Text style={s.sheetError}>{error}</Text> : null}

          <Pressable
            onPress={handleSendEmail}
            disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || busy === 'email'}
            style={[
              s.sheetPrimaryBtn,
              (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || busy === 'email') && s.sheetPrimaryBtnDisabled,
            ]}
            testID="seal-auth-send-email"
          >
            <Text style={s.sheetPrimaryBtnText}>
              {busy === 'email' ? 'Sending...' : 'Send code'}
            </Text>
          </Pressable>
        </View>
      );
    }

    // ─── Pick step — PHONE FIRST ───
    return (
      <View style={s.sheetInner}>
        <Text style={s.sheetTitle}>Almost done.</Text>
        <Text style={s.sheetSubtitle}>Enter your number to seal.</Text>

        {/* Phone hero input */}
        <View style={s.phoneHeroShell}>
          <Text style={s.flagPrefix}>🇺🇸 +1</Text>
          <TextInput
            ref={phoneRef}
            style={s.phoneHeroInput}
            placeholder="(555) 867-5309"
            placeholderTextColor={palette.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            testID="seal-auth-phone-input"
          />
        </View>

        {/* Primary CTA */}
        <Pressable
          onPress={handleSendPhone}
          disabled={phone.replace(/\D/g, '').length < 10 || busy === 'phone'}
          style={[
            s.sheetPrimaryBtn,
            (phone.replace(/\D/g, '').length < 10 || busy === 'phone') && s.sheetPrimaryBtnDisabled,
          ]}
          testID="seal-auth-continue"
        >
          <Text style={s.sheetPrimaryBtnText}>
            {busy === 'phone' ? 'Sending...' : 'Continue →'}
          </Text>
        </Pressable>

        <Text style={s.reassurance}>We'll text you a code. No password ever.</Text>

        {/* Secondary options */}
        <View style={s.secondaryDivider}>
          <View style={s.secondaryDividerLine} />
          <Text style={s.secondaryDividerText}>or</Text>
          <View style={s.secondaryDividerLine} />
        </View>

        <View style={s.secondaryRow}>
          {GOOGLE_SIGN_IN_AVAILABLE ? (
            <Pressable onPress={handleGoogle} style={s.secondaryChip} testID="seal-auth-google">
              {busy === 'google' ? (
                <ActivityIndicator size="small" color={palette.text} />
              ) : (
                <Text style={s.secondaryChipLabel}>G  Google</Text>
              )}
            </Pressable>
          ) : null}
          <Pressable onPress={() => { setStep('email'); setError(''); }} style={s.secondaryChip} testID="seal-auth-email">
            <Mail color={palette.textSecondary} size={13} />
            <Text style={s.secondaryChipLabel}>Email</Text>
          </Pressable>
        </View>

        {error ? <Text style={s.sheetError}>{error}</Text> : null}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[s.modalOverlay, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        <Animated.View
          style={[
            s.sheetContainer,
            {
              transform: [
                {
                  translateY: Animated.add(
                    fade.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SHEET_HEIGHT, 0],
                    }),
                    kbOffset,
                  ),
                },
              ],
            },
          ]}
        >
          {renderContent()}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default React.memo(AuthSheet);

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
    gap: 12,
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
    fontSize: 22,
    fontWeight: '700',
    fontFamily: serifFont,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -6,
  },
  sheetError: {
    color: '#FF7B7B',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Phone hero input
  phoneHeroShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  phoneHeroInput: {
    flex: 1,
    color: palette.text,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 0,
    letterSpacing: 0.3,
  },
  flagPrefix: {
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },

  // Primary button
  sheetPrimaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: palette.goldBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryBtnDisabled: {
    backgroundColor: palette.surfaceStrong,
  },
  sheetPrimaryBtnText: {
    color: '#0B0D11',
    fontSize: 15,
    fontWeight: '700',
  },

  // Reassurance
  reassurance: {
    color: palette.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -4,
  },

  // Secondary divider
  secondaryDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
  },
  secondaryDividerText: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },

  // Secondary chips
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryChip: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryChipLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Autofill hint
  autofillHint: {
    color: palette.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },

  // Legacy styles kept for email/OTP screens
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
  phoneInput: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
    paddingVertical: 0,
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
    fontWeight: '700',
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  resendText: {
    color: palette.goldBright,
    fontSize: 12,
    fontWeight: '600',
  },
});

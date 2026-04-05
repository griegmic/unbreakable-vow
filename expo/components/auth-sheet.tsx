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

type AuthStep = 'pick' | 'phone' | 'phone-otp' | 'email' | 'email-otp';

const SHEET_HEIGHT = 420;

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
  const fade = useRef(new Animated.Value(0)).current;
  const kbOffset = useRef(new Animated.Value(0)).current;

  // Reset all state and animate in when becoming visible
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
    }
  }, [visible, fade]);

  // Clean up cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // Track keyboard to shift sheet up
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

  // Pass OTP value directly — no setTimeout needed, no stale state
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
              setStep(isPhone ? 'phone' : 'email');
              setOtp('');
              setError('');
            }}
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
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Didn't get the code? Resend"}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (step === 'phone') {
      return (
        <View style={s.sheetInner}>
          <Pressable onPress={() => { setStep('pick'); setError(''); }} style={s.sheetBackBtn}>
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
              value={phone}
              onChangeText={setPhone}
              autoFocus
              testID="seal-auth-phone-input"
            />
          </View>

          {error ? <Text style={s.sheetError}>{error}</Text> : null}

          <Pressable
            onPress={handleSendPhone}
            disabled={phone.replace(/\D/g, '').length < 10 || busy === 'phone'}
            style={[
              s.sheetPrimaryBtn,
              (phone.replace(/\D/g, '').length < 10 || busy === 'phone') && s.sheetPrimaryBtnDisabled,
            ]}
            testID="seal-auth-send-otp"
          >
            <Text style={s.sheetPrimaryBtnText}>
              {busy === 'phone' ? 'Sending...' : 'Send code'}
            </Text>
          </Pressable>
        </View>
      );
    }

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

    // pick step
    return (
      <View style={s.sheetInner}>
        <Text style={s.sheetTitle}>Quick sign-in</Text>
        <Text style={s.sheetSubtitle}>Verify your identity before money goes on the line.</Text>

        <Pressable onPress={() => { setStep('email'); setError(''); }} style={s.authRow} testID="seal-auth-email">
          <View style={s.authIcon}>
            <Mail color={palette.text} size={16} />
          </View>
          <Text style={s.authRowLabel}>Continue with email</Text>
          <MoveRight color={palette.textMuted} size={14} />
        </Pressable>

        <Pressable onPress={handleGoogle} style={s.authRow} testID="seal-auth-google">
          <View style={s.authIcon}>
            {busy === 'google' ? (
              <ActivityIndicator size="small" color={palette.text} />
            ) : (
              <Text style={s.googleMark}>G</Text>
            )}
          </View>
          <Text style={s.authRowLabel}>Continue with Google</Text>
          <MoveRight color={palette.textMuted} size={14} />
        </Pressable>

        <Pressable onPress={() => { setStep('phone'); setError(''); }} style={s.authRow} testID="seal-auth-phone">
          <View style={s.authIcon}>
            <Phone color={palette.text} size={16} />
          </View>
          <Text style={s.authRowLabel}>Continue with phone</Text>
          <MoveRight color={palette.textMuted} size={14} />
        </Pressable>

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

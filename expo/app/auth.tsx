import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Mail, MoveRight, Phone, SkipForward } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BackButton, PrimaryButton, RitualScreen, TitleBlock, VowPreview } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { type AuthResult, GOOGLE_SIGN_IN_AVAILABLE, sendEmailOtp, sendPhoneOtp, signInWithGoogle, verifyEmailOtp, verifyPhoneOtp } from '@/lib/auth';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { useVowFlow } from '@/providers/vow-flow';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

type AuthMode = 'pick' | 'phone' | 'otp' | 'email' | 'email-otp';

export default function AuthScreen() {
  const { activeVowText } = useVowFlow();
  const [loading, setLoading] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>('pick');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRef = useRef<TextInput>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
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
  };

  const registerPush = async () => {
    try {
      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken(token);
      }
    } catch (err) {
      console.log('[AuthScreen] push registration failed:', err);
    }
  };

  const handleSuccess = async () => {
    await registerPush();
    router.push('/seal');
  };

  const handleGoogle = async () => {
    if (loading) return;
    if (!GOOGLE_SIGN_IN_AVAILABLE) {
      Alert.alert(
        'Not available here',
        'Google Sign-In is not available in this environment. Use email or phone to sign in.',
      );
      return;
    }
    setLoading('google');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const timeout = new Promise<AuthResult>((resolve) =>
      setTimeout(() => resolve({ success: false, error: 'Sign-in timed out. Please try again.' }), 30000)
    );
    const result = await Promise.race([signInWithGoogle(), timeout]);

    if (result.success) {
      await handleSuccess();
    } else if (result.error !== 'Sign-in cancelled') {
      Alert.alert('Sign-in failed', result.error || 'Please try again.');
    }

    setLoading(null);
  };

  const handleApple = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Coming soon', 'Apple Sign-In will be available shortly.');
  };

  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      Alert.alert('Invalid number', 'Please enter a valid phone number.');
      return;
    }
    if (loading) return;
    setLoading('phone');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await sendPhoneOtp(phone);
    setLoading(null);

    if (result.success) {
      startCooldown();
      setMode('otp');
      setTimeout(() => otpRef.current?.focus(), 300);
    } else {
      Alert.alert('Failed to send code', result.error || 'Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    if (loading) return;
    setLoading('otp');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await verifyPhoneOtp(phone, otp);
    setLoading(null);

    if (result.success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await handleSuccess();
    } else {
      Alert.alert('Invalid code', result.error || 'Please try again.');
      setOtp('');
    }
  };

  const handleSendEmailOtp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (loading) return;
    setLoading('email');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await sendEmailOtp(email);
    setLoading(null);

    if (result.success) {
      startCooldown();
      setMode('email-otp');
      setTimeout(() => otpRef.current?.focus(), 300);
    } else {
      Alert.alert('Failed to send code', result.error || 'Please try again.');
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (otp.length < 6) return;
    if (loading) return;
    setLoading('email-otp');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await verifyEmailOtp(email, otp);
    setLoading(null);

    if (result.success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await handleSuccess();
    } else {
      Alert.alert('Invalid code', result.error || 'Check your email and try again.');
      setOtp('');
    }
  };

  // ─── Email OTP entry screen ───
  if (mode === 'email-otp') {
    const maskedEmail = email.length > 5
      ? `${email.slice(0, 3)}···${email.slice(email.indexOf('@'))}`
      : email;
    return (
      <RitualScreen
        footer={
          <PrimaryButton
            label={loading === 'email-otp' ? 'Verifying...' : 'Verify'}
            onPress={handleVerifyEmailOtp}
            disabled={otp.length < 6 || loading === 'email-otp'}
            testID="auth-verify-email-otp"
          />
        }
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable
          onPress={() => { setMode('email'); setOtp(''); }}
          style={styles.backBtn}
          testID="auth-email-otp-back"
        >
          <ArrowLeft color={palette.textSecondary} size={18} />
        </Pressable>
        <TitleBlock
          title="Enter the code"
          subtitle={`We sent a 6-digit code to ${maskedEmail}`}
        />

        <View style={styles.otpContainer}>
          <TextInput
            ref={otpRef}
            style={styles.otpInput}
            value={otp}
            onChangeText={(text) => {
              const cleaned = text.replace(/\D/g, '').slice(0, 6);
              setOtp(cleaned);
              if (cleaned.length === 6) {
                setTimeout(() => handleVerifyEmailOtp(), 100);
              }
            }}
            keyboardType="number-pad"
            autoFocus
            maxLength={6}
            textContentType="oneTimeCode"
            testID="auth-email-otp-input"
          />
          <View style={styles.otpBoxes} pointerEvents="none">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.otpBox, otp.length === i && styles.otpBoxActive]}>
                <Text style={styles.otpDigit}>{otp[i] || ''}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.phoneDisclaimer}>
          Check your inbox (and spam folder) for the code.
        </Text>

        <Pressable
          onPress={() => {
            if (resendCooldown > 0) return;
            setOtp('');
            handleSendEmailOtp();
          }}
          disabled={resendCooldown > 0}
          style={[styles.resendBtn, resendCooldown > 0 && { opacity: 0.5 }]}
          testID="auth-resend-email-otp"
        >
          <Text style={styles.resendText}>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't get the code? Resend"}
          </Text>
        </Pressable>
      </RitualScreen>
    );
  }

  // ─── OTP entry screen ───
  if (mode === 'otp') {
    const maskedPhone = phone.length >= 4 ? `···${phone.slice(-4)}` : phone;
    return (
      <RitualScreen
        footer={
          <PrimaryButton
            label={loading === 'otp' ? 'Verifying...' : 'Verify'}
            onPress={handleVerifyOtp}
            disabled={otp.length < 6 || loading === 'otp'}
            testID="auth-verify-otp"
          />
        }
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable
          onPress={() => { setMode('phone'); setOtp(''); }}
          style={styles.backBtn}
          testID="auth-otp-back"
        >
          <ArrowLeft color={palette.textSecondary} size={18} />
        </Pressable>
        <TitleBlock
          title="Enter the code"
          subtitle={`We sent a 6-digit code to ${maskedPhone}`}
        />

        <View style={styles.otpContainer}>
          <TextInput
            ref={otpRef}
            style={styles.otpInput}
            value={otp}
            onChangeText={(text) => {
              const cleaned = text.replace(/\D/g, '').slice(0, 6);
              setOtp(cleaned);
              if (cleaned.length === 6) {
                // Auto-submit
                setTimeout(() => handleVerifyOtp(), 100);
              }
            }}
            keyboardType="number-pad"
            autoFocus
            maxLength={6}
            textContentType="oneTimeCode"
            testID="auth-otp-input"
          />
          <View style={styles.otpBoxes} pointerEvents="none">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.otpBox, otp.length === i && styles.otpBoxActive]}>
                <Text style={styles.otpDigit}>{otp[i] || ''}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => {
            if (resendCooldown > 0) return;
            setOtp('');
            handleSendOtp();
          }}
          disabled={resendCooldown > 0}
          style={[styles.resendBtn, resendCooldown > 0 && { opacity: 0.5 }]}
          testID="auth-resend-otp"
        >
          <Text style={styles.resendText}>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't get the code? Resend"}
          </Text>
        </Pressable>
      </RitualScreen>
    );
  }

  // ─── Phone number entry screen ───
  if (mode === 'phone') {
    return (
      <RitualScreen
        footer={
          <PrimaryButton
            label={loading === 'phone' ? 'Sending...' : 'Send code'}
            onPress={handleSendOtp}
            disabled={phone.replace(/\D/g, '').length < 10 || loading === 'phone'}
            testID="auth-send-otp"
          />
        }
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable
          onPress={() => setMode('pick')}
          style={styles.backBtn}
          testID="auth-phone-back"
        >
          <ArrowLeft color={palette.textSecondary} size={18} />
        </Pressable>
        <TitleBlock
          title="Enter your number"
          subtitle="We'll text you a code to verify it's you."
        />

        <View style={styles.phoneInputShell}>
          <Text style={styles.phonePrefix}>+1</Text>
          <TextInput
            style={styles.phoneInput}
            placeholder="(555) 123-4567"
            placeholderTextColor={palette.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            autoFocus
            testID="auth-phone-input"
          />
        </View>

        <Text style={styles.phoneDisclaimer}>
          Standard message rates may apply. We'll only use this to verify your identity.
        </Text>
      </RitualScreen>
    );
  }

  // ─── Email entry screen ───
  if (mode === 'email') {
    return (
      <RitualScreen
        footer={
          <PrimaryButton
            label={loading === 'email' ? 'Sending...' : 'Send code'}
            onPress={handleSendEmailOtp}
            disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || loading === 'email'}
            testID="auth-send-email-otp"
          />
        }
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable
          onPress={() => setMode('pick')}
          style={styles.backBtn}
          testID="auth-email-back"
        >
          <ArrowLeft color={palette.textSecondary} size={18} />
        </Pressable>
        <TitleBlock
          title="Enter your email"
          subtitle="We'll send you a 6-digit code to verify it's you."
        />

        <View style={styles.phoneInputShell}>
          <TextInput
            style={[styles.phoneInput, { paddingLeft: 4 }]}
            placeholder="you@example.com"
            placeholderTextColor={palette.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            autoFocus
            accessibilityLabel="Email address"
            testID="auth-email-input"
          />
        </View>

        <Text style={styles.phoneDisclaimer}>
          We'll only use this to verify your identity.
        </Text>
      </RitualScreen>
    );
  }

  // ─── Auth method picker (default) ───
  return (
    <RitualScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackButton />
      <TitleBlock
        title="Sign in to seal your vow"
        subtitle="Quick verification before your money goes on the line."
      />
      <VowPreview text={activeVowText} compact />

      <Pressable onPress={() => setMode('email')} style={styles.authRow} testID="auth-email">
        <View style={styles.authIcon}>
          <Mail color={palette.text} size={18} />
        </View>
        <Text style={styles.authTitle}>Continue with email</Text>
        <MoveRight color={palette.textMuted} size={16} />
      </Pressable>

      <Pressable onPress={handleGoogle} style={styles.authRow} testID="auth-google">
        <View style={styles.authIcon}>
          {loading === 'google' ? (
            <ActivityIndicator size="small" color={palette.text} />
          ) : (
            <Text style={styles.googleMark}>G</Text>
          )}
        </View>
        <Text style={styles.authTitle}>Continue with Google</Text>
        <MoveRight color={palette.textMuted} size={16} />
      </Pressable>

      <Pressable onPress={() => setMode('phone')} style={styles.authRow} testID="auth-phone">
        <View style={styles.authIcon}>
          <Phone color={palette.text} size={18} />
        </View>
        <Text style={styles.authTitle}>Continue with phone</Text>
        <MoveRight color={palette.textMuted} size={16} />
      </Pressable>

      <Pressable onPress={handleApple} style={[styles.authRow, styles.authRowDisabled]} testID="auth-apple">
        <View style={styles.authIcon}>
          <Text style={styles.appleMark}>{"\uF8FF"}</Text>
        </View>
        <Text style={styles.authTitle}>Continue with Apple</Text>
        <Text style={styles.soonBadge}>SOON</Text>
      </Pressable>

      {IS_EXPO_GO ? (
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/seal');
          }}
          style={[styles.authRow, styles.devSkipRow]}
          testID="auth-dev-skip"
        >
          <View style={[styles.authIcon, styles.devSkipIcon]}>
            <SkipForward color={palette.goldBright} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.authTitle}>Skip auth (Expo Go)</Text>
            <Text style={styles.devSkipHint}>Dev only — bypasses sign-in to test the rest of the flow</Text>
          </View>
        </Pressable>
      ) : null}
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  authRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: palette.surface,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  authRowDisabled: {
    opacity: 0.45,
  },
  devSkipRow: {
    borderColor: 'rgba(212,162,79,0.25)',
    borderStyle: 'dashed' as const,
  },
  devSkipIcon: {
    backgroundColor: 'rgba(212,162,79,0.12)',
  },
  devSkipHint: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  authIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: palette.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authTitle: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  googleMark: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800' as const,
  },
  appleMark: {
    color: palette.text,
    fontSize: 20,
  },
  soonBadge: {
    color: palette.goldBright,
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.18)',
    overflow: 'hidden',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  // Phone input
  phoneInputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  phonePrefix: {
    color: palette.textSecondary,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  phoneInput: {
    flex: 1,
    color: palette.text,
    fontSize: 17,
    paddingVertical: 0,
  },
  phoneDisclaimer: {
    color: palette.textMuted,
    fontSize: 12,
    textAlign: 'center' as const,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  // OTP input
  otpContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  otpInput: {
    position: 'absolute',
    width: '100%',
    height: 64,
    opacity: 0,
    fontSize: 24,
  },
  otpBoxes: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 14,
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
    fontSize: 24,
    fontWeight: '700' as const,
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    color: palette.textMuted,
    fontSize: 13,
  },
});

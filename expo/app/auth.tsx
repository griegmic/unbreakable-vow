import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Mail, MoveRight, SkipForward } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BackButton, PrimaryButton, RitualScreen, TitleBlock } from '@/components/vow-ui';
import { palette, serifFont } from '@/constants/unbreakable';
import { type AuthResult, GOOGLE_SIGN_IN_AVAILABLE, sendEmailOtp, sendPhoneOtp, signInWithGoogle, verifyEmailOtp, verifyPhoneOtp } from '@/lib/auth';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { useVowFlow } from '@/providers/vow-flow';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

type AuthMode = 'pick' | 'phone' | 'otp' | 'email' | 'email-otp';

export default function AuthScreen() {
  const { activeVowText, vow } = useVowFlow();
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
        'Google Sign-In is not available in this environment. Use phone or email to sign in.',
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

  // Build vow context string for preview
  const vowContext = (() => {
    const text = activeVowText || vow?.rawInput || '';
    if (!text) return '';
    const truncated = text.length > 40 ? text.slice(0, 37) + '...' : text;
    const witness = vow?.witnessName && vow.witnessName !== 'Just me'
      ? ` · ${vow.witnessName} is watching`
      : '';
    return `"${truncated}"${witness}`;
  })();

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
          title="Enter the code."
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

        <Text style={styles.autofillHint}>
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
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </Text>
        </Pressable>

        <Pressable onPress={() => { setMode('pick'); setOtp(''); setEmail(''); }} style={styles.switchLink}>
          <Text style={styles.switchLinkText}>Use a different method</Text>
        </Pressable>
      </RitualScreen>
    );
  }

  // ─── Phone OTP entry screen ───
  if (mode === 'otp') {
    const maskedPhone = phone.length >= 4 ? `(${phone.slice(-4).slice(0, 3)}) ···-${phone.slice(-4)}` : phone;
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
          onPress={() => { setMode('pick'); setOtp(''); }}
          style={styles.backBtn}
          testID="auth-otp-back"
        >
          <ArrowLeft color={palette.textSecondary} size={18} />
        </Pressable>
        <TitleBlock
          title="Enter the code."
          subtitle={`We texted a 6-digit code to ${maskedPhone}`}
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

        <Text style={styles.autofillHint}>
          Auto-fills from your texts on iOS.
        </Text>

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
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </Text>
        </Pressable>

        <Pressable onPress={() => { setMode('pick'); setOtp(''); }} style={styles.switchLink}>
          <Text style={styles.switchLinkText}>Use a different number</Text>
        </Pressable>
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
          subtitle="We'll send you a 6-digit code."
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

        <Text style={styles.autofillHint}>
          We'll only use this to verify your identity.
        </Text>
      </RitualScreen>
    );
  }

  // ─── Phone entry screen (separate mode, accessed from "phone" mode) ───
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
          subtitle="We'll text you a code. No password ever."
        />

        <View style={styles.phoneInputShell}>
          <Text style={styles.flagPrefix}>🇺🇸 +1</Text>
          <TextInput
            style={styles.phoneInput}
            placeholder="(555) 867-5309"
            placeholderTextColor={palette.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            autoFocus
            testID="auth-phone-input"
          />
        </View>

        <Text style={styles.autofillHint}>
          We'll text you a code. No password ever.
        </Text>
      </RitualScreen>
    );
  }

  // ─── Auth method picker (default) — PHONE FIRST ───
  return (
    <RitualScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackButton />

      <TitleBlock
        title="Almost done."
        subtitle="Enter your number to seal your vow."
      />

      {/* Vow context preview */}
      {vowContext ? (
        <View style={styles.vowPreviewCard}>
          <View style={styles.vowPreviewAccent} />
          <Text style={styles.vowPreviewText}>{vowContext}</Text>
        </View>
      ) : null}

      {/* Phone number — hero input */}
      <View style={styles.phoneHeroShell}>
        <Text style={styles.flagPrefix}>🇺🇸 +1</Text>
        <TextInput
          style={styles.phoneHeroInput}
          placeholder="(555) 867-5309"
          placeholderTextColor={palette.textMuted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          autoFocus
          testID="auth-phone-input-hero"
        />
      </View>

      {/* Primary CTA */}
      <PrimaryButton
        label={loading === 'phone' ? 'Sending...' : 'Continue →'}
        onPress={handleSendOtp}
        disabled={phone.replace(/\D/g, '').length < 10 || loading === 'phone'}
        testID="auth-continue"
      />

      <Text style={styles.reassurance}>
        We'll text you a code. No password ever.
      </Text>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>other ways to sign in</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Secondary auth options — compact row */}
      <View style={styles.secondaryRow}>
        {GOOGLE_SIGN_IN_AVAILABLE ? (
          <Pressable onPress={handleGoogle} style={styles.secondaryBtn} testID="auth-google">
            {loading === 'google' ? (
              <ActivityIndicator size="small" color={palette.text} />
            ) : (
              <Text style={styles.secondaryBtnLabel}>G  Google</Text>
            )}
          </Pressable>
        ) : null}

        <Pressable onPress={() => setMode('email')} style={styles.secondaryBtn} testID="auth-email">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Mail color={palette.textSecondary} size={14} />
            <Text style={styles.secondaryBtnLabel}>Email</Text>
          </View>
        </Pressable>
      </View>

      {/* Social proof */}
      <Text style={styles.socialProof}>✦ 847 vows sealed this month</Text>

      {IS_EXPO_GO ? (
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/seal');
          }}
          style={[styles.devSkipRow]}
          testID="auth-dev-skip"
        >
          <View style={styles.devSkipIcon}>
            <SkipForward color={palette.goldBright} size={14} />
          </View>
          <Text style={styles.devSkipText}>Skip auth (Expo Go)</Text>
        </Pressable>
      ) : null}
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  // Back button
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

  // Vow context preview
  vowPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  vowPreviewAccent: {
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: palette.gold,
  },
  vowPreviewText: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 14,
    fontFamily: serifFont,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Phone hero input (main picker screen)
  phoneHeroShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  phoneHeroInput: {
    flex: 1,
    color: palette.text,
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 0,
    letterSpacing: 0.5,
  },
  flagPrefix: {
    color: palette.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Reassurance copy
  reassurance: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: -4,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
  },
  dividerText: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Secondary auth row
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Social proof
  socialProof: {
    color: palette.textMuted,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
    letterSpacing: 0.2,
  },

  // Dev skip
  devSkipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.25)',
    borderStyle: 'dashed',
  },
  devSkipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(212,162,79,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devSkipText: {
    color: palette.textMuted,
    fontSize: 12,
  },

  // Phone input (secondary screens)
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
  phoneInput: {
    flex: 1,
    color: palette.text,
    fontSize: 17,
    paddingVertical: 0,
  },

  // Hint text
  autofillHint: {
    color: palette.textMuted,
    fontSize: 12,
    textAlign: 'center',
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
    fontWeight: '700',
  },

  // Resend
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    color: palette.goldBright,
    fontSize: 13,
    fontWeight: '600',
  },

  // Switch link
  switchLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchLinkText: {
    color: palette.textMuted,
    fontSize: 12,
  },
});

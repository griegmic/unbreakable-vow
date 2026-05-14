/**
 * Screen 04 — Phone First
 *
 * Native-perfect phone auth step.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChromeHeader, GoldCTA, PhoneInput } from '@/components/primitives';
import { sendPhoneOtp } from '@/lib/auth';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';
import { useAuth } from '@/providers/auth-provider';

export default function CreateAuthScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = phone.replace(/\D/g, '');
  const canSend = digits.length >= 10 && !busy;
  const isStandaloneSignIn = params.intent === 'signIn';

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (isStandaloneSignIn) {
      router.replace('/native-perfect/dashboard' as never);
      return;
    }
    router.replace({
      pathname: '/native-perfect/create/payment',
      params,
    } as never);
  }, [authLoading, isAuthenticated, isStandaloneSignIn, params]);

  const handleSendCode = useCallback(async () => {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    const result = await sendPhoneOtp(digits);
    setBusy(false);

    if (!result.success) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[CreateAuthScreen] OTP send failed; continuing in dev skip mode:', result.error);
      } else {
        setError("We couldn't send that code. Check your number and try again.");
        return;
      }
    }

    router.push({
      pathname: '/native-perfect/create/otp',
      params: {
        ...params,
        intent: isStandaloneSignIn ? 'signIn' : params.intent,
        phone: digits,
        testing: result.success ? undefined : '1',
      },
    } as never);
  }, [canSend, digits, isStandaloneSignIn, params]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[uvColors.bgCard, uvColors.bgGradMid, uvColors.bgGradDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ChromeHeader
          onBack={() => router.canGoBack() ? router.back() : router.replace(isStandaloneSignIn ? '/native-perfect/create/vow' : '/native-perfect/create/witness')}
          centerText="4 / 5"
        />

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '80%' }]} />
        </View>

        <Text style={styles.h1}>What&apos;s your number?</Text>
        <Text style={styles.sub}>
          We&apos;ll text the code that seals your vow. No password.
        </Text>

        <View style={styles.inputWrap}>
          <PhoneInput value={phone} onChangeText={setPhone} />
          <Text style={styles.helper}>For verification and vow updates only.</Text>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Code did not send.</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.ctaWrap}>
          <GoldCTA
            label={busy ? 'Sending...' : 'Text me the code'}
            disabled={!canSend}
            onPress={handleSendCode}
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: uvColors.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: uvSpacing.xl,
    paddingBottom: 120,
  },
  progressTrack: {
    height: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(244,234,216,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: uvColors.gold,
  },
  h1: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 44,
    lineHeight: 44 * 1.04,
    fontWeight: '900',
    color: uvColors.text,
    textAlign: 'center',
    marginTop: 96,
  },
  sub: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 20,
    lineHeight: 20 * 1.32,
    color: uvColors.textMuted,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 34,
  },
  inputWrap: {
    gap: 12,
  },
  helper: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: uvColors.textDim,
  },
  errorBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: uvColors.dangerBorder,
    backgroundColor: uvColors.dangerBg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorTitle: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    lineHeight: 14 * 1.2,
    fontWeight: '800',
    color: uvColors.danger,
    marginBottom: 3,
  },
  errorText: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: uvColors.textMuted,
  },
  ctaWrap: {
    marginTop: 82,
  },
});

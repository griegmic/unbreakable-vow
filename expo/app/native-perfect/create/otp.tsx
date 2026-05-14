/**
 * Screen 04b — Enter Code
 *
 * Native-perfect OTP verification screen.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChromeHeader, GoldCTA, OtpInput } from '@/components/primitives';
import { verifyPhoneOtp } from '@/lib/auth';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';

function formatPhone(digits: string) {
  const clean = digits.replace(/\D/g, '').slice(0, 10);
  if (clean.length !== 10) return clean ? `+1 ${clean}` : 'your phone';
  return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
}

export default function CreateOtpScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const phone = typeof params.phone === 'string' ? params.phone : '';
  const isStandaloneSignIn = params.intent === 'signIn';
  const canContinue = code.length === 6 && !busy;

  const verifyCode = useCallback(async (submittedCode: string) => {
    if (submittedCode.length !== 6 || busy) return;
    setBusy(true);
    setError(false);
    setMessage(null);

    if (typeof __DEV__ !== 'undefined' && __DEV__ && submittedCode === '000000') {
      setBusy(false);
      if (isStandaloneSignIn) {
        router.replace('/native-perfect/dashboard' as never);
        return;
      }
      router.push({
        pathname: '/native-perfect/create/name',
        params: { ...params, phone, testing: '1' },
      } as never);
      return;
    }

    const result = await verifyPhoneOtp(phone, submittedCode);
    setBusy(false);

    if (!result.success) {
      setCode('');
      setError(true);
      setMessage("That code didn't work. Check the digits or resend a new one.");
      return;
    }

    if (isStandaloneSignIn) {
      router.replace('/native-perfect/dashboard' as never);
      return;
    }

    router.push({
      pathname: '/native-perfect/create/name',
      params: { ...params, phone },
    } as never);
  }, [busy, isStandaloneSignIn, params, phone]);

  const handleCodeChange = useCallback((nextCode: string) => {
    setCode(nextCode);
    if (error) {
      setError(false);
      setMessage(null);
    }
    if (nextCode.length === 6) {
      void verifyCode(nextCode);
    }
  }, [error, verifyCode]);

  const handleContinue = useCallback(() => {
    void verifyCode(code);
  }, [code, verifyCode]);

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
          onBack={() => router.canGoBack() ? router.back() : router.replace({
            pathname: '/native-perfect/create/auth',
            params: isStandaloneSignIn ? { intent: 'signIn' } : {},
          } as never)}
          centerText="4 / 5"
        />

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '80%' }]} />
        </View>

        <Text style={styles.h1}>Enter the code.</Text>
        <Text style={styles.sub}>
          We texted a 6-digit code to {formatPhone(phone)}
        </Text>

        <View style={styles.otpWrap}>
          <OtpInput value={code} onChangeText={handleCodeChange} error={error} />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Try that code again.</Text>
            <Text style={styles.errorText}>{message}</Text>
          </View>
        ) : (
          <Text style={styles.helper}>
            {typeof __DEV__ !== 'undefined' && __DEV__ ? 'Testing: use 000000 to skip.' : 'Auto-fills from your texts on iOS.'}
          </Text>
        )}

        <Text style={styles.resend}>Resend in 58s</Text>
        <Text style={styles.switchNumber}>Use a different number</Text>

        <View style={styles.ctaWrap}>
          <GoldCTA
            label={busy ? 'Checking...' : 'Continue'}
            disabled={!canContinue}
            onPress={handleContinue}
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
    fontSize: 48,
    lineHeight: 48 * 1.04,
    fontWeight: '900',
    color: uvColors.text,
    textAlign: 'center',
    marginTop: 112,
  },
  sub: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 20,
    lineHeight: 20 * 1.32,
    color: uvColors.textMuted,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 54,
  },
  otpWrap: {
    minHeight: 68,
    justifyContent: 'center',
  },
  helper: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: uvColors.textDim,
    textAlign: 'center',
    marginTop: 24,
  },
  errorBox: {
    alignSelf: 'center',
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: uvColors.dangerBorder,
    backgroundColor: uvColors.dangerBg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 22,
  },
  errorTitle: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    lineHeight: 14 * 1.2,
    fontWeight: '800',
    color: uvColors.danger,
    textAlign: 'center',
    marginBottom: 3,
  },
  errorText: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: uvColors.textMuted,
    textAlign: 'center',
  },
  resend: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: uvColors.textDim,
    textAlign: 'center',
    marginTop: 42,
  },
  switchNumber: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: uvColors.textDim,
    textAlign: 'center',
    marginTop: 34,
  },
  ctaWrap: {
    marginTop: 70,
  },
});

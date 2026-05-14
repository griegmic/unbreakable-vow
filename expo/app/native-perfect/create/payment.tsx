/**
 * Screen 05 — Make It Real
 */
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChromeHeader, GoldCTA } from '@/components/primitives';
import { hapticOtpError, hapticSealComplete } from '@/lib/haptics';
import { isNativeWalletSupported, saveCard, setupPaymentSheetForSetup, showPaymentSheet } from '@/lib/stripe';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';
import { claimDraftVow, createVow, sealVow } from '@/lib/vow-api';
import { useAuth } from '@/providers/auth-provider';

function paramText(value: string | string[] | undefined, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export default function CreatePaymentScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [walletSupported, setWalletSupported] = useState(false);

  const vow = paramText(params.rawInput || params.vow, 'Run every morning this week');
  const stake = paramText(params.stakeAmount || params.stake, '50');
  const witness = paramText(params.witnessName, '');
  const witnessDecision = paramText(params.witnessDecision, '');
  const witnessSummary = witness || (witnessDecision === 'deferred' ? 'Add after sealing' : 'Witness link');
  const verdict = paramText(params.deadlineLabel || params.verdict, 'Friday');
  const destination = paramText(params.destination, 'ALS Association');

  const amount = useMemo(() => {
    const cleaned = String(stake).replace(/[^\d]/g, '');
    return cleaned ? Number(cleaned) : 50;
  }, [stake]);
  const stakeLabel = useMemo(() => `$${amount}`, [amount]);
  const isPaidStake = amount > 0;
  const walletLabel = Platform.OS === 'android' ? 'Google Pay' : 'Apple Pay';
  const primaryCta = 'Seal your vow';
  const explicitPaymentBypass = process.env.EXPO_PUBLIC_PAYMENT_TEST_BYPASS === '1'
    || process.env.EXPO_PUBLIC_PAYMENT_TEST_BYPASS === 'true';
  const devOtpTestingBypass = typeof __DEV__ !== 'undefined'
    && __DEV__
    && params.testing === '1';
  const canBypassPaymentAuth = explicitPaymentBypass || devOtpTestingBypass;

  useEffect(() => {
    if (authLoading || isAuthenticated || canBypassPaymentAuth) return;
    router.replace({
      pathname: '/native-perfect/create/auth',
      params,
    } as never);
  }, [authLoading, canBypassPaymentAuth, isAuthenticated, params]);

  useEffect(() => {
    let mounted = true;
    void isNativeWalletSupported().then((supported) => {
      if (mounted) setWalletSupported(supported);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLockItIn = useCallback(async () => {
    if (busy || authLoading || (!isAuthenticated && !canBypassPaymentAuth)) return;
    setBusy(true);
    setError('');
    if (canBypassPaymentAuth) {
      setTimeout(() => {
        setBusy(false);
        router.push({
          pathname: '/native-perfect/create/sealed',
          params: {
            ...params,
            witnessInviteToken: paramText(params.witnessInviteToken, ''),
          },
        } as never);
      }, 320);
      return;
    }

    try {
      const existingVowId = paramText(params.vowId, '');
      const existingToken = paramText(params.witnessInviteToken, '');
      const anonymousToken = paramText(params.anonymousToken || params.anonymous_token, '');
      if (existingVowId && anonymousToken) {
        const claimed = await claimDraftVow({ vowId: existingVowId, anonymousToken });
        if (!claimed.success) throw new Error(claimed.error || 'Could not connect this vow to your account.');
      }

      const created = existingVowId
        ? { id: existingVowId, witness_invite_token: existingToken }
        : await createVow({
          rawInput: vow,
          refinedText: vow,
          witnessName: witness || null,
          witnessPhone: paramText(params.witnessPhone, '') || null,
          stakeAmount: amount,
          consequence: paramText(params.consequence, 'charity'),
          destination,
          deadlineIso: paramText(params.deadlineIso, '') || null,
        });

      if (amount > 0) {
        const setup = await saveCard(created.id);
        await setupPaymentSheetForSetup(setup.clientSecret, amount * 100);
        const completed = await showPaymentSheet();
        if (!completed) {
          setBusy(false);
          return;
        }
      }

      const sealed = await sealVow(created.id);
      if (!sealed.success) throw new Error(sealed.error || 'Could not seal vow.');
      hapticSealComplete();
      setBusy(false);
      router.push({
        pathname: '/native-perfect/create/sealed',
        params: {
          ...params,
          vowId: created.id,
          witnessInviteToken: created.witness_invite_token || '',
        },
      } as never);
    } catch (err) {
      hapticOtpError();
      setError(err instanceof Error ? err.message : 'Could not lock this vow in.');
      setBusy(false);
    }
  }, [amount, authLoading, busy, canBypassPaymentAuth, destination, isAuthenticated, params, vow, witness]);

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
          onBack={() => router.canGoBack() ? router.back() : router.replace('/native-perfect/create/name')}
          centerText="5 / 5"
        />

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>

        <Text style={styles.h1}>Make it real.</Text>
        <Text style={styles.sub}>
          {isPaidStake ? `Authorize your ${stakeLabel} stake. No charge now. Only if you break it.` : 'No payment needed. Your witness still decides.'}
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryKicker}>You are sealing</Text>
          <Text style={styles.summaryVow} numberOfLines={2}>{vow}</Text>
          <View style={styles.summaryRule} />
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Stake</Text>
              <Text style={styles.summaryValue}>{isPaidStake ? stakeLabel : '$0'}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Witness</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{witnessSummary}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Verdict</Text>
              <Text style={styles.summaryValue}>{verdict}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.consequence}>
          {isPaidStake
            ? walletSupported
              ? `${walletLabel} opens next. Card or Link are available if needed.`
              : 'Stripe opens next. Card or Link are available.'
            : 'No money on the line. Just your word.'}
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Payment didn’t finish.</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.ctaWrap}>
          <GoldCTA
            label={busy ? 'Opening Stripe...' : authLoading ? 'Checking...' : primaryCta}
            disabled={busy || authLoading || (!isAuthenticated && !canBypassPaymentAuth)}
            onPress={handleLockItIn}
          />
        </View>
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
    flexGrow: 1,
    paddingHorizontal: uvSpacing.xl,
    paddingBottom: 46,
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
    fontFamily: uvFonts.serifMedium,
    fontSize: 52,
    lineHeight: 52 * 1.02,
    fontWeight: '500',
    color: uvColors.text,
    marginTop: 78,
  },
  sub: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 20,
    lineHeight: 20 * 1.25,
    color: uvColors.textMuted,
    marginTop: 12,
    marginBottom: 30,
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
    backgroundColor: 'rgba(244,234,216,0.035)',
    padding: 18,
  },
  summaryKicker: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: uvColors.textKicker,
    marginBottom: 12,
  },
  summaryVow: {
    fontFamily: uvFonts.serifItalic,
    fontSize: 26,
    lineHeight: 26 * 1.12,
    fontStyle: 'italic',
    color: uvColors.text,
  },
  summaryRule: {
    height: 1,
    backgroundColor: 'rgba(244,234,216,0.10)',
    marginVertical: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCell: {
    flex: 1,
  },
  summaryLabel: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: uvColors.textKicker,
    marginBottom: 6,
  },
  summaryValue: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    lineHeight: 14 * 1.15,
    fontWeight: '800',
    color: uvColors.text,
  },
  consequence: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    lineHeight: 15 * 1.28,
    fontWeight: '700',
    color: uvColors.textMuted,
    textAlign: 'center',
    marginTop: 22,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: uvColors.dangerBorder,
    borderRadius: 20,
    backgroundColor: uvColors.dangerBg,
    padding: 16,
    marginTop: 18,
  },
  errorTitle: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    fontWeight: '800',
    color: uvColors.danger,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: uvColors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  ctaWrap: {
    marginTop: 'auto',
    paddingTop: 34,
  },
});

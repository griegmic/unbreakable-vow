import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Check, CreditCard, LockKeyhole, MessageCircle, Smartphone } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { sendPhoneOtp, verifyPhoneOtp } from '@/lib/auth';
import { hapticOtpError, hapticPrimary, hapticSealComplete, hapticSelection } from '@/lib/haptics';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { displayPhone } from '@/lib/phone';
import { saveCard, setupPaymentSheetForSetup, showPaymentSheet } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { createVow, sealVow } from '@/lib/vow-api';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

type SealState = 'review' | 'phone' | 'otp' | 'name' | 'working' | 'sealed';

const IS_EXPO_GO_OR_WEB = Constants.appOwnership === 'expo' || Platform.OS === 'web';

export default function NativeSealScreen() {
  const { isAuthenticated, displayName } = useAuth();
  const { vow, activeVowText, setVowId } = useVowFlow();
  const [state, setState] = useState<SealState>('review');
  const [paymentMethod, setPaymentMethod] = useState<'apple' | 'card'>('apple');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [makerName, setMakerName] = useState(displayName || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pushAsked, setPushAsked] = useState(false);
  const witnessName = vow.witnessName && vow.witnessName !== 'Your witness' ? vow.witnessName : 'your witness';
  const stake = vow.stake.amount || 50;
  const deadline = useMemo(() => {
    const d = vow.deadlineIso ? new Date(vow.deadlineIso) : getSundayNight();
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, [vow.deadlineIso]);

  const finishPreviewSeal = () => {
    hapticSealComplete();
    setVowId(vow.vowId || 'local-native-sealed', vow.witnessInviteToken);
    setState('sealed');
  };

  const runSeal = async () => {
    if (!activeVowText.trim()) {
      setError('Vow is missing. Go back and add one.');
      hapticOtpError();
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session && !isAuthenticated && !IS_EXPO_GO_OR_WEB) {
      setState('phone');
      return;
    }
    if (IS_EXPO_GO_OR_WEB) {
      finishPreviewSeal();
      return;
    }

    setBusy(true);
    setError('');
    setState('working');
    try {
      const created = vow.vowId && vow.vowId !== 'local-native-sealed'
        ? { id: vow.vowId, witness_invite_token: vow.witnessInviteToken }
        : await createVow({
          rawInput: vow.rawInput || activeVowText,
          refinedText: activeVowText,
          witnessName: vow.witnessName || 'Your witness',
          witnessPhone: vow.phoneNumber || null,
          stakeAmount: stake,
          consequence: vow.stake.consequence,
          destination: vow.stake.destination,
          deadlineIso: vow.deadlineIso,
        });
      setVowId(created.id, created.witness_invite_token ?? vow.witnessInviteToken);

      if (stake > 0) {
        const setup = await saveCard(created.id);
        await setupPaymentSheetForSetup(setup.clientSecret, stake * 100);
        const completed = await showPaymentSheet();
        if (!completed) {
          setState('review');
          setError('');
          return;
        }
      }

      const sealed = await sealVow(created.id);
      if (!sealed.success) throw new Error(sealed.error || 'Could not seal vow.');
      hapticSealComplete();
      setState('sealed');
    } catch (err) {
      hapticOtpError();
      setError(err instanceof Error ? err.message : 'Could not seal vow.');
      setState('review');
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await sendPhoneOtp(phone);
    setBusy(false);
    if (!result.success) {
      hapticOtpError();
      setError(result.error || 'Failed to send code');
      return;
    }
    hapticPrimary();
    setState('otp');
  };

  const verifyCode = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await verifyPhoneOtp(phone, otp);
    setBusy(false);
    if (!result.success) {
      hapticOtpError();
      setError(result.error || 'Verification failed');
      return;
    }
    hapticPrimary();
    setState('name');
  };

  const saveNameThenSeal = async () => {
    if (busy) return;
    const trimmed = makerName.trim();
    if (trimmed.length < 2) {
      hapticOtpError();
      setError('Enter your name.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('users').upsert({ id: session.user.id, display_name: trimmed }, { onConflict: 'id' });
      }
    } finally {
      setBusy(false);
    }
    await runSeal();
  };

  const handleShare = async () => {
    hapticPrimary();
    const text = `I just made an Unbreakable Vow: "${activeVowText}". I need you to hold me to it.`;
    try {
      await Share.share({ message: text });
      void maybeRegisterPush();
    } catch {
      Alert.alert('Share unavailable', 'Copy the witness link from the live vow page.');
    }
  };

  const maybeRegisterPush = async () => {
    if (pushAsked || IS_EXPO_GO_OR_WEB) return;
    setPushAsked(true);
    const token = await registerForPushNotifications();
    if (token) await savePushToken(token);
  };

  if (state === 'sealed') {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={['#17130e', '#0f0d0a', '#090806']} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.haloTop} />
        <SafeAreaView style={styles.flex}>
          <View style={styles.sealedContent}>
            <View style={styles.sealMark}>
              <Check color={uvColors.textOnGold} size={38} strokeWidth={3} />
            </View>
            <Text style={styles.sealedKicker}>Sealed</Text>
            <Text style={styles.sealedTitle}>Your vow is{'\n'}<Text style={styles.goldItalic}>bound.</Text></Text>
            <View style={styles.boundCard}>
              <Text style={styles.cardLabel}>The vow</Text>
              <Text style={styles.boundVow}>{activeVowText || 'Your vow.'}</Text>
              <View style={styles.boundRule} />
              <Text style={styles.boundMeta}>${stake} if broken · verdict {deadline}</Text>
            </View>
            <View style={styles.nextCard}>
              <MessageCircle color={uvColors.goldBright} size={20} />
              <View style={styles.nextCopy}>
                <Text style={styles.nextTitle}>Now tell {witnessName}.</Text>
                <Text style={styles.nextSub}>They accept, then the vow starts.</Text>
              </View>
            </View>
          </View>
          <View style={styles.footer}>
            <Pressable onPress={handleShare} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
              <LinearGradient colors={[uvColors.goldBright, uvColors.gold, uvColors.goldDeep]} style={styles.ctaGradient}>
                <Text style={styles.ctaText}>Share with {witnessName} →</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => {
                void maybeRegisterPush();
                router.push('/native-dashboard' as never);
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>{"I'll do it later"}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (state === 'phone' || state === 'otp' || state === 'name') {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={['#17130e', '#0f0d0a', '#090806']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.flex}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.authContent}>
              <Pressable
                onPress={() => {
                  hapticSelection();
                  if (state === 'phone') setState('review');
                  else if (state === 'otp') setState('phone');
                  else setState('phone');
                  setError('');
                }}
                style={styles.authBack}
              >
                <Text style={styles.authBackText}>← Back</Text>
              </Pressable>
              <Text style={styles.authTitle}>
                {state === 'otp' ? 'Enter the code.' : state === 'name' ? 'What should we call you?' : 'What’s your number?'}
              </Text>
              <Text style={styles.authSub}>
                {state === 'otp'
                  ? `We texted a 6-digit code to ${formatPhoneDraft(phone)}`
                  : state === 'name'
                    ? 'Your witness needs to know who they’re holding accountable.'
                    : 'We’ll text the code that seals your vow. No password.'}
              </Text>
              <View style={styles.authDots}>
                {['phone', 'otp', 'name'].map((key) => (
                  <View key={key} style={[styles.authDot, state === key && styles.authDotActive]} />
                ))}
              </View>
              {state === 'phone' ? (
                <TextInput
                  value={formatPhoneDraft(phone)}
                  onChangeText={(value) => {
                    setPhone(value.replace(/[^\d]/g, '').slice(0, 10));
                    setError('');
                  }}
                  keyboardType="phone-pad"
                  placeholder="(555) 867-5309"
                  placeholderTextColor="rgba(164,154,133,0.5)"
                  style={styles.authInput}
                />
              ) : state === 'otp' ? (
                <TextInput
                  value={otp}
                  onChangeText={(value) => {
                    setOtp(value.replace(/[^\d]/g, '').slice(0, 6));
                    setError('');
                  }}
                  keyboardType="number-pad"
                  placeholder="000000"
                  placeholderTextColor="rgba(164,154,133,0.5)"
                  style={[styles.authInput, styles.otpInput]}
                />
              ) : (
                <TextInput
                  value={makerName}
                  onChangeText={(value) => {
                    setMakerName(value);
                    setError('');
                  }}
                  placeholder="Your name"
                  placeholderTextColor="rgba(164,154,133,0.5)"
                  style={styles.authInput}
                />
              )}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.authFooter}>
                <Pressable
                  disabled={busy}
                  onPress={state === 'phone' ? sendCode : state === 'otp' ? verifyCode : saveNameThenSeal}
                  style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, busy && styles.ctaBusy]}
                >
                  <LinearGradient colors={[uvColors.goldBright, uvColors.gold, uvColors.goldDeep]} style={styles.ctaGradient}>
                    {busy ? <ActivityIndicator color={uvColors.textOnGold} /> : (
                      <Text style={styles.ctaText}>{state === 'phone' ? 'Text me the code' : state === 'otp' ? 'Continue' : 'Continue'}</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  if (state === 'working') {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={['#17130e', '#0f0d0a', '#090806']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={[styles.flex, styles.workingContent]}>
          <ActivityIndicator color={uvColors.goldBright} size="large" />
          <Text style={styles.workingTitle}>Sealing...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#17130e', '#0f0d0a', '#090806']} locations={[0, 0.58, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.haloTop} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.topbar}>
              <Pressable onPress={() => router.replace('/native-quick-vow' as never)} style={styles.backButton} hitSlop={10}>
                <ArrowLeft color={uvColors.textMuted} size={20} />
              </Pressable>
              <Text style={styles.topTitle}>Last look.</Text>
              <View style={{ width: 42 }} />
            </View>

            <Text style={styles.eyebrow}>Seal the vow</Text>
            <Text style={styles.title}>Last look.</Text>
            <Text style={styles.sub}>{"Once you seal, there's no going back."}</Text>

            <View style={styles.reviewCard}>
              <Text style={styles.cardLabel}>I vow to</Text>
              <Text style={styles.reviewVow}>{activeVowText || 'Your vow.'}</Text>
              <View style={styles.boundRule} />
              <View style={styles.reviewGrid}>
                <View>
                  <Text style={styles.gridLabel}>On the line</Text>
                  <Text style={styles.gridValue}>${stake}</Text>
                </View>
                <View>
                  <Text style={styles.gridLabel}>Judge</Text>
                  <Text style={styles.gridValue}>{witnessName}</Text>
                </View>
                <View>
                  <Text style={styles.gridLabel}>By</Text>
                  <Text style={styles.gridValue}>{deadline}</Text>
                </View>
              </View>
            </View>

            <View style={styles.payCard}>
              <View style={styles.payHeader}>
                <LockKeyhole color={uvColors.goldBright} size={18} />
                <Text style={styles.payTitle}>Payment method</Text>
              </View>
              <Text style={styles.paySub}>No charge unless you break your vow</Text>
              <View style={styles.payOptions}>
                <Pressable
                  onPress={() => {
                    hapticSelection();
                    setPaymentMethod('apple');
                  }}
                  style={[styles.payOption, paymentMethod === 'apple' && styles.payOptionSelected]}
                >
                  <Smartphone color={paymentMethod === 'apple' ? uvColors.textOnGold : uvColors.textMuted} size={20} />
                  <Text style={[styles.payOptionText, paymentMethod === 'apple' && styles.payOptionTextSelected]}>Apple Pay</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    hapticSelection();
                    setPaymentMethod('card');
                  }}
                  style={[styles.payOption, paymentMethod === 'card' && styles.payOptionSelected]}
                >
                  <CreditCard color={paymentMethod === 'card' ? uvColors.textOnGold : uvColors.textMuted} size={20} />
                  <Text style={[styles.payOptionText, paymentMethod === 'card' && styles.payOptionTextSelected]}>Card</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable disabled={busy} onPress={runSeal} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, busy && styles.ctaBusy]}>
              <LinearGradient colors={[uvColors.goldBright, uvColors.gold, uvColors.goldDeep]} style={styles.ctaGradient}>
                {busy ? <ActivityIndicator color={uvColors.textOnGold} /> : <Text style={styles.ctaText}>Seal this vow</Text>}
              </LinearGradient>
            </Pressable>
            <Text style={styles.footerNote}>No charge unless you break your vow</Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function getSundayNight() {
  const d = new Date();
  const diff = 7 - d.getDay();
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  d.setHours(21, 0, 0, 0);
  return d;
}

function formatPhoneDraft(phone: string) {
  if (!phone) return '';
  if (phone.length === 10) return displayPhone(`+1${phone}`);
  const area = phone.slice(0, 3);
  const middle = phone.slice(3, 6);
  const end = phone.slice(6, 10);
  if (phone.length > 6) return `(${area}) ${middle}-${end}`;
  if (phone.length > 3) return `(${area}) ${middle}`;
  return area ? `(${area}` : '';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: uvColors.bg },
  haloTop: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    right: -190,
    top: -130,
    backgroundColor: 'rgba(200,155,60,0.12)',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 188,
    gap: 14,
  },
  topbar: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,233,219,0.04)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
  },
  topTitle: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eyebrow: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    color: uvColors.text,
    fontFamily: uvFonts.serifMedium,
    fontSize: 38,
    lineHeight: 40,
  },
  titleEm: {
    color: uvColors.goldBright,
    fontStyle: 'italic',
  },
  sub: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sans,
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 330,
  },
  reviewCard: {
    borderRadius: 22,
    padding: 17,
    gap: 12,
    backgroundColor: 'rgba(24,21,18,0.88)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
  },
  cardLabel: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  reviewVow: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 28,
    lineHeight: 32,
  },
  boundRule: {
    height: 1,
    backgroundColor: uvColors.borderSoft,
  },
  reviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridLabel: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  gridValue: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 16,
  },
  payCard: {
    borderRadius: 22,
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(240,233,219,0.04)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
  },
  payHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payTitle: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 18,
  },
  paySub: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  payOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  payOption: {
    flex: 1,
    minHeight: 60,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: 'rgba(24,21,18,0.78)',
  },
  payOptionSelected: {
    borderColor: uvColors.gold,
    backgroundColor: uvColors.goldBright,
  },
  payOptionText: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 16,
  },
  payOptionTextSelected: {
    color: uvColors.textOnGold,
  },
  sealedContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  sealMark: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uvColors.goldBright,
    shadowColor: uvColors.gold,
    shadowOpacity: 0.32,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
  },
  sealedKicker: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 3.6,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  sealedTitle: {
    color: uvColors.text,
    fontFamily: uvFonts.serifMedium,
    fontSize: 40,
    lineHeight: 42,
    textAlign: 'center',
  },
  goldItalic: {
    color: uvColors.goldBright,
    fontStyle: 'italic',
  },
  boundCard: {
    width: '100%',
    borderRadius: 22,
    padding: 17,
    gap: 10,
    backgroundColor: 'rgba(24,21,18,0.86)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
    marginTop: 8,
  },
  boundVow: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 24,
    lineHeight: 29,
  },
  boundMeta: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sansMedium,
    fontSize: 14,
  },
  nextCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 15,
    backgroundColor: 'rgba(52,199,89,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.20)',
  },
  nextCopy: { flex: 1 },
  nextTitle: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 18,
  },
  nextSub: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sans,
    fontSize: 13,
    marginTop: 3,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 22 : 14,
    backgroundColor: 'rgba(15,13,10,0.94)',
    borderTopWidth: 1,
    borderTopColor: uvColors.borderSoft,
    gap: 9,
  },
  cta: {
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    shadowColor: uvColors.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
  },
  ctaPressed: {
    transform: [{ scale: 0.985 }],
  },
  ctaBusy: {
    opacity: 0.75,
  },
  ctaGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: uvColors.textOnGold,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 18,
  },
  secondaryButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
  },
  footerNote: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansMedium,
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    color: uvColors.danger,
    fontFamily: uvFonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  authContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  authBack: {
    alignSelf: 'flex-start',
    minHeight: 42,
    justifyContent: 'center',
    marginBottom: 34,
  },
  authBackText: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sansMedium,
    fontSize: 16,
  },
  authTitle: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 32,
    lineHeight: 36,
    textAlign: 'center',
  },
  authSub: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sans,
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 28,
  },
  authDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 32,
  },
  authDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: uvColors.borderStrong,
  },
  authDotActive: {
    width: 24,
    backgroundColor: uvColors.gold,
  },
  authInput: {
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: uvColors.borderStrong,
    backgroundColor: 'rgba(24,21,18,0.86)',
    color: uvColors.text,
    fontFamily: uvFonts.sansMedium,
    fontSize: 24,
    paddingHorizontal: 20,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontFamily: uvFonts.sansSemibold,
  },
  authFooter: {
    marginTop: 34,
  },
  workingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  workingTitle: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 22,
  },
});

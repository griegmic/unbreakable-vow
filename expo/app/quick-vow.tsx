import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import ContactPickerModal from '@/components/contact-picker-modal';

import AuthSheet from '@/components/auth-sheet';
import { ChoiceChip, PrimaryButton, RitualCard, RitualScreen } from '@/components/vow-ui';
import {
  analyzeVow,
  charities,
  antiCauses,
  generateSuggestion,
  inferDeadline,
  palette,
  serifFont,
  stakeAmounts as defaultStakeAmounts,
} from '@/constants/unbreakable';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { createPaymentIntent, setupPaymentSheet, showPaymentSheet } from '@/lib/stripe';
import { createVow, voidVowV2 } from '@/lib/vow-api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

const IS_EXPO_GO = Constants.appOwnership === 'expo';
const STAKE_OPTIONS = [...defaultStakeAmounts]; // [10, 25, 50, 100]

/**
 * Strip time-window phrases that generateSuggestion appends (e.g. ", this week.",
 * " all week.") — the deadline is shown separately via the date picker, so the
 * formatted vow text shouldn't duplicate or contradict it.
 *
 * Keeps frequency qualifiers like "3 times", "every night", "every morning" intact
 * and only removes the trailing time-window reference.
 */
function stripTimeSuffix(text: string): string {
  return text
    // ", this week." / " this week." / " this month." / " this year."
    .replace(/[,.]?\s+this\s+(?:week|month|year)\s*\.?$/i, '')
    // ", all week." / " all month."
    .replace(/[,.]?\s+all\s+(?:week|month)\s*\.?$/i, '')
    // "by Friday at 5pm."
    .replace(/[,.]?\s+by\s+Friday\s+at\s+5pm\s*\.?$/i, '')
    .replace(/\s*\.$/, '')
    .trim();
}

type DeadlinePreset = 'tomorrow' | 'end_of_week' | 'in_7_days' | 'in_30_days' | 'custom';
type ConsequenceType = 'charity' | 'anti';

function getPresetDate(preset: DeadlinePreset): Date {
  const d = new Date();
  switch (preset) {
    case 'tomorrow': d.setDate(d.getDate() + 1); break;
    case 'end_of_week': d.setDate(d.getDate() + (7 - d.getDay() || 7)); break;
    case 'in_7_days': d.setDate(d.getDate() + 7); break;
    case 'in_30_days': d.setDate(d.getDate() + 30); break;
    default: break;
  }
  d.setHours(23, 59, 59, 0);
  return d;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

interface RecentWitness {
  name: string;
  phone: string;
}

export default function QuickVowScreen() {
  const { isAuthenticated, session } = useAuth();

  // Form state
  const [vowText, setVowText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [witnessPhone, setWitnessPhone] = useState('');
  const [stakeAmount, setStakeAmount] = useState(10); // Default $10
  const [consequence, setConsequence] = useState<ConsequenceType>('charity');
  const [destination, setDestination] = useState(charities[0]);
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>('in_7_days');
  const [customDate, setCustomDate] = useState<Date>(getPresetDate('in_7_days'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [oathChecked, setOathChecked] = useState(false);
  const [recentWitnesses, setRecentWitnesses] = useState<RecentWitness[]>([]);

  // Witness contact picker
  const [contactPickerVisible, setContactPickerVisible] = useState(false);

  // Seal state
  const [sealing, setSealing] = useState(false);
  const [error, setError] = useState('');
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
  const [sealedVowId, setSealedVowId] = useState<string | null>(null);
  const [witnessToken, setWitnessToken] = useState<string | null>(null);
  const [paidVowId, setPaidVowId] = useState<string | null>(null);
  const pendingSealRef = useRef(false);

  // VowFlow for hydrating after seal
  const vowFlow = useVowFlow();

  // Computed values — useMemo to avoid new Date() on every render (prevents useCallback churn)
  const deadlineDate = useMemo(
    () => deadlinePreset === 'custom' ? customDate : getPresetDate(deadlinePreset),
    [deadlinePreset, customDate],
  );

  const activeText = suggestion || vowText;
  const formattedText = activeText.trim()
    ? activeText.trim().charAt(0).toUpperCase() + activeText.trim().slice(1)
    : '';
  const finalText = formattedText.endsWith('.') || formattedText.endsWith('!')
    ? formattedText
    : formattedText + '.';

  const destinations = consequence === 'charity' ? charities : antiCauses;

  // Generate suggestion as user types.
  // Strip time-window suffixes from the generated suggestion since the deadline
  // is always selected separately via the date picker shown below the input.
  useEffect(() => {
    if (vowText.trim().length < 3) { setSuggestion(''); return; }
    const analysis = analyzeVow(vowText);
    if (analysis.type === 'vague') {
      setSuggestion(stripTimeSuffix(generateSuggestion(vowText)));
    } else {
      setSuggestion('');
    }
  }, [vowText]);

  // Auto-detect deadline from vow text
  useEffect(() => {
    if (!vowText.trim()) return;
    const inferred = inferDeadline(vowText);
    if (!inferred) return;

    const now = new Date();
    const diffDays = (inferred.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 1) {
      setCustomDate(inferred);
      setDeadlinePreset('custom');
    } else if (diffDays < 2) {
      setDeadlinePreset('tomorrow');
    } else if (diffDays <= 5) {
      setDeadlinePreset('end_of_week');
    } else if (diffDays <= 8) {
      setDeadlinePreset('in_7_days');
    } else if (diffDays <= 35) {
      setDeadlinePreset('in_30_days');
    } else {
      setCustomDate(inferred);
      setDeadlinePreset('custom');
    }
  }, [vowText]);

  // Ensure destination is valid for selected consequence
  useEffect(() => {
    const list = consequence === 'charity' ? charities : antiCauses;
    if (!list.includes(destination)) setDestination(list[0]);
  }, [consequence, destination]);

  // Load recent witnesses + vow count + smart defaults
  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      // Recent witnesses
      const { data } = await supabase
        .from('vows')
        .select('witness_name, witness_phone')
        .eq('user_id', session.user.id)
        .not('witness_name', 'eq', 'Just me')
        .not('witness_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) {
        const seen = new Set<string>();
        const unique: RecentWitness[] = [];
        for (const row of data) {
          const key = `${row.witness_name}|${row.witness_phone || ''}`;
          if (!seen.has(key) && row.witness_name && row.witness_name !== 'Your witness') {
            seen.add(key);
            unique.push({ name: row.witness_name, phone: row.witness_phone || '' });
          }
          if (unique.length >= 5) break;
        }
        setRecentWitnesses(unique);
        // Pre-select last witness for returning users (zero-tap)
        if (unique.length > 0 && !witnessName) {
          setWitnessName(unique[0].name);
          setWitnessPhone(unique[0].phone);
        }
      }

      // Smart defaults from last vow
      try {
        const saved = await AsyncStorage.getItem('quickvow-defaults');
        if (saved) {
          const defaults = JSON.parse(saved);
          if (defaults.stakeAmount !== undefined) setStakeAmount(defaults.stakeAmount);
          if (defaults.consequence) setConsequence(defaults.consequence);
          const validPresets: DeadlinePreset[] = ['tomorrow', 'end_of_week', 'in_7_days', 'in_30_days', 'custom'];
          if (defaults.deadlinePreset && validPresets.includes(defaults.deadlinePreset)) {
            // Map in_30_days to custom since it has no chip
            if (defaults.deadlinePreset === 'in_30_days') {
              setCustomDate(getPresetDate('in_30_days'));
              setDeadlinePreset('custom');
            } else {
              setDeadlinePreset(defaults.deadlinePreset);
            }
          }
        }
      } catch {}
    })();
  }, [session?.user?.id]);

  const acceptSuggestion = () => {
    if (suggestion) { setVowText(suggestion); setSuggestion(''); }
  };

  // -----------------------------------------------------------------------
  // Seal logic — mirrors seal.tsx patterns exactly
  // -----------------------------------------------------------------------

  const invokeSealEdgeFunction = async (vowId: string) => {
    const { error } = await supabase.functions.invoke('seal-vow', {
      body: { vow_id: vowId },
    });
    if (error) throw new Error(`seal-vow failed: ${error.message || 'Unknown error'}`);
  };

  // Dev bypass: create vow + mark active, skip Stripe
  const devBypassSeal = useCallback(async (resolvedWitnessName: string, resolvedWitnessPhone: string | null) => {
    setSealing(true);
    setError('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    let devVowId = 'dev-' + Date.now();
    let devToken: string | null = 'dev-token-' + Date.now();
    try {
      const vowRecord = await createVow({
        rawInput: vowText,
        refinedText: finalText,
        witnessName: resolvedWitnessName,
        witnessPhone: resolvedWitnessPhone,
        stakeAmount,
        consequence,
        destination: stakeAmount > 0 ? destination : 'None',
        deadlineIso: deadlineDate.toISOString(),
      });
      await supabase.from('vows').update({
        status: 'active',
        sealed_at: new Date().toISOString(),
      }).eq('id', vowRecord.id);
      devVowId = vowRecord.id;
      devToken = vowRecord.witness_invite_token;
    } catch (err) {
      console.error('[QuickVow] Dev bypass creation failed:', err);
    }
    setSealedVowId(devVowId);
    setWitnessToken(devToken);
    setSealing(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 150);
    await handleSealSuccess(devVowId, devToken);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vowText, finalText, stakeAmount, consequence, destination, deadlineDate]);

  const handleSealFlow = useCallback(async () => {
    if (sealing) return;
    setSealing(true);
    setError('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const resolvedWitnessName = (!witnessName || witnessName === 'Just me') ? 'Just me' : witnessName;
    const resolvedWitnessPhone = witnessPhone ? formatE164(witnessPhone) : null;

    // Expo Go — no native Stripe module
    if (IS_EXPO_GO) {
      if (stakeAmount === 0) {
        await devBypassSeal(resolvedWitnessName, resolvedWitnessPhone);
        return;
      }
      // Staked vow in Expo Go: prompt with skip option
      setSealing(false);
      Alert.alert(
        `Payment: $${stakeAmount}`,
        'Stripe is not available in Expo Go. Skip payment for testing?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Skip payment (test)', onPress: () => devBypassSeal(resolvedWitnessName, resolvedWitnessPhone) },
        ],
      );
      return;
    }

    // Production flow
    let vowId: string | null = null;
    let witnessInviteToken: string | null = null;
    let paymentCaptured = false;

    try {
      const vowRecord = await createVow({
        rawInput: vowText,
        refinedText: finalText,
        witnessName: resolvedWitnessName,
        witnessPhone: resolvedWitnessPhone,
        stakeAmount,
        consequence,
        destination: stakeAmount > 0 ? destination : 'None',
        deadlineIso: deadlineDate.toISOString(),
      });
      vowId = vowRecord.id;
      witnessInviteToken = vowRecord.witness_invite_token;
      setSealedVowId(vowId);
      setWitnessToken(witnessInviteToken);

      if (stakeAmount === 0) {
        // $0 vow: seal directly, no payment
        await invokeSealEdgeFunction(vowId);
        setSealing(false);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 150);
        await handleSealSuccess(vowId, witnessInviteToken);
        return;
      }

      // Staked: payment flow
      const { clientSecret } = await createPaymentIntent(vowId, stakeAmount * 100);
      await setupPaymentSheet(clientSecret);
      const paid = await showPaymentSheet();

      if (!paid) {
        await voidVowV2(vowId).catch(() => {});
        setSealing(false);
        Alert.alert('Payment cancelled', 'No charge was made. You can try again whenever you\'re ready.');
        return;
      }

      paymentCaptured = true;
      setPaidVowId(vowId);
      await invokeSealEdgeFunction(vowId);
      setSealing(false);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 150);
      await handleSealSuccess(vowId!, witnessInviteToken);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[QuickVow] seal flow error:', errMsg);
      setSealing(false);
      if (paidVowId || paymentCaptured) {
        setPaidVowId(vowId || paidVowId);
        Alert.alert('Almost there', 'Your payment went through but we couldn\'t finish sealing. Tap "Seal this vow" to try again.');
      } else {
        if (vowId) await voidVowV2(vowId).catch(() => {});
        Alert.alert('Something went wrong', errMsg || 'Please try again.');
      }
    }
  }, [sealing, vowText, finalText, witnessName, witnessPhone, stakeAmount, consequence, destination, deadlineDate, paidVowId, session]);

  const handleSeal = async () => {
    if (!oathChecked || !vowText.trim() || sealing) return;

    if (!isAuthenticated) {
      setAuthSheetVisible(true);
      return;
    }

    await handleSealFlow();
  };

  // Auth callback — retry seal after sign-in
  useEffect(() => {
    if (pendingSealRef.current && isAuthenticated) {
      pendingSealRef.current = false;
      void handleSealFlow();
    }
  }, [isAuthenticated, handleSealFlow]);

  const handleAuthSuccess = useCallback(async () => {
    setAuthSheetVisible(false);
    try {
      const token = await registerForPushNotifications();
      if (token) await savePushToken(token);
    } catch {}
    if (isAuthenticated) {
      void handleSealFlow();
    } else {
      pendingSealRef.current = true;
    }
  }, [handleSealFlow, isAuthenticated]);

  // -----------------------------------------------------------------------
  // Post-seal: hydrate VowFlow → auto-share → navigate to /live
  // -----------------------------------------------------------------------

  const handleSealSuccess = async (resolvedVowId: string, resolvedToken: string | null) => {
    // Save smart defaults for next time
    try {
      await AsyncStorage.setItem('quickvow-defaults', JSON.stringify({
        stakeAmount,
        consequence,
        deadlinePreset,
      }));
    } catch {}

    // Hydrate VowFlowProvider so /live has full context
    vowFlow.setRawInput(vowText);
    vowFlow.setRefinedText(finalText);
    if (witnessName && witnessName !== 'Just me') {
      vowFlow.setWitnessType('friend');
      vowFlow.setWitness(witnessName, witnessPhone ? 'sms' : 'link', witnessPhone || undefined);
    } else {
      vowFlow.setWitnessType('self');
      vowFlow.setWitness('Just me', 'link');
    }
    vowFlow.setStake({ amount: stakeAmount, consequence, destination: stakeAmount > 0 ? destination : 'None' });
    vowFlow.setVowId(resolvedVowId, resolvedToken);
    vowFlow.setDeadline(deadlineDate.toISOString());

    // Auto-share for witnessed vows
    const shareUrl = resolvedToken ? `https://unbreakablevow.app/w/${resolvedToken}` : '';
    if (witnessName && shareUrl) {
      try {
        await Share.share({
          message: stakeAmount > 0
            ? `I made a vow: "${finalText.replace(/\.$/, '').slice(0, 60)}" — $${stakeAmount} on the line and you're the judge → ${shareUrl}`
            : `I made a vow: "${finalText.replace(/\.$/, '').slice(0, 60)}" — and named you the judge → ${shareUrl}`,
        });
      } catch {}
    }

    // Navigate to /live
    router.push({ pathname: '/live', params: { justSealed: '1' } });
  };

  // -----------------------------------------------------------------------
  // Creation form
  // -----------------------------------------------------------------------

  return (
    <>
      <RitualScreen
        scroll
        footer={
          <View>
            <PrimaryButton
              testID="quickvow-seal"
              label={sealing ? 'Processing...' : 'Seal this vow'}
              onPress={handleSeal}
              disabled={!oathChecked || !vowText.trim() || sealing}
            />
            {stakeAmount > 0 && (
              <Text style={styles.ctaSubtext}>${stakeAmount} held until verdict</Text>
            )}
          </View>
        }
      >
        <Stack.Screen options={{ headerShown: false }} />

        {/* Back to Dashboard */}
        <Pressable onPress={() => router.push('/dashboard')} style={styles.backRow}>
          <ArrowLeft color={palette.textSecondary} size={16} />
          <Text style={styles.backLabel}>Dashboard</Text>
        </Pressable>

        {/* Hero prompt + input */}
        <View style={styles.vowInputCard}>
          <Text style={styles.vowPrompt}>I vow to...</Text>
          <TextInput
            value={vowText}
            onChangeText={setVowText}
            placeholder="run every morning this week"
            placeholderTextColor="rgba(246,247,251,0.3)"
            multiline
            style={styles.heroTextInput}
          />
          {suggestion && suggestion !== vowText ? (
            <Pressable onPress={acceptSuggestion} style={styles.suggestionRow}>
              <Sparkles color={palette.gold} size={12} />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Inline deadline */}
        <RitualCard>
          <View style={styles.inlineDeadlineRow}>
            <Text style={styles.inlineDeadlineLabel}>Ends</Text>
            <View style={styles.chipRow}>
              {([
                ['tomorrow', 'Tomorrow'],
                ['end_of_week', 'End of week'],
                ['in_7_days', '7 days'],
                ['custom', 'Pick'],
              ] as [DeadlinePreset, string][]).map(([id, label]) => (
                <ChoiceChip
                  key={id}
                  label={label}
                  active={deadlinePreset === id}
                  onPress={() => {
                    setDeadlinePreset(id);
                    if (id === 'custom') setShowDatePicker(true);
                  }}
                />
              ))}
            </View>
          </View>
          {showDatePicker && deadlinePreset === 'custom' ? (
            <>
              <DateTimePicker
                value={customDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                minimumDate={new Date()}
                themeVariant="dark"
                onChange={(_: unknown, date?: Date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (date) {
                    date.setHours(23, 59, 59, 0);
                    setCustomDate(date);
                  }
                }}
              />
            </>
          ) : null}
          <Text style={styles.deadlineHint}>{formatDateShort(deadlineDate)}</Text>
        </RitualCard>

        <Pressable onPress={() => router.push('/cast')} style={styles.dareLink}>
          <Text style={styles.dareLinkText}>or <Text style={styles.dareLinkBold}>dare a friend →</Text></Text>
        </Pressable>

        {/* Witness */}
        <RitualCard>
          <Text style={styles.sectionLabel}>YOUR WITNESS</Text>
          <Text style={styles.witnessSubline}>A vow without a witness is just a promise to yourself.</Text>

          {/* Selected witness display */}
          {witnessName ? (
            <View style={styles.selectedWitness}>
              <View style={styles.selectedWitnessInfo}>
                <Text style={styles.selectedWitnessName}>{witnessName === 'Just me' ? 'Just me' : witnessName} ✓</Text>
                {witnessPhone ? <Text style={styles.selectedWitnessPhone}>{witnessPhone}</Text> : null}
              </View>
              <Pressable onPress={() => { setWitnessName(''); setWitnessPhone(''); }}>
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* First-time: hero contact picker */}
              {recentWitnesses.length === 0 ? (
                <View style={styles.inputCol}>
                  <Pressable
                    onPress={() => setContactPickerVisible(true)}
                    style={styles.contactPickerHero}
                  >
                    <Text style={styles.contactPickerHeroText}>Pick from contacts</Text>
                  </Pressable>
                  <Pressable onPress={() => { setWitnessName('Just me'); setWitnessPhone(''); }}>
                    <Text style={styles.manualEntryLink}>No witness — just my word</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Returning user: recent chips + contacts */}
              {recentWitnesses.length > 0 ? (
                <>
                  <View style={styles.chipRow}>
                    {recentWitnesses.map((w) => (
                      <ChoiceChip
                        key={w.name + w.phone}
                        label={w.name}
                        active={witnessName === w.name && witnessPhone === w.phone}
                        onPress={() => { setWitnessName(w.name); setWitnessPhone(w.phone); }}
                      />
                    ))}
                    <ChoiceChip
                      label="From contacts"
                      active={false}
                      onPress={() => setContactPickerVisible(true)}
                    />
                  </View>
                  <Pressable onPress={() => { setWitnessName('Just me'); setWitnessPhone(''); }}>
                    <Text style={styles.manualEntryLink}>No witness — just my word</Text>
                  </Pressable>
                </>
              ) : null}
            </>
          )}
        </RitualCard>

        {/* Stake */}
        <RitualCard>
          <Text style={styles.sectionLabel}>STAKE</Text>
          <View style={styles.chipRow}>
            {STAKE_OPTIONS.map((amt) => (
              <ChoiceChip
                key={amt}
                label={`$${amt}`}
                active={stakeAmount === amt}
                onPress={() => setStakeAmount(amt)}
              />
            ))}
          </View>
          <Pressable onPress={() => setStakeAmount(0)} style={styles.accountabilityLink}>
            <Text style={[styles.accountabilityLinkText, stakeAmount === 0 && styles.accountabilityLinkTextActive]}>
              {stakeAmount === 0 ? 'Accountability only (no stake)' : 'or go accountability only'}
            </Text>
          </Pressable>

          {stakeAmount > 0 ? (
            <>
              <View style={styles.divider} />

              {/* Consequence sentence */}
              <Text style={styles.consequenceSentence}>
                If you break this vow,{'\n'}
                <Text style={styles.consequenceAmount}>${stakeAmount} goes to {destination}.</Text>
              </Text>

              {/* Toggle: A good cause / An anti-cause */}
              <View style={styles.consequenceToggle}>
                <Pressable
                  onPress={() => setConsequence('charity')}
                  style={[styles.toggleSegment, consequence === 'charity' && styles.toggleSegmentActive]}
                >
                  <Text style={[styles.toggleText, consequence === 'charity' && styles.toggleTextActive]}>A good cause</Text>
                </Pressable>
                <Pressable
                  onPress={() => setConsequence('anti')}
                  style={[styles.toggleSegment, consequence === 'anti' && styles.toggleSegmentActive]}
                >
                  <Text style={[styles.toggleText, consequence === 'anti' && styles.toggleTextActive]}>An anti-cause</Text>
                </Pressable>
              </View>

              {/* Destination chips */}
              <View style={styles.chipRow}>
                {destinations.map((d) => (
                  <ChoiceChip key={d} label={d} active={destination === d} onPress={() => setDestination(d)} />
                ))}
              </View>

              {/* Flavor text — anti-cause only */}
              {consequence === 'anti' && (
                <Text style={styles.consequenceFlavor}>
                  Maximum pain. Maximum motivation.
                </Text>
              )}
            </>
          ) : null}
        </RitualCard>

        {/* Deadline card removed — merged into vow text card above */}

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Oath — evolves for returning users */}
        <Pressable onPress={() => { setOathChecked(!oathChecked); void Haptics.selectionAsync(); }} style={styles.oathRow}>
          <View style={[styles.checkbox, oathChecked && styles.checkboxChecked]}>
            {oathChecked ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.oathText}>
            I do solemnly swear to honor this vow and accept the consequences.
          </Text>
        </Pressable>

        {/* Guided flow link */}
        <Pressable onPress={() => router.push('/?guided=1')} hitSlop={8}>
          <Text style={styles.guidedLink}>Use guided flow instead</Text>
        </Pressable>
      </RitualScreen>

      <ContactPickerModal
        visible={contactPickerVisible}
        onSelect={(name, phone) => {
          setWitnessName(name);
          setWitnessPhone(phone);
          setContactPickerVisible(false);
        }}
        onClose={() => setContactPickerVisible(false)}
      />

      <AuthSheet
        visible={authSheetVisible}
        onDismiss={() => setAuthSheetVisible(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backLabel: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  vowInputCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.15)',
    padding: 18,
    paddingBottom: 14,
    marginTop: 16,
  },
  vowPrompt: {
    color: 'rgba(212,162,79,0.7)',
    fontSize: 30,
    fontWeight: '500',
    fontFamily: serifFont,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  heroTextInput: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '400',
    fontFamily: serifFont,
    lineHeight: 33,
    letterSpacing: -0.3,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    color: palette.goldBright,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(212,162,79,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.2)',
    marginTop: 4,
  },
  suggestionText: {
    color: palette.gold,
    fontSize: 13,
    flex: 1,
  },
  witnessSubline: {
    color: palette.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  selectedWitness: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: 'rgba(212,162,79,0.06)',
    marginTop: 4,
  },
  selectedWitnessInfo: {
    gap: 2,
  },
  selectedWitnessName: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  selectedWitnessPhone: {
    color: palette.textMuted,
    fontSize: 12,
  },
  changeLink: {
    color: palette.goldBright,
    fontSize: 13,
    fontWeight: '600',
  },
  contactPickerHero: {
    backgroundColor: palette.goldBright,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  contactPickerHeroText: {
    color: '#0B0D11',
    fontSize: 15,
    fontWeight: '700',
  },
  manualEntryLink: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
    paddingVertical: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  inputCol: {
    gap: 8,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 8,
  },
  consequenceSentence: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  consequenceAmount: {
    color: palette.gold,
    fontFamily: serifFont,
    fontSize: 17,
    fontWeight: '700',
  },
  consequenceToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 8,
  },
  toggleSegment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleSegmentActive: {
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderColor: palette.borderStrong,
  },
  toggleText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: palette.goldBright,
  },
  consequenceFlavor: {
    color: palette.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  inlineDeadlineDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 8,
  },
  inlineDeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineDeadlineLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  deadlineHint: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: 'rgba(255,123,123,0.12)',
    borderRadius: 14,
    padding: 12,
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
  },
  oathRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
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
  checkmark: {
    color: '#0B0D11',
    fontSize: 14,
    fontWeight: '700',
  },
  oathText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  guidedLink: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
    paddingVertical: 8,
  },
  ctaSubtext: {
    color: palette.textMuted,
    fontSize: 12,
    textAlign: 'center' as const,
    marginTop: 6,
  },
  datePickerDone: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  datePickerDoneText: {
    color: palette.goldBright,
    fontSize: 15,
    fontWeight: '600',
  },
  dareLink: {
    marginBottom: 8,
  },
  dareLinkText: {
    color: palette.textMuted,
    fontSize: 14,
  },
  dareLinkBold: {
    color: palette.goldBright,
    fontWeight: '700',
  },
  accountabilityLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  accountabilityLinkText: {
    color: palette.textMuted,
    fontSize: 13,
    opacity: 0.6,
  },
  accountabilityLinkTextActive: {
    opacity: 1,
  },
});

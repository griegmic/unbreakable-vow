import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const STAKE_OPTIONS = [0, ...defaultStakeAmounts]; // [0, 10, 25, 50, 100]

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
  const [stakeAmount, setStakeAmount] = useState(0);
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

  // Generate suggestion as user types
  useEffect(() => {
    if (vowText.trim().length < 3) { setSuggestion(''); return; }
    const analysis = analyzeVow(vowText);
    if (analysis.type === 'vague') {
      setSuggestion(generateSuggestion(vowText));
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

  // Load recent witnesses
  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
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
          if (!seen.has(key) && row.witness_name) {
            seen.add(key);
            unique.push({ name: row.witness_name, phone: row.witness_phone || '' });
          }
          if (unique.length >= 5) break;
        }
        setRecentWitnesses(unique);
      }
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

  const handleSealFlow = useCallback(async () => {
    if (sealing) return;
    setSealing(true);
    setError('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const resolvedWitnessName = (!witnessName || witnessName === 'Just me') ? 'Just me' : witnessName;
    const resolvedWitnessPhone = witnessPhone ? formatE164(witnessPhone) : null;

    if (IS_EXPO_GO) {
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
        console.error('[QuickVow] Expo Go creation failed:', err);
      }
      setSealedVowId(devVowId);
      setWitnessToken(devToken);
      setSealing(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await handleSealSuccess(devVowId, devToken);
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
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          message: `I just made a vow: "${finalText.replace(/\.$/, '')}" — I picked you to hold me accountable. Tap here to accept: ${shareUrl}`,
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
          <PrimaryButton
            testID="quickvow-seal"
            label={sealing ? 'Processing...' : stakeAmount > 0 ? `Seal vow & pay $${stakeAmount}` : 'Seal this vow'}
            onPress={handleSeal}
            disabled={!oathChecked || !vowText.trim() || sealing}
          />
        }
      >
        <Stack.Screen options={{ headerShown: false }} />

        {/* Back to Dashboard */}
        <Pressable onPress={() => router.push('/dashboard')} style={styles.backRow}>
          <ArrowLeft color={palette.textSecondary} size={16} />
          <Text style={styles.backLabel}>Dashboard</Text>
        </Pressable>

        <Text style={styles.pageTitle}>QuickVow</Text>

        {/* Vow text */}
        <RitualCard>
          <Text style={styles.sectionLabel}>WHAT ARE YOU COMMITTING TO?</Text>
          <TextInput
            value={vowText}
            onChangeText={setVowText}
            placeholder="e.g. Go to the gym 3x this week"
            placeholderTextColor={palette.textMuted}
            multiline
            style={styles.textInput}
          />
          {suggestion && suggestion !== vowText ? (
            <Pressable onPress={acceptSuggestion} style={styles.suggestionRow}>
              <Sparkles color={palette.gold} size={12} />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ) : null}
        </RitualCard>

        {/* Witness */}
        <RitualCard>
          <Text style={styles.sectionLabel}>WHO'S HOLDING YOU TO IT?</Text>
          <Text style={styles.witnessSubline}>Witnessed vows are kept 3x more often.</Text>

          {/* Selected witness display */}
          {witnessName && witnessName !== 'Just me' ? (
            <View style={styles.selectedWitness}>
              <View style={styles.selectedWitnessInfo}>
                <Text style={styles.selectedWitnessName}>{witnessName} ✓</Text>
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
                    <Text style={styles.manualEntryLink}>I'll hold myself accountable</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Returning user: recent chips + contacts */}
              {recentWitnesses.length > 0 ? (
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
                label={amt === 0 ? '$0 (free)' : `$${amt}`}
                active={stakeAmount === amt}
                onPress={() => setStakeAmount(amt)}
              />
            ))}
          </View>

          {stakeAmount > 0 ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>IF YOU BREAK YOUR VOW, MONEY GOES TO...</Text>
              <View style={styles.chipRow}>
                <ChoiceChip label="A charity" active={consequence === 'charity'} onPress={() => setConsequence('charity')} />
                <ChoiceChip label="A cause you hate" active={consequence === 'anti'} onPress={() => setConsequence('anti')} />
              </View>
              <View style={styles.chipRow}>
                {destinations.map((d) => (
                  <ChoiceChip key={d} label={d} active={destination === d} onPress={() => setDestination(d)} />
                ))}
              </View>
            </>
          ) : null}
        </RitualCard>

        {/* Deadline */}
        <RitualCard>
          <Text style={styles.sectionLabel}>DEADLINE</Text>
          <View style={styles.chipRow}>
            {([
              ['tomorrow', 'Tomorrow'],
              ['end_of_week', 'End of week'],
              ['in_7_days', 'In 7 days'],
              ['in_30_days', 'A month'],
              ['custom', 'Pick date'],
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
          {showDatePicker && deadlinePreset === 'custom' ? (
            <DateTimePicker
              value={customDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
          ) : null}
          <Text style={styles.deadlineHint}>Ends {formatDateShort(deadlineDate)}</Text>
        </RitualCard>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Oath */}
        <Pressable onPress={() => { setOathChecked(!oathChecked); void Haptics.selectionAsync(); }} style={styles.oathRow}>
          <View style={[styles.checkbox, oathChecked && styles.checkboxChecked]}>
            {oathChecked ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.oathText}>I solemnly swear to honor this vow and accept the consequences.</Text>
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
  pageTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: serifFont,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sectionLabel: {
    color: palette.goldBright,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 4,
  },
  textInput: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 80,
    textAlignVertical: 'top',
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
  deadlineHint: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 4,
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
});

import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Animated,
  Easing,
  Modal,
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

import ContactPickerModal from '@/components/contact-picker-modal';

import AuthSheet from '@/components/auth-sheet';
import {
  charities,
  antiCauses,
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
const STAKE_OPTIONS = [...defaultStakeAmounts];

const GOLD = '#D9B24A';
const GOLD_BRIGHT = '#E8C467';
const CREAM = '#F4EBD8';
const BG = '#0F0D0B';
const CARD = '#17130E';

const QUICK_VOW_STARTERS = [
  { text: 'work out 3x this week', stake: 25 },
  { text: 'no alcohol, 2 weeks', stake: 25 },
  { text: 'delete TikTok this week', stake: 25 },
  { text: 'ship my side project by Friday', stake: 50 },
];

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

function deadlineLabel(preset: DeadlinePreset, custom: Date): string {
  switch (preset) {
    case 'tomorrow': return 'Tomorrow';
    case 'end_of_week': return 'Sunday';
    case 'in_7_days': return '7 days';
    case 'in_30_days': return '30 days';
    case 'custom':
      return custom.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
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

type EditField = 'vow' | 'stake' | 'destination' | 'witness' | 'deadline' | null;

export default function QuickVowScreen() {
  const { isAuthenticated, session } = useAuth();

  const [vowText, setVowText] = useState('work out 3x this week');
  const [witnessName, setWitnessName] = useState('');
  const [witnessPhone, setWitnessPhone] = useState('');
  const [stakeAmount, setStakeAmount] = useState(25);
  const [consequence, setConsequence] = useState<ConsequenceType>('charity');
  const [destination, setDestination] = useState("St. Jude's");
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>('end_of_week');
  const [customDate, setCustomDate] = useState<Date>(getPresetDate('in_7_days'));
  const [recentWitnesses, setRecentWitnesses] = useState<RecentWitness[]>([]);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [editField, setEditField] = useState<EditField>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [sealing, setSealing] = useState(false);
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
  const [paidVowId, setPaidVowId] = useState<string | null>(null);
  const pendingSealRef = useRef(false);

  const vowFlow = useVowFlow();

  const deadlineDate = useMemo(
    () => deadlinePreset === 'custom' ? customDate : getPresetDate(deadlinePreset),
    [deadlinePreset, customDate],
  );

  // Load prior context
  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('vows')
        .select('witness_name, witness_phone, refined_text, stake_amount, destination, consequence')
        .eq('user_id', session.user.id)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        const seen = new Set<string>();
        const unique: RecentWitness[] = [];
        for (const row of data) {
          const key = `${row.witness_name}|${row.witness_phone || ''}`;
          if (!seen.has(key) && row.witness_name && row.witness_name !== 'Just me' && row.witness_name !== 'Your witness') {
            seen.add(key);
            unique.push({ name: row.witness_name, phone: row.witness_phone || '' });
          }
          if (unique.length >= 5) break;
        }
        setRecentWitnesses(unique);
        if (unique.length > 0 && !witnessName) {
          setWitnessName(unique[0].name);
          setWitnessPhone(unique[0].phone);
        }
        // Seed from last vow
        const last = data[0];
        if (last.refined_text) {
          const t = String(last.refined_text).replace(/^I\s+(will|vow to)\s+/i, '').replace(/\.$/, '').trim();
          if (t) setVowText(t);
        }
        if (typeof last.stake_amount === 'number') setStakeAmount(last.stake_amount);
        if (last.destination) setDestination(last.destination);
        if (last.consequence === 'charity' || last.consequence === 'anti') setConsequence(last.consequence);
      }

      try {
        const saved = await AsyncStorage.getItem('quickvow-defaults');
        if (saved) {
          const defaults = JSON.parse(saved);
          if (typeof defaults.stakeAmount === 'number') setStakeAmount(defaults.stakeAmount);
          if (defaults.consequence === 'charity' || defaults.consequence === 'anti') setConsequence(defaults.consequence);
          if (defaults.deadlinePreset) {
            const valid: DeadlinePreset[] = ['tomorrow', 'end_of_week', 'in_7_days', 'in_30_days', 'custom'];
            if (valid.includes(defaults.deadlinePreset)) setDeadlinePreset(defaults.deadlinePreset);
          }
        }
      } catch {}
    })();
  }, [session?.user?.id]);

  // Keep destination valid
  useEffect(() => {
    const list = consequence === 'charity' ? charities : antiCauses;
    if (!list.includes(destination)) setDestination(list[0]);
  }, [consequence, destination]);

  // Vowing-now ticker (social proof animation)
  const [vowingNow] = useState(() => Math.floor(Math.random() * 5) + 2);
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Entrance
  const fadeIn = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fadeIn, cardSlide]);

  const finalText = useMemo(() => {
    const t = vowText.trim();
    if (!t) return '';
    const cap = t.charAt(0).toUpperCase() + t.slice(1);
    return cap.endsWith('.') || cap.endsWith('!') ? cap : cap + '.';
  }, [vowText]);

  // --- Seal flow ---
  const invokeSealEdgeFunction = async (vowId: string) => {
    const { error } = await supabase.functions.invoke('seal-vow', { body: { vow_id: vowId } });
    if (error) throw new Error(`seal-vow failed: ${error.message || 'Unknown error'}`);
  };

  const devBypassSeal = useCallback(async (resolvedWitnessName: string, resolvedWitnessPhone: string | null) => {
    setSealing(true);
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
    setSealing(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await handleSealSuccess(devVowId, devToken);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vowText, finalText, stakeAmount, consequence, destination, deadlineDate]);

  const handleSealFlow = useCallback(async () => {
    if (sealing) return;
    setSealing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const resolvedWitnessName = (!witnessName || witnessName === 'Just me') ? 'Just me' : witnessName;
    const resolvedWitnessPhone = witnessPhone ? formatE164(witnessPhone) : null;

    if (IS_EXPO_GO) {
      if (stakeAmount === 0) {
        await devBypassSeal(resolvedWitnessName, resolvedWitnessPhone);
        return;
      }
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

      if (stakeAmount === 0) {
        await invokeSealEdgeFunction(vowId);
        setSealing(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await handleSealSuccess(vowId, witnessInviteToken);
        return;
      }

      const { clientSecret } = await createPaymentIntent(vowId, stakeAmount * 100);
      await setupPaymentSheet(clientSecret);
      const paid = await showPaymentSheet();
      if (!paid) {
        await voidVowV2(vowId).catch(() => {});
        setSealing(false);
        Alert.alert('Payment cancelled', 'No charge was made.');
        return;
      }
      paymentCaptured = true;
      setPaidVowId(vowId);
      await invokeSealEdgeFunction(vowId);
      setSealing(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await handleSealSuccess(vowId, witnessInviteToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSealing(false);
      if (paidVowId || paymentCaptured) {
        setPaidVowId(vowId || paidVowId);
        Alert.alert('Almost there', 'Your payment went through but we couldn\'t finish sealing. Tap "Lock it in" again.');
      } else {
        if (vowId) await voidVowV2(vowId).catch(() => {});
        Alert.alert('Something went wrong', msg || 'Please try again.');
      }
    }
  }, [sealing, vowText, finalText, witnessName, witnessPhone, stakeAmount, consequence, destination, deadlineDate, paidVowId, devBypassSeal]);

  const handleLockIn = () => {
    if (!vowText.trim() || sealing) return;
    if (!isAuthenticated) {
      setAuthSheetVisible(true);
      return;
    }
    void handleSealFlow();
  };

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
    if (isAuthenticated) void handleSealFlow();
    else pendingSealRef.current = true;
  }, [handleSealFlow, isAuthenticated]);

  const handleSealSuccess = async (resolvedVowId: string, resolvedToken: string | null) => {
    try {
      await AsyncStorage.setItem('quickvow-defaults', JSON.stringify({ stakeAmount, consequence, deadlinePreset }));
    } catch {}
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

    const shareUrl = resolvedToken ? `https://unbreakablevow.app/w/${resolvedToken}` : '';
    if (witnessName && witnessName !== 'Just me' && shareUrl) {
      try {
        await Share.share({
          message: stakeAmount > 0
            ? `I made a vow: "${finalText.replace(/\.$/, '').slice(0, 60)}" — $${stakeAmount} on the line and you're the judge → ${shareUrl}`
            : `I made a vow: "${finalText.replace(/\.$/, '').slice(0, 60)}" — and named you the judge → ${shareUrl}`,
        });
      } catch {}
    }
    router.push({ pathname: '/live', params: { justSealed: '1' } });
  };

  // Press CTA animation
  const btnScale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();

  const handleStarter = (text: string, stake: number) => {
    void Haptics.selectionAsync();
    setVowText(text);
    setStakeAmount(stake);
  };

  const witnessDisplay = witnessName && witnessName !== 'Just me' ? witnessName : 'a friend';
  const destinations = consequence === 'charity' ? charities : antiCauses;
  const [showStarters, setShowStarters] = useState(false);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, backgroundColor: BG }} />
      </View>
      <View pointerEvents="none" style={styles.glowA} />
      <View pointerEvents="none" style={styles.glowB} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Minimal top bar: just a close */}
          <Animated.View style={[styles.topBar, { opacity: fadeIn }]}>
            <View style={styles.topBarLeft}>
              <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
              <Text style={styles.liveText}>{vowingNow} vowing now</Text>
            </View>
            <Pressable
              onPress={() => router.push('/dashboard')}
              hitSlop={16}
              style={styles.closeBtn}
              testID="quickvow-close"
            >
              <X color="rgba(244,235,216,0.45)" size={20} />
            </Pressable>
          </Animated.View>

          {/* THE VOW — framed editorial card */}
          <Animated.View
            style={[
              styles.vowCard,
              { opacity: fadeIn, transform: [{ translateY: cardSlide }] },
            ]}
          >
            <View style={styles.vowCardHeader}>
              <Text style={styles.eyebrow}>THE VOW</Text>
              <Pressable onPress={() => setShowStarters(true)} hitSlop={8}>
                <Text style={styles.repeatLink}>need an idea?</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => setEditField('vow')} style={styles.vowBodyPress}>
              <Text style={styles.vowBodyText} numberOfLines={3}>
                <Text style={styles.vowBodyLead}>I&apos;ll </Text>
                {vowText || 'add your vow'}
              </Text>
              <View style={styles.vowUnderline} />
            </Pressable>

            <View style={styles.vowMetaRow}>
              <Pressable onPress={() => setEditField('witness')} style={styles.vowMetaItem} hitSlop={6}>
                <Text style={styles.metaLabel}>JUDGE</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{witnessDisplay}</Text>
              </Pressable>
              <View style={styles.vowMetaSep} />
              <Pressable onPress={() => setEditField('deadline')} style={styles.vowMetaItem} hitSlop={6}>
                <Text style={styles.metaLabel}>BY</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {deadlineDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          <View style={{ flex: 1, minHeight: 20 }} />

          {/* STAKE — the dramatic centerpiece */}
          <Animated.View style={[styles.stakeCenter, { opacity: fadeIn }]}>
            <Text style={styles.eyebrowCenter}>ON THE LINE</Text>
            <Pressable
              onPress={() => setEditField('stake')}
              style={styles.stakeAmountPress}
              testID="edit-stake"
              hitSlop={8}
            >
              <Text style={styles.stakeAmountHero}>${stakeAmount}</Text>
            </Pressable>
            <View style={styles.breakLine}>
              <Text style={styles.breakLineText}>if I break it, it goes to </Text>
              <Pressable onPress={() => setEditField('destination')} hitSlop={6}>
                <Text style={styles.breakLineDest} numberOfLines={1}>{destination}</Text>
              </Pressable>
            </View>
          </Animated.View>

          <View style={{ flex: 1, minHeight: 24 }} />

          {/* CTA — cream pill, dark arrow */}
          <Animated.View style={[styles.ctaBlock, { opacity: fadeIn, transform: [{ scale: btnScale }] }]}>
            <Pressable
              disabled={!vowText.trim() || sealing}
              onPress={handleLockIn}
              onPressIn={pressIn}
              onPressOut={pressOut}
              style={styles.ctaBtn}
              testID="quickvow-seal"
            >
              <Text style={styles.ctaText}>
                {sealing ? 'Processing…' : `Lock it in`}
              </Text>
              <Text style={styles.ctaDash}>  —  </Text>
              <Text style={styles.ctaAmount}>${stakeAmount}</Text>
              <View style={styles.ctaArrow}><Text style={styles.ctaArrowText}>{'\u2192'}</Text></View>
            </Pressable>

            <Pressable onPress={() => router.push('/cast')} hitSlop={10} style={styles.dareLink}>
              <Text style={styles.dareLinkText}>
                or dare {witnessDisplay === 'a friend' ? 'a friend' : witnessDisplay} to match  →
              </Text>
            </Pressable>

            <Text style={styles.tagline}>Keep your word. Keep your ${stakeAmount}.</Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Ideas sheet — moved out of the hero */}
      <EditSheet visible={showStarters} title="A few to steal" onClose={() => setShowStarters(false)}>
        <View style={styles.startersList}>
          {QUICK_VOW_STARTERS.map((s) => (
            <Pressable
              key={s.text}
              onPress={() => { handleStarter(s.text, s.stake); setShowStarters(false); }}
              style={({ pressed }) => [styles.starterRow, pressed && styles.starterRowPressed]}
              testID={`starter-${s.text}`}
            >
              <Text style={styles.starterText} numberOfLines={1}>{s.text}</Text>
              <Text style={styles.starterStake}>${s.stake}</Text>
            </Pressable>
          ))}
        </View>
      </EditSheet>

      {/* ---- Edit sheets ---- */}
      <EditSheet visible={editField === 'vow'} title="What will you do?" onClose={() => setEditField(null)}>
        <TextInput
          value={vowText}
          onChangeText={setVowText}
          placeholder="work out 3x this week"
          placeholderTextColor="rgba(244,235,216,0.3)"
          style={styles.editInput}
          autoFocus
          multiline
          testID="edit-vow-input"
        />
        <SheetPrimaryButton label="Done" onPress={() => { void Haptics.selectionAsync(); setEditField(null); }} />
      </EditSheet>

      <EditSheet visible={editField === 'stake'} title="How much is on the line?" onClose={() => setEditField(null)}>
        <View style={styles.stakeGrid}>
          {STAKE_OPTIONS.map((amt) => (
            <Pressable
              key={amt}
              onPress={() => { void Haptics.selectionAsync(); setStakeAmount(amt); }}
              style={[styles.stakeCell, stakeAmount === amt && styles.stakeCellActive]}
            >
              <Text style={[styles.stakeCellText, stakeAmount === amt && styles.stakeCellTextActive]}>${amt}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => { void Haptics.selectionAsync(); setStakeAmount(0); }}
          style={styles.accountabilityRow}
        >
          <Text style={[styles.accountabilityText, stakeAmount === 0 && styles.accountabilityActive]}>
            {stakeAmount === 0 ? '✓ Accountability only (no stake)' : 'or go accountability only'}
          </Text>
        </Pressable>
        <SheetPrimaryButton label="Done" onPress={() => setEditField(null)} />
      </EditSheet>

      <EditSheet visible={editField === 'destination'} title="If you break it, where does it go?" onClose={() => setEditField(null)}>
        <View style={styles.consequenceToggle}>
          <Pressable
            onPress={() => setConsequence('charity')}
            style={[styles.toggleSeg, consequence === 'charity' && styles.toggleSegActive]}
          >
            <Text style={[styles.toggleSegText, consequence === 'charity' && styles.toggleSegTextActive]}>A good cause</Text>
          </Pressable>
          <Pressable
            onPress={() => setConsequence('anti')}
            style={[styles.toggleSeg, consequence === 'anti' && styles.toggleSegActive]}
          >
            <Text style={[styles.toggleSegText, consequence === 'anti' && styles.toggleSegTextActive]}>An anti-cause</Text>
          </Pressable>
        </View>
        <View style={styles.destList}>
          {destinations.map((d) => (
            <Pressable
              key={d}
              onPress={() => { void Haptics.selectionAsync(); setDestination(d); }}
              style={[styles.destRow, destination === d && styles.destRowActive]}
            >
              <Text style={[styles.destRowText, destination === d && styles.destRowTextActive]}>{d}</Text>
              {destination === d ? <Text style={styles.destCheck}>✓</Text> : null}
            </Pressable>
          ))}
        </View>
        <SheetPrimaryButton label="Done" onPress={() => setEditField(null)} />
      </EditSheet>

      <EditSheet visible={editField === 'witness'} title="Who's the judge?" onClose={() => setEditField(null)}>
        {recentWitnesses.length > 0 ? (
          <View style={styles.destList}>
            {recentWitnesses.map((w) => {
              const active = witnessName === w.name && witnessPhone === w.phone;
              return (
                <Pressable
                  key={w.name + w.phone}
                  onPress={() => { void Haptics.selectionAsync(); setWitnessName(w.name); setWitnessPhone(w.phone); }}
                  style={[styles.destRow, active && styles.destRowActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.destRowText, active && styles.destRowTextActive]}>{w.name}</Text>
                    {w.phone ? <Text style={styles.destRowSub}>{w.phone}</Text> : null}
                  </View>
                  {active ? <Text style={styles.destCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <Pressable
          onPress={() => { setEditField(null); setTimeout(() => setContactPickerVisible(true), 180); }}
          style={styles.contactBtn}
        >
          <Text style={styles.contactBtnText}>Pick from contacts</Text>
        </Pressable>
        <Pressable
          onPress={() => { void Haptics.selectionAsync(); setWitnessName('Just me'); setWitnessPhone(''); setEditField(null); }}
          style={styles.accountabilityRow}
        >
          <Text style={styles.accountabilityText}>No witness — just my word</Text>
        </Pressable>
      </EditSheet>

      <EditSheet visible={editField === 'deadline'} title="By when?" onClose={() => setEditField(null)}>
        <View style={styles.destList}>
          {([
            ['tomorrow', 'Tomorrow', '24 hours'],
            ['end_of_week', 'End of this week', 'Sunday night'],
            ['in_7_days', '7 days', 'A full week'],
            ['in_30_days', '30 days', 'A real test'],
          ] as [DeadlinePreset, string, string][]).map(([id, label, hint]) => {
            const active = deadlinePreset === id;
            return (
              <Pressable
                key={id}
                onPress={() => { void Haptics.selectionAsync(); setDeadlinePreset(id); }}
                style={[styles.destRow, active && styles.destRowActive]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.destRowText, active && styles.destRowTextActive]}>{label}</Text>
                  <Text style={styles.destRowSub}>{hint}</Text>
                </View>
                {active ? <Text style={styles.destCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => { void Haptics.selectionAsync(); setDeadlinePreset('custom'); setShowDatePicker(true); }}
            style={[styles.destRow, deadlinePreset === 'custom' && styles.destRowActive]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.destRowText, deadlinePreset === 'custom' && styles.destRowTextActive]}>Pick a date</Text>
              {deadlinePreset === 'custom' ? (
                <Text style={styles.destRowSub}>{customDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
              ) : null}
            </View>
            {deadlinePreset === 'custom' ? <Text style={styles.destCheck}>✓</Text> : null}
          </Pressable>
        </View>
        {showDatePicker && deadlinePreset === 'custom' ? (
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
        ) : null}
        <SheetPrimaryButton label="Done" onPress={() => setEditField(null)} />
      </EditSheet>

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
    </View>
  );
}

// -----------------------------------------------------------------------
// Edit sheet — reusable bottom sheet
// -----------------------------------------------------------------------

interface EditSheetProps {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

function EditSheet({ visible, title, children, onClose }: EditSheetProps) {
  const translate = useRef(new Animated.Value(600)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(translate, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translate, { toValue: 600, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible, backdrop, translate]);

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={sheetStyles.root}>
        <Animated.View style={[sheetStyles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY: translate }] }]}>
          <View style={sheetStyles.handleWrap}><View style={sheetStyles.handle} /></View>
          <Text style={sheetStyles.title}>{title}</Text>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

function SheetPrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={sheetStyles.doneBtn}>
      <Text style={sheetStyles.doneBtnText}>{label}</Text>
    </Pressable>
  );
}

// -----------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  glowA: {
    position: 'absolute',
    top: -140,
    left: -60,
    width: 480,
    height: 480,
    borderRadius: 480,
    backgroundColor: 'rgba(217,178,74,0.06)',
  },
  glowB: {
    position: 'absolute',
    bottom: -180,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 400,
    backgroundColor: 'rgba(217,178,74,0.04)',
  },
  scroll: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28, minHeight: '100%' as const, flexGrow: 1 },

  // Vow card — framed editorial
  vowCard: {
    backgroundColor: 'rgba(244,235,216,0.025)',
    borderWidth: 1,
    borderColor: 'rgba(244,235,216,0.1)',
    borderRadius: 18,
    padding: 22,
    paddingTop: 18,
  },
  vowCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  vowBodyPress: {
    marginBottom: 18,
  },
  vowBodyText: {
    fontFamily: serifFont,
    color: CREAM,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.6,
    fontWeight: '500' as const,
  },
  vowBodyLead: {
    fontFamily: serifFont,
    color: 'rgba(244,235,216,0.55)',
    fontStyle: 'italic',
    fontWeight: '400' as const,
  },
  vowUnderline: {
    height: 1,
    backgroundColor: 'rgba(244,235,216,0.18)',
    marginTop: 10,
  },
  vowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vowMetaItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flex: 1,
  },
  vowMetaSep: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(244,235,216,0.14)',
    marginHorizontal: 14,
  },

  // Stake centerpiece
  stakeCenter: {
    alignItems: 'center',
    paddingTop: 12,
  },
  eyebrowCenter: {
    color: 'rgba(244,235,216,0.45)',
    fontSize: 10.5,
    letterSpacing: 2.6,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  stakeAmountPress: {
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  stakeAmountHero: {
    fontFamily: serifFont,
    color: GOLD_BRIGHT,
    fontSize: 88,
    lineHeight: 96,
    fontWeight: '700' as const,
    letterSpacing: -3,
  },
  breakLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
  },
  breakLineText: {
    fontFamily: serifFont,
    fontStyle: 'italic',
    color: 'rgba(244,235,216,0.55)',
    fontSize: 14,
  },
  breakLineDest: {
    fontFamily: serifFont,
    fontStyle: 'italic',
    color: CREAM,
    fontSize: 14,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(244,235,216,0.35)',
  },
  dareLink: {
    alignItems: 'center',
    paddingVertical: 4,
    marginTop: 4,
  },
  dareLinkText: {
    fontFamily: serifFont,
    fontStyle: 'italic',
    color: GOLD,
    fontSize: 15,
  },
  tagline: {
    fontFamily: serifFont,
    fontStyle: 'italic',
    color: 'rgba(244,235,216,0.38)',
    fontSize: 13,
    textAlign: 'center' as const,
    marginTop: 2,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 56,
    paddingHorizontal: 2,
  },
  hero: {
    marginBottom: 40,
  },
  sentenceTextDim: {
    fontFamily: serifFont,
    color: 'rgba(244,235,216,0.55)',
    fontSize: 18,
    lineHeight: 28,
    fontStyle: 'italic',
  },
  inlineMeta: {
    fontFamily: serifFont,
    color: CREAM,
    fontSize: 18,
    lineHeight: 28,
    fontStyle: 'italic',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(244,235,216,0.3)',
  },
  stakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  stakePrefix: {
    fontFamily: serifFont,
    fontStyle: 'italic',
    color: 'rgba(244,235,216,0.55)',
    fontSize: 16,
  },
  stakeChip: {
    backgroundColor: 'rgba(217,178,74,0.12)',
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  stakeChipAmount: {
    fontFamily: serifFont,
    color: GOLD_BRIGHT,
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  destChip: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244,235,216,0.25)',
    borderStyle: 'dashed' as const,
    paddingBottom: 2,
    maxWidth: '60%',
  },
  destChipText: {
    fontFamily: serifFont,
    color: CREAM,
    fontSize: 16,
    fontStyle: 'italic',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
  },
  secondaryLink: {
    color: 'rgba(244,235,216,0.5)',
    fontSize: 13,
    fontFamily: serifFont,
    fontStyle: 'italic',
    textDecorationLine: 'underline',
  },
  secondaryDot: {
    color: 'rgba(244,235,216,0.3)',
    fontSize: 14,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { color: BG, fontWeight: '900' as const, fontSize: 11 },
  brandName: {
    color: CREAM,
    fontWeight: '800' as const,
    letterSpacing: 2.6,
    fontSize: 12,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6FCF97',
    marginRight: 2,
  },
  liveText: {
    fontFamily: serifFont,
    fontStyle: 'italic',
    color: '#6FCF97',
    fontSize: 13,
  },
  closeBtn: {
    marginLeft: 6,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main card
  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(217,178,74,0.18)',
    padding: 22,
    paddingBottom: 18,
    marginBottom: 24,
    shadowColor: GOLD,
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  eyebrow: {
    color: 'rgba(244,235,216,0.45)',
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '700' as const,
  },
  repeatLink: {
    color: GOLD,
    fontFamily: serifFont,
    fontStyle: 'italic',
    fontSize: 13,
  },
  sentenceBlock: { gap: 10, marginBottom: 18 },
  sentenceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sentenceText: {
    fontFamily: serifFont,
    color: CREAM,
    fontSize: 34,
    lineHeight: 44,
    letterSpacing: -0.8,
    fontWeight: '400' as const,
  },
  sentenceTextItalic: {
    fontFamily: serifFont,
    color: 'rgba(244,235,216,0.85)',
    fontSize: 19,
    lineHeight: 32,
    fontStyle: 'italic',
    letterSpacing: -0.2,
  },
  fillButton: {
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingHorizontal: 2,
    paddingBottom: 2,
    maxWidth: '90%',
  },
  fillText: {
    fontFamily: serifFont,
    color: CREAM,
    fontSize: 34,
    lineHeight: 44,
    fontWeight: '500' as const,
    letterSpacing: -0.8,
  },
  fillButtonAmber: {
    borderWidth: 1,
    borderColor: 'rgba(217,178,74,0.55)',
    backgroundColor: 'rgba(217,178,74,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
    marginHorizontal: 2,
  },
  fillUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217,178,74,0.45)',
    borderStyle: 'dashed' as const,
    paddingHorizontal: 2,
    paddingBottom: 1,
    marginHorizontal: 2,
    maxWidth: '70%',
  },
  fillTextAmber: {
    fontFamily: serifFont,
    color: GOLD_BRIGHT,
    fontSize: 19,
    fontWeight: '700' as const,
  },
  metaDivider: {
    height: 1,
    backgroundColor: 'rgba(244,235,216,0.08)',
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  metaSep: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(244,235,216,0.12)',
    marginHorizontal: 12,
  },
  metaLabel: {
    color: 'rgba(244,235,216,0.4)',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700' as const,
  },
  metaValueWrap: {
    flexShrink: 1,
  },
  metaValue: {
    fontFamily: serifFont,
    color: CREAM,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  metaUnderline: {
    height: 1,
    backgroundColor: 'rgba(244,235,216,0.25)',
    borderStyle: 'dashed' as const,
    marginTop: 1,
  },

  // Starters
  startersBlock: { marginBottom: 8 },
  startersLabel: {
    color: 'rgba(244,235,216,0.4)',
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '700' as const,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  startersList: { gap: 8 },
  starterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: 'rgba(244,235,216,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(244,235,216,0.08)',
    borderRadius: 14,
  },
  starterRowPressed: {
    backgroundColor: 'rgba(217,178,74,0.08)',
    borderColor: 'rgba(217,178,74,0.3)',
  },
  starterText: {
    color: CREAM,
    fontSize: 15,
    fontFamily: serifFont,
    flex: 1,
    paddingRight: 10,
  },
  starterStake: {
    color: GOLD,
    fontFamily: serifFont,
    fontSize: 15,
    fontWeight: '600' as const,
  },

  // CTA
  ctaBlock: { gap: 10, marginTop: 8 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CREAM,
    borderRadius: 999,
    paddingVertical: 20,
    paddingHorizontal: 22,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    ...(Platform.OS === 'android' ? { elevation: 6 } : {}),
  },
  ctaText: {
    color: BG,
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  ctaDash: {
    color: 'rgba(15,13,11,0.45)',
    fontFamily: serifFont,
    fontSize: 16,
    fontWeight: '400' as const,
  },
  ctaAmount: {
    color: 'rgba(15,13,11,0.85)',
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '700' as const,
    marginRight: 12,
  },
  ctaArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrowText: {
    color: CREAM,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  dareBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(217,178,74,0.3)',
    alignItems: 'center',
  },
  dareText: {
    fontFamily: serifFont,
    fontStyle: 'italic',
    color: GOLD,
    fontSize: 15,
  },
  ctaTagline: {
    fontFamily: serifFont,
    fontStyle: 'italic',
    color: 'rgba(244,235,216,0.5)',
    fontSize: 13,
    textAlign: 'center' as const,
    marginTop: 4,
  },
  guidedLink: {
    paddingVertical: 20,
    alignItems: 'center' as const,
  },
  guidedLinkText: {
    color: 'rgba(244,235,216,0.4)',
    fontSize: 13,
    textDecorationLine: 'underline' as const,
    fontFamily: serifFont,
    fontStyle: 'italic',
  },
});

const sheetStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: '#17130E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(217,178,74,0.18)',
  },
  handleWrap: { alignItems: 'center', paddingVertical: 10, marginBottom: 6 },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: 'rgba(244,235,216,0.25)' },
  title: {
    fontFamily: serifFont,
    color: CREAM,
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    marginBottom: 18,
  },
  doneBtn: {
    marginTop: 18,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    color: BG,
    fontFamily: serifFont,
    fontSize: 16,
    fontWeight: '800' as const,
  },
});

const _editSheetStyles = StyleSheet.create({
  editInput: {},
});
void _editSheetStyles;

// Inline style tokens referenced above but declared as inline styles for clarity:
const extraStyles = StyleSheet.create({
  editInput: {
    fontFamily: serifFont,
    color: CREAM,
    fontSize: 20,
    borderWidth: 1,
    borderColor: 'rgba(217,178,74,0.35)',
    borderRadius: 14,
    padding: 16,
    minHeight: 100,
    backgroundColor: 'rgba(244,235,216,0.03)',
    textAlignVertical: 'top',
  },
  stakeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  stakeCell: {
    flexBasis: '47%',
    flexGrow: 1,
    paddingVertical: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(244,235,216,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(244,235,216,0.1)',
    alignItems: 'center',
  },
  stakeCellActive: {
    backgroundColor: 'rgba(217,178,74,0.15)',
    borderColor: GOLD,
  },
  stakeCellText: {
    fontFamily: serifFont,
    color: CREAM,
    fontSize: 22,
    fontWeight: '700' as const,
  },
  stakeCellTextActive: { color: GOLD_BRIGHT },
  accountabilityRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  accountabilityText: {
    color: 'rgba(244,235,216,0.55)',
    fontFamily: serifFont,
    fontStyle: 'italic',
    fontSize: 14,
  },
  accountabilityActive: {
    color: GOLD_BRIGHT,
  },
  consequenceToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(244,235,216,0.04)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(244,235,216,0.08)',
  },
  toggleSeg: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  toggleSegActive: { backgroundColor: 'rgba(217,178,74,0.18)' },
  toggleSegText: {
    color: 'rgba(244,235,216,0.6)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  toggleSegTextActive: { color: GOLD_BRIGHT },
  destList: { gap: 8 },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(244,235,216,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(244,235,216,0.08)',
  },
  destRowActive: {
    backgroundColor: 'rgba(217,178,74,0.12)',
    borderColor: GOLD,
  },
  destRowText: {
    fontFamily: serifFont,
    color: CREAM,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  destRowTextActive: { color: GOLD_BRIGHT },
  destRowSub: {
    fontFamily: serifFont,
    fontStyle: 'italic',
    color: 'rgba(244,235,216,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  destCheck: {
    color: GOLD_BRIGHT,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  contactBtn: {
    marginTop: 14,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: 'center',
    backgroundColor: 'rgba(217,178,74,0.08)',
  },
  contactBtnText: {
    fontFamily: serifFont,
    color: GOLD_BRIGHT,
    fontSize: 15,
    fontWeight: '700' as const,
  },
});

// Apply extras into the main styles map
Object.assign(styles, extraStyles);

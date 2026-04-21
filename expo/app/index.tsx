import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { serifFont, vowExamples } from '@/constants/unbreakable';
import { supabase } from '@/lib/supabase';
import { useVowFlow } from '@/providers/vow-flow';

type DeadlinePreset = 'tomorrow' | 'end_of_week' | 'in_7_days' | 'in_30_days';

function getPresetDate(preset: DeadlinePreset): Date {
  const d = new Date();
  switch (preset) {
    case 'tomorrow':
      d.setDate(d.getDate() + 1);
      break;
    case 'end_of_week': {
      const diff = 7 - d.getDay();
      d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
      break;
    }
    case 'in_7_days':
      d.setDate(d.getDate() + 7);
      break;
    case 'in_30_days':
      d.setDate(d.getDate() + 30);
      break;
  }
  d.setHours(23, 59, 59, 0);
  return d;
}

function formatDeadline(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const DEADLINE_OPTIONS: { id: DeadlinePreset; label: string; hint: string }[] = [
  { id: 'tomorrow', label: 'Tomorrow', hint: '24 hours. No room to hide.' },
  { id: 'end_of_week', label: 'End of this week', hint: 'Sunday night. Verdict time.' },
  { id: 'in_7_days', label: '7 days', hint: 'A full week to prove it.' },
  { id: 'in_30_days', label: '30 days', hint: 'A real habit. A real test.' },
];

export default function HomeScreen() {
  const { setRawInput, setRefinedText, setDeadline, shouldSkipRefine } = useVowFlow();
  const searchParams = useLocalSearchParams<{ guided?: string }>();
  const [input, setInput] = useState<string>('');
  const [focused, setFocused] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (searchParams.guided === '1') return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { count } = await supabase
        .from('vows')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .neq('status', 'draft');
      if (count && count > 0) {
        router.replace('/quick-vow');
      }
    })();
  }, [searchParams.guided]);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(12)).current;
  const inputFade = useRef(new Animated.Value(0)).current;
  const inputSlide = useRef(new Animated.Value(16)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;
  const ctaSlide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    console.log('[HomeScreen] mounted, starting entrance animations');
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(80),
        Animated.parallel([
          Animated.timing(heroFade, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(heroSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(160),
        Animated.parallel([
          Animated.timing(inputFade, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(inputSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(240),
        Animated.parallel([
          Animated.timing(ctaFade, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(ctaSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canContinue = useMemo(() => input.trim().length > 0, [input]);

  // Deadline modal state — default is end of this week (auto-populated, editable)
  const [deadlineOpen, setDeadlineOpen] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<DeadlinePreset>('end_of_week');
  const deadlineTranslate = useRef(new Animated.Value(600)).current;
  const deadlineBackdrop = useRef(new Animated.Value(0)).current;

  const openDeadline = () => {
    console.log('[HomeScreen] open deadline picker sheet');
    void Haptics.selectionAsync();
    Keyboard.dismiss();
    setDeadlineOpen(true);
    Animated.parallel([
      Animated.timing(deadlineBackdrop, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(deadlineTranslate, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const submitVow = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const deadlineDate = getPresetDate(selectedPreset);
    console.log('[HomeScreen] submit with deadline:', selectedPreset, deadlineDate.toISOString());
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Keyboard.dismiss();
    setRawInput(trimmed);
    setDeadline(deadlineDate.toISOString());
    if (shouldSkipRefine(trimmed)) {
      setRefinedText(trimmed);
      router.push('/stake');
    } else {
      router.push('/refine');
    }
  };

  const closeDeadline = () => {
    Animated.parallel([
      Animated.timing(deadlineBackdrop, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(deadlineTranslate, {
        toValue: 600,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setDeadlineOpen(false));
  };

  const confirmDeadline = () => {
    console.log('[HomeScreen] confirm deadline picker:', selectedPreset);
    void Haptics.selectionAsync();
    Animated.parallel([
      Animated.timing(deadlineBackdrop, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(deadlineTranslate, {
        toValue: 600,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setDeadlineOpen(false));
  };

  const handleChip = (example: string) => {
    void Haptics.selectionAsync();
    setInput(example);
    Keyboard.dismiss();
  };

  const [howItWorksOpen, setHowItWorksOpen] = useState<boolean>(false);
  const sheetTranslate = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openHowItWorks = () => {
    console.log('[HomeScreen] open how it works');
    void Haptics.selectionAsync();
    setHowItWorksOpen(true);
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(sheetTranslate, {
        toValue: 0,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeHowItWorks = () => {
    console.log('[HomeScreen] close how it works');
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(sheetTranslate, {
        toValue: 600,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setHowItWorksOpen(false));
  };

  const btnScale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  };

  const selectedDate = useMemo(() => getPresetDate(selectedPreset), [selectedPreset]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, backgroundColor: '#0F0D0B' }} />
      </View>
      <View pointerEvents="none" style={styles.ambientGlow} />
      <View pointerEvents="none" style={styles.ambientGlow2} />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nav */}
          <Animated.View style={[styles.navRow, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            <View style={styles.navIcon}><Text style={styles.navIconText}>◆</Text></View>
            <Text style={styles.navName} numberOfLines={1}>UNBREAKABLE VOW</Text>
            <Text style={styles.dollarProof} numberOfLines={1}>$47,320 on line</Text>
          </Animated.View>

          {/* Hero */}
          <Animated.View style={[styles.heroBlock, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
            <Text style={styles.heroLine1}>Make a vow.</Text>
            <Text style={styles.heroLine2}>Mean it.</Text>
            <Text style={styles.explainer}>
              Put money on a goal. A friend decides if you pulled it off. Break it — you pay, to charity.
            </Text>
          </Animated.View>

          {/* Input */}
          <Animated.View
            style={[
              styles.inputSection,
              { opacity: inputFade, transform: [{ translateY: inputSlide }] },
            ]}
          >
            <Text style={[styles.inputLabel, focused && styles.inputLabelFocused]}>What will you commit to?</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="gym 3x this week"
              placeholderTextColor="rgba(222,210,192,0.35)"
              value={input}
              onChangeText={setInput}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={submitVow}
              returnKeyType="go"
              testID="vow-input"
              multiline
            />
            <View style={[styles.inputLine, focused && styles.inputLineFocused]} />

            {/* Auto-populated deadline chip — tap to change */}
            <Pressable
              onPress={openDeadline}
              style={styles.deadlineChip}
              hitSlop={6}
              testID="deadline-chip"
            >
              <View style={styles.deadlineChipDot} />
              <Text style={styles.deadlineChipLabel}>Verdict </Text>
              <Text style={styles.deadlineChipValue}>{formatDeadline(selectedDate)}</Text>
              <Text style={styles.deadlineChipEdit}>  change</Text>
            </Pressable>
            <View style={styles.chipsRow}>
              {vowExamples.map((example) => (
                <Pressable
                  key={example}
                  onPress={() => handleChip(example)}
                  style={[styles.chip, input === example && styles.chipActive]}
                  testID={`chip-${example}`}
                >
                  <Text style={[styles.chipText, input === example && styles.chipTextActive]}>{example}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* CTA */}
          <Animated.View style={[styles.ctaSection, { opacity: ctaFade, transform: [{ translateY: ctaSlide }] }]}>
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable
                disabled={!canContinue}
                onPress={submitVow}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[styles.ctaWrap, canContinue && styles.ctaWrapGold]}
                testID="home-continue"
              >
                <Text style={[styles.ctaText, canContinue && styles.ctaTextGold]}>Make my vow  {'\u2192'}</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Pressable onPress={openHowItWorks} testID="how-it-works-trigger" hitSlop={12}>
              <Text style={styles.footerText}>{'How it works  \u2197'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Deadline modal */}
      <Modal
        visible={deadlineOpen}
        transparent
        animationType="none"
        onRequestClose={closeDeadline}
      >
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.backdrop, { opacity: deadlineBackdrop }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDeadline} />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: deadlineTranslate }] },
            ]}
          >
            <View style={styles.sheetHandleWrap}>
              <View style={styles.sheetHandle} />
            </View>

            <Text style={styles.sheetEyebrow}>STEP 2 OF 3</Text>
            <Text style={styles.sheetTitle}>By when?</Text>
            <Text style={styles.sheetSubtitle}>
              Pick the moment of truth. Your witness gets the verdict.
            </Text>

            <View style={styles.deadlineList}>
              {DEADLINE_OPTIONS.map((opt) => {
                const active = selectedPreset === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSelectedPreset(opt.id);
                    }}
                    style={[styles.deadlineRow, active && styles.deadlineRowActive]}
                    testID={`deadline-${opt.id}`}
                  >
                    <View style={styles.deadlineTextWrap}>
                      <Text style={[styles.deadlineLabel, active && styles.deadlineLabelActive]}>{opt.label}</Text>
                      <Text style={styles.deadlineHint}>{opt.hint}</Text>
                    </View>
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.endsOnRow}>
              <Text style={styles.endsOnLabel}>Verdict on</Text>
              <Text style={styles.endsOnDate}>{formatDeadline(selectedDate)}</Text>
            </View>

            <Pressable
              onPress={confirmDeadline}
              style={styles.confirmBtn}
              testID="deadline-confirm"
            >
              <Text style={styles.confirmBtnText}>Set deadline</Text>
            </Pressable>

            <Pressable onPress={closeDeadline} hitSlop={10} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* How it works modal */}
      <Modal
        visible={howItWorksOpen}
        transparent
        animationType="none"
        onRequestClose={closeHowItWorks}
      >
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeHowItWorks} />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: sheetTranslate }] },
            ]}
          >
            <View style={styles.sheetHandleWrap}>
              <View style={styles.sheetHandle} />
            </View>
            <Text style={styles.sheetTitle}>How it works</Text>

            <View style={styles.stepsList}>
              {[
                'Pick a commitment',
                'Choose a friend to hold you to it',
                'Put $10\u2013$100 on the line',
                'Keep your word \u2014 every penny back',
                'Break it \u2014 your money goes to charity',
              ].map((step) => (
                <View key={step} style={styles.stepRow}>
                  <Text style={styles.stepArrow}>{'\u2192'}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sheetNote}>That\u2019s it. No catch.</Text>

            <Pressable
              onPress={closeHowItWorks}
              style={styles.gotItBtn}
              testID="how-it-works-close"
            >
              <Text style={styles.gotItText}>Got it</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const GOLD = '#D9B24A';
const GOLD_BRIGHT = '#E8C467';
const CREAM = '#F4EBD8';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F0D0B',
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 4,
    paddingBottom: 28,
    flexGrow: 1,
  },
  ambientGlow: {
    position: 'absolute',
    top: -120,
    left: '50%',
    marginLeft: -260,
    width: 520,
    height: 520,
    borderRadius: 520,
    backgroundColor: 'rgba(217,178,74,0.06)',
  },
  ambientGlow2: {
    position: 'absolute',
    bottom: -160,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 360,
    backgroundColor: 'rgba(217,178,74,0.04)',
  },
  // Nav
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 36,
    marginTop: 4,
  },
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconText: {
    fontSize: 13,
    color: '#0F0D0B',
    fontWeight: '900' as const,
  },
  navName: {
    fontSize: 12,
    color: CREAM,
    fontWeight: '800' as const,
    letterSpacing: 2.8,
    flexShrink: 1,
  },
  dollarProof: {
    fontFamily: serifFont,
    fontSize: 13,
    color: GOLD,
    fontStyle: 'italic',
    marginLeft: 'auto',
    opacity: 0.85,
  },
  // Hero
  heroBlock: {
    marginBottom: 8,
  },
  heroLine1: {
    color: '#FFFFFF',
    fontSize: 56,
    lineHeight: 58,
    fontWeight: '800' as const,
    fontFamily: serifFont,
    letterSpacing: -2,
  },
  heroLine2: {
    color: GOLD_BRIGHT,
    fontSize: 56,
    lineHeight: 58,
    fontWeight: '800' as const,
    fontFamily: serifFont,
    fontStyle: 'italic',
    letterSpacing: -2,
    marginBottom: 24,
  },
  explainer: {
    fontFamily: serifFont,
    fontSize: 17,
    lineHeight: 26,
    color: 'rgba(244,235,216,0.78)',
  },
  // Input
  inputSection: {
    marginTop: 38,
    marginBottom: 0,
  },
  inputLabel: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: serifFont,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  inputLabelFocused: {
    color: GOLD_BRIGHT,
  },
  input: {
    color: CREAM,
    fontSize: 22,
    fontFamily: serifFont,
    minHeight: 30,
    paddingVertical: 0,
    marginBottom: 0,
    fontWeight: '600' as const,
  },
  inputLine: {
    height: 1,
    backgroundColor: 'rgba(217,178,74,0.25)',
    marginTop: 14,
    marginBottom: 14,
  },
  inputLineFocused: {
    backgroundColor: GOLD,
    height: 1.5,
  },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(217,178,74,0.28)',
    backgroundColor: 'rgba(217,178,74,0.08)',
    marginBottom: 18,
  },
  deadlineChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD_BRIGHT,
    marginRight: 8,
  },
  deadlineChipLabel: {
    fontFamily: serifFont,
    color: 'rgba(244,235,216,0.6)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  deadlineChipValue: {
    fontFamily: serifFont,
    color: GOLD_BRIGHT,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  deadlineChipEdit: {
    fontFamily: serifFont,
    color: 'rgba(217,178,74,0.55)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244,235,216,0.14)',
    backgroundColor: 'rgba(244,235,216,0.04)',
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: GOLD,
    backgroundColor: 'rgba(217,178,74,0.14)',
  },
  chipText: {
    color: 'rgba(244,235,216,0.88)',
    fontSize: 13,
    fontFamily: serifFont,
  },
  chipTextActive: {
    color: GOLD_BRIGHT,
    fontWeight: '600' as const,
  },
  // CTA
  ctaSection: {
    marginTop: 32,
    marginBottom: 16,
  },
  ctaWrap: {
    borderRadius: 14,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,178,74,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(217,178,74,0.28)',
  },
  ctaWrapGold: {
    backgroundColor: GOLD,
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    ...(Platform.OS === 'android' ? { elevation: 6 } : {}),
  },
  ctaText: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '700' as const,
    color: 'rgba(217,178,74,0.5)',
    letterSpacing: -0.3,
  },
  ctaTextGold: {
    color: '#0F0D0B',
  },
  // Footer
  footer: {
    marginTop: 'auto',
    paddingTop: 40,
  },
  footerLine: {
    height: 1,
    backgroundColor: 'rgba(244,235,216,0.08)',
    marginBottom: 20,
  },
  footerText: {
    fontFamily: serifFont,
    fontSize: 14,
    color: GOLD,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.8,
  },
  // Modal shared
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: '#161310',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(217,178,74,0.18)',
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(244,235,216,0.28)',
  },
  sheetEyebrow: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: serifFont,
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -1,
    marginBottom: 10,
  },
  sheetSubtitle: {
    fontFamily: serifFont,
    color: 'rgba(244,235,216,0.72)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  // Deadline list
  deadlineList: {
    gap: 10,
    marginBottom: 18,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244,235,216,0.1)',
    backgroundColor: 'rgba(244,235,216,0.03)',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  deadlineRowActive: {
    borderColor: GOLD,
    backgroundColor: 'rgba(217,178,74,0.12)',
  },
  deadlineTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  deadlineLabel: {
    fontFamily: serifFont,
    color: CREAM,
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  deadlineLabelActive: {
    color: GOLD_BRIGHT,
  },
  deadlineHint: {
    fontFamily: serifFont,
    color: 'rgba(244,235,216,0.55)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(244,235,216,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: GOLD_BRIGHT,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: GOLD_BRIGHT,
  },
  endsOnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244,235,216,0.06)',
  },
  endsOnLabel: {
    fontFamily: serifFont,
    color: 'rgba(244,235,216,0.55)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  endsOnDate: {
    fontFamily: serifFont,
    color: GOLD_BRIGHT,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  confirmBtn: {
    borderRadius: 14,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
  },
  confirmBtnText: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#0F0D0B',
    letterSpacing: -0.3,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingTop: 16,
  },
  cancelBtnText: {
    fontFamily: serifFont,
    color: 'rgba(244,235,216,0.55)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  // How it works
  stepsList: {
    gap: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepArrow: {
    color: GOLD_BRIGHT,
    fontSize: 18,
    lineHeight: 24,
    width: 20,
  },
  stepText: {
    flex: 1,
    fontFamily: serifFont,
    color: CREAM,
    fontSize: 17,
    lineHeight: 24,
  },
  sheetNote: {
    fontFamily: serifFont,
    color: GOLD,
    fontSize: 15,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  gotItBtn: {
    borderRadius: 14,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: GOLD,
    backgroundColor: 'transparent',
  },
  gotItText: {
    fontFamily: serifFont,
    fontSize: 17,
    color: GOLD_BRIGHT,
    fontStyle: 'italic',
    fontWeight: '700' as const,
  },
});

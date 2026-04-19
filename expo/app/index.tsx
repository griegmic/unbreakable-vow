import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppMenuButton } from '@/components/app-menu';
import { palette, serifFont, vowExamples } from '@/constants/unbreakable';
import { supabase } from '@/lib/supabase';
import { useVowFlow } from '@/providers/vow-flow';

export default function HomeScreen() {
  const { setRawInput, setRefinedText, shouldSkipRefine } = useVowFlow();
  const searchParams = useLocalSearchParams<{ guided?: string }>();
  const [input, setInput] = useState<string>('');
  const [focused, setFocused] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);

  // Returning users (have any sealed/active/kept vow) → redirect to QuickVow
  // Skip redirect if ?guided=1 (user explicitly chose guided flow)
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

  const handleContinue = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    console.log('[HomeScreen] handleContinue:', trimmed);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRawInput(trimmed);
    if (shouldSkipRefine(trimmed)) {
      console.log('[HomeScreen] vow is already sharp, skipping refine');
      setRefinedText(trimmed);
      router.push('/stake');
    } else {
      console.log('[HomeScreen] vow needs sharpening, going to refine');
      router.push('/refine');
    }
  };

  const handleChip = (example: string) => {
    void Haptics.selectionAsync();
    setInput(example);
    Keyboard.dismiss();
  };

  const btnScale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, backgroundColor: '#13100B' }} />
      </View>
      <View pointerEvents="none" style={styles.ambientGlow} />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nav — brand + dollar social proof */}
          <Animated.View style={[styles.navRow, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            <View style={styles.navIcon}><Text style={styles.navIconText}>◆</Text></View>
            <Text style={styles.navName}>Unbreakable Vow</Text>
            <Text style={styles.dollarProof}>$47,320 on the line</Text>
            <AppMenuButton />
          </Animated.View>

          {/* Hero */}
          <Animated.View style={[styles.heroBlock, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
            <Text style={styles.heroLine1}>Make a vow.</Text>
            <Text style={styles.heroLine2}>Mean it.</Text>
            <Text style={styles.explainer}>
              Vow to a friend. Put money on it.{'\n'}
              <Text style={styles.explainerPunch}>Break it, and you pay — to charity!</Text>
            </Text>
          </Animated.View>

          {/* Input */}
          <Animated.View
            style={[
              styles.inputSection,
              { opacity: inputFade, transform: [{ translateY: inputSlide }] },
            ]}
          >
            <Text style={[styles.inputLabel, focused && styles.inputLabelFocused]}>What commitment will you bet on?</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="gym 3x this week"
              placeholderTextColor="rgba(222,210,192,0.22)"
              value={input}
              onChangeText={setInput}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={handleContinue}
              returnKeyType="go"
              testID="vow-input"
            />
            <View style={styles.inputLine} />
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

          {/* CTA — gold filled */}
          <Animated.View style={[styles.ctaSection, { opacity: ctaFade, transform: [{ translateY: ctaSlide }] }]}>
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable
                disabled={!canContinue}
                onPress={handleContinue}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[styles.ctaWrap, canContinue && styles.ctaWrapGold]}
                testID="home-continue"
              >
                <Text style={[styles.ctaText, canContinue && styles.ctaTextGold]}>Make my vow</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#13100B',
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    top: -80,
    left: '50%',
    marginLeft: -250,
    width: 500,
    height: 500,
    borderRadius: 500,
    backgroundColor: 'rgba(212,162,79,0.025)',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
    marginTop: 4,
  },
  navIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(212,162,79,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconText: {
    fontFamily: serifFont,
    fontSize: 12,
    color: 'rgba(212,162,79,0.5)',
  },
  navName: {
    fontSize: 11,
    color: 'rgba(212,162,79,0.35)',
    fontWeight: '600' as const,
    letterSpacing: 2,
    textTransform: 'uppercase',
    flex: 1,
  },
  dollarProof: {
    fontFamily: serifFont,
    fontSize: 13,
    color: 'rgba(212,162,79,0.3)',
    fontStyle: 'italic',
    letterSpacing: 0.3,
    marginRight: 8,
  },
  heroLine1: {
    color: 'rgba(242,234,220,0.94)',
    fontSize: 48,
    lineHeight: 46,
    fontWeight: '800' as const,
    fontFamily: serifFont,
    letterSpacing: -1.2,
  },
  heroBlock: {
    marginBottom: 8,
  },
  heroLine2: {
    color: 'rgba(212,162,79,0.68)',
    fontSize: 48,
    lineHeight: 46,
    fontWeight: '800' as const,
    fontFamily: serifFont,
    fontStyle: 'italic',
    letterSpacing: -1.2,
    marginBottom: 20,
    textShadowColor: 'rgba(212,162,79,0.06)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 32,
  },
  explainer: {
    fontFamily: serifFont,
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(222,210,192,0.42)',
  },
  explainerPunch: {
    color: 'rgba(222,210,192,0.52)',
  },
  inputSection: {
    marginTop: 28,
    marginBottom: 16,
  },
  inputLabel: {
    color: 'rgba(212,162,79,0.48)',
    fontSize: 15,
    fontWeight: '500' as const,
    fontFamily: serifFont,
    fontStyle: 'italic',
    marginBottom: 14,
  },
  inputLabelFocused: {
    color: 'rgba(212,162,79,0.65)',
  },
  input: {
    color: 'rgba(242,234,220,0.85)',
    fontSize: 20,
    fontFamily: serifFont,
    minHeight: 30,
    paddingVertical: 0,
    marginBottom: 0,
  },
  inputLine: {
    height: 2,
    backgroundColor: 'rgba(212,162,79,0.2)',
    marginTop: 14,
    marginBottom: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.08)',
    backgroundColor: 'rgba(212,162,79,0.04)',
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: 'rgba(212,162,79,0.14)',
    backgroundColor: 'rgba(212,162,79,0.07)',
  },
  chipText: {
    color: 'rgba(222,210,192,0.42)',
    fontSize: 14,
    fontFamily: serifFont,
  },
  chipTextActive: {
    color: 'rgba(212,162,79,0.65)',
  },
  ctaSection: {
    marginBottom: 24,
  },
  ctaWrap: {
    borderRadius: 18,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,162,79,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(212,162,79,0.14)',
  },
  ctaWrapGold: {
    backgroundColor: 'rgba(212,162,79,0.82)',
    borderColor: 'rgba(212,162,79,0.85)',
    shadowColor: 'rgba(212,162,79,1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 8,
  },
  ctaText: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '700' as const,
    color: 'rgba(212,162,79,0.3)',
    letterSpacing: -0.2,
  },
  ctaTextGold: {
    color: '#13100B',
  },
});

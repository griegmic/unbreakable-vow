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
        <View style={{ flex: 1, backgroundColor: '#1C1816' }} />
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
            <Text style={styles.navName} numberOfLines={1}>Unbreakable Vow</Text>
            <Text style={styles.dollarProof} numberOfLines={1}>$47,320 on the line</Text>
          </Animated.View>

          {/* Hero */}
          <Animated.View style={[styles.heroBlock, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
            <Text style={styles.heroLine1}>Make a vow.</Text>
            <Text style={styles.heroLine2}>Mean it.</Text>
            <Text style={styles.explainer}>
              Vow to a friend something you've{'\n'}been putting off. Break it, your{'\n'}money goes to charity.
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

          {/* How it works footer */}
          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>How it works  ↗</Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1C1816',
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
    top: -80,
    left: '50%',
    marginLeft: -250,
    width: 500,
    height: 500,
    borderRadius: 500,
    backgroundColor: 'rgba(196,168,77,0.015)',
  },
  // Nav
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
    marginTop: 4,
  },
  navIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#2A2520',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  navIconText: {
    fontSize: 11,
    color: 'rgba(196,168,77,0.75)',
  },
  navName: {
    fontSize: 11,
    color: 'rgba(232,220,200,0.75)',
    fontWeight: '700' as const,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  dollarProof: {
    fontFamily: serifFont,
    fontSize: 12,
    color: 'rgba(196,168,77,0.45)',
    fontStyle: 'italic',
    marginLeft: 'auto',
  },
  // Hero
  heroBlock: {
    marginBottom: 20,
  },
  heroLine1: {
    color: 'rgba(242,234,220,0.92)',
    fontSize: 46,
    lineHeight: 46,
    fontWeight: '800' as const,
    fontFamily: serifFont,
    letterSpacing: -1.2,
  },
  heroLine2: {
    color: 'rgba(196,168,77,0.7)',
    fontSize: 46,
    lineHeight: 46,
    fontWeight: '800' as const,
    fontFamily: serifFont,
    fontStyle: 'italic',
    letterSpacing: -1.2,
    marginBottom: 20,
  },
  explainer: {
    fontFamily: serifFont,
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(222,210,192,0.42)',
  },
  // Input
  inputSection: {
    marginTop: 32,
    marginBottom: 0,
  },
  inputLabel: {
    color: 'rgba(196,168,77,0.5)',
    fontSize: 14,
    fontWeight: '500' as const,
    fontFamily: serifFont,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  inputLabelFocused: {
    color: 'rgba(196,168,77,0.65)',
  },
  input: {
    color: 'rgba(222,210,192,0.55)',
    fontSize: 19,
    fontFamily: serifFont,
    minHeight: 28,
    paddingVertical: 0,
    marginBottom: 0,
  },
  inputLine: {
    height: 1,
    backgroundColor: 'rgba(196,168,77,0.12)',
    marginTop: 12,
    marginBottom: 16,
  },
  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: 'rgba(196,168,77,0.15)',
    backgroundColor: 'rgba(196,168,77,0.08)',
  },
  chipText: {
    color: 'rgba(222,210,192,0.55)',
    fontSize: 13,
    fontFamily: serifFont,
  },
  chipTextActive: {
    color: 'rgba(196,168,77,0.7)',
  },
  // CTA
  ctaSection: {
    marginTop: 28,
    marginBottom: 16,
  },
  ctaWrap: {
    borderRadius: 14,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(196,168,77,0.12)',
    borderWidth: 0,
  },
  ctaWrapGold: {
    backgroundColor: '#C4A84D',
  },
  ctaText: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '700' as const,
    fontStyle: 'italic',
    color: 'rgba(196,168,77,0.3)',
    letterSpacing: -0.3,
  },
  ctaTextGold: {
    color: '#1C1816',
  },
  // Footer
  footer: {
    marginTop: 'auto',
    paddingTop: 40,
  },
  footerLine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
  },
  footerText: {
    fontFamily: serifFont,
    fontSize: 14,
    color: 'rgba(196,168,77,0.35)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

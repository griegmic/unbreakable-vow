import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowRight, Shield, Sparkles, Zap } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
import { useVowFlow } from '@/providers/vow-flow';

export default function HomeScreen() {
  const { setRawInput, setRefinedText, shouldSkipRefine } = useVowFlow();
  const [input, setInput] = useState<string>('');
  const [focused, setFocused] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(12)).current;
  const inputFade = useRef(new Animated.Value(0)).current;
  const inputSlide = useRef(new Animated.Value(16)).current;
  const stepsFade = useRef(new Animated.Value(0)).current;
  const stepsSlide = useRef(new Animated.Value(16)).current;
  const ctaScale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(heroFade, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(heroSlide, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(inputFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(inputSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(stepsFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(stepsSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6 }),
      ]),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canContinue = useMemo(() => input.trim().length > 0, [input]);

  const handleContinue = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRawInput(trimmed);
    if (shouldSkipRefine(trimmed)) {
      setRefinedText(trimmed);
      router.push('/witness');
    } else {
      router.push('/refine');
    }
  };

  const handleChip = (example: string) => {
    void Haptics.selectionAsync();
    setInput(example);
    inputRef.current?.focus();
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
      <LinearGradient
        colors={['#05070B', '#080E18', '#0A0D12']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.orbTopRight} />
      <View pointerEvents="none" style={styles.orbBottomLeft} />
      <View pointerEvents="none" style={styles.orbCenter} />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.headerRow, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            <LinearGradient
              colors={[palette.goldBright, palette.gold, palette.goldDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIcon}
            >
              <Sparkles color="#0B0D11" size={14} />
            </LinearGradient>
            <Text style={styles.headerLabel}>Unbreakable Vow</Text>
            <View style={styles.headerSpacer} />
            <AppMenuButton />
          </Animated.View>

          <Animated.View style={{ opacity: heroFade, transform: [{ translateY: heroSlide }] }}>
            <Text style={styles.heroLine1}>Make a vow.</Text>
            <Text style={styles.heroLine2}>Mean it.</Text>
            <Text style={styles.heroSub}>
              Commit to one thing this week. Vow to a friend.{'\n'}Put money on it. Break it, it goes to charity.
            </Text>
          </Animated.View>

          <Animated.View style={[styles.inputCard, focused && styles.inputCardFocused, { opacity: inputFade, transform: [{ translateY: inputSlide }] }]}>
            <Text style={[styles.inputLabel, focused && styles.inputLabelFocused]}>YOUR VOW</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="No phone in bed all week"
              placeholderTextColor={palette.textMuted}
              value={input}
              onChangeText={setInput}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={handleContinue}
              returnKeyType="go"
              testID="vow-input"
            />
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

          <Animated.View style={[styles.stepsCard, { opacity: stepsFade, transform: [{ translateY: stepsSlide }] }]}>
            <Text style={styles.stepsTitle}>How it works</Text>
            <View style={styles.stepItem}>
              <View style={styles.stepIconWrap}>
                <Zap color={palette.goldBright} size={15} />
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepLabel}>Write your vow</Text>
                <Text style={styles.stepDesc}>One specific commitment. No wiggle room.</Text>
              </View>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.stepItem}>
              <View style={styles.stepIconWrap}>
                <Shield color={palette.goldBright} size={15} />
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepLabel}>Choose a witness</Text>
                <Text style={styles.stepDesc}>They hold you accountable and deliver the final verdict.</Text>
              </View>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.stepItem}>
              <View style={styles.stepIconWrap}>
                <Text style={styles.dollarIcon}>$</Text>
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepLabel}>Put money on it</Text>
                <Text style={styles.stepDesc}>If you fail, your stake goes to charity. Your witness decides.</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View style={[styles.footer, { transform: [{ scale: ctaScale }] }]}>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              disabled={!canContinue}
              onPress={handleContinue}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={styles.ctaWrap}
              testID="home-continue"
            >
              <LinearGradient
                colors={canContinue ? [palette.goldBright, palette.gold, palette.goldDeep] : ['#1E2430', '#1E2430']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text style={[styles.ctaText, !canContinue && styles.ctaTextDisabled]}>Set the terms</Text>
                {canContinue ? <ArrowRight color="#0B0D11" size={18} /> : null}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 100,
  },
  orbTopRight: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: 'rgba(212,162,79,0.22)',
    opacity: 0.6,
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: 60,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 200,
    backgroundColor: 'rgba(70,100,180,0.08)',
  },
  orbCenter: {
    position: 'absolute',
    top: 200,
    left: '30%',
    width: 160,
    height: 160,
    borderRadius: 160,
    backgroundColor: 'rgba(212,162,79,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
    marginTop: 4,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  headerLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  headerSpacer: {
    flex: 1,
  },
  heroLine1: {
    color: palette.text,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    letterSpacing: -1.5,
  },
  heroLine2: {
    color: palette.goldBright,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    letterSpacing: -1.5,
    marginBottom: 14,
  },
  heroSub: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 24,
  },
  inputCard: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
  inputCardFocused: {
    borderColor: 'rgba(212,162,79,0.35)',
    shadowColor: palette.gold,
    shadowOpacity: 0.12,
  },
  inputLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  inputLabelFocused: {
    color: palette.gold,
  },
  input: {
    color: palette.text,
    fontSize: 17,
    minHeight: 30,
    paddingVertical: 0,
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipActive: {
    borderColor: 'rgba(212,162,79,0.3)',
    backgroundColor: 'rgba(212,162,79,0.1)',
  },
  chipText: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  chipTextActive: {
    color: palette.goldBright,
  },
  stepsCard: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  stepsTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  stepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(212,162,79,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dollarIcon: {
    color: palette.goldBright,
    fontSize: 15,
    fontWeight: '800' as const,
  },
  stepCopy: {
    flex: 1,
    gap: 3,
  },
  stepLabel: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  stepDesc: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  stepDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginLeft: 46,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingBottom: 34,
    paddingTop: 12,
  },
  ctaWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaGradient: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  ctaText: {
    color: '#0B0D11',
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  ctaTextDisabled: {
    color: palette.textMuted,
  },
});

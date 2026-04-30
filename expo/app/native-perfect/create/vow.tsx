/**
 * Screen 01 — Vow Only, Quiet Start Chips
 *
 * Phase 1 singleton (phase opener).
 * Mock: project-perfect-final-build-mocks.html shot 1.
 * Spec: STEP_9 §screen-01-vow-only-quiet-start.
 *
 * First screen of the new-user creation flow.
 * No DB writes — local rawInput state only.
 */
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BrandWordmark,
  GoldCTA,
  StepProgressHeader,
  SuggestionChipScroll,
  VowInputCard,
} from '@/components/primitives';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';

const SUGGESTION_CHIPS = [
  'Gym 3x this week',
  'No alcohol, 2 weeks',
  'Delete TikTok',
  '10k steps',
  'Call mom weekly',
];

export default function VowScreen() {
  const insets = useSafeAreaInsets();
  const [rawInput, setRawInput] = useState('');

  const handleChipSelect = useCallback((chip: string) => {
    setRawInput(chip);
  }, []);

  const handleNext = useCallback(() => {
    if (!rawInput.trim()) return;
    router.push({
      pathname: '/native-perfect/create/stake',
      params: { rawInput: rawInput.trim() },
    } as never);
  }, [rawInput]);

  const handleSignIn = useCallback(() => {
    // TODO: Route to sign-in (D13) or dashboard if already authed
    router.push('/native-perfect/create/vow' as never);
  }, []);

  const isNextEnabled = rawInput.trim().length > 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step header: 1/5, 20% progress, SIGN IN */}
          <StepProgressHeader
            step={1}
            totalSteps={5}
            progress={0.2}
            onSignIn={handleSignIn}
          />

          {/* Tiny brand */}
          <View style={styles.brandWrap}>
            <BrandWordmark variant="tinybrand" />
          </View>

          {/* Hero heading */}
          <Text style={styles.h1}>
            {'Make a vow.\n'}
            <Text style={styles.h1GoldItalic}>Mean it.</Text>
          </Text>

          {/* Copy */}
          <Text style={styles.copy}>
            <Text style={styles.copyBold}>Flake and lose it all.</Text>
            {' Stake real cash on your word. Your friend decides. No mercy.'}
          </Text>

          {/* Vow input card */}
          <VowInputCard
            kicker="I Vow To"
            placeholder="Run every morning this week"
            value={rawInput}
            onChangeText={setRawInput}
          />

          {/* Or Start Here divider */}
          <Text style={styles.orLabel}>Or Start Here</Text>

          {/* Suggestion chips */}
          <SuggestionChipScroll
            chips={SUGGESTION_CHIPS}
            onSelect={handleChipSelect}
          />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
          <GoldCTA
            label="Next →"
            onPress={handleNext}
            disabled={!isNextEnabled}
          />
        </View>
      </KeyboardAvoidingView>
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
  brandWrap: {
    marginTop: -14,
    marginBottom: 22,
  },
  h1: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 61,
    lineHeight: 61 * 0.98,
    color: uvColors.text,
  },
  h1GoldItalic: {
    fontFamily: uvFonts.serifItalic,
    fontSize: 61,
    lineHeight: 61 * 0.98,
    color: uvColors.gold,
    fontStyle: 'italic',
  },
  copy: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    lineHeight: 15 * 1.38,
    color: uvColors.textCopy,
    marginTop: 22,
    marginBottom: 30,
    maxWidth: 349,
  },
  copyBold: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    color: uvColors.text,
  },
  orLabel: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 12 * 0.34,
    textTransform: 'uppercase',
    color: uvColors.textKicker,
    marginTop: 28,
    marginBottom: 12,
  },
  bottomCta: {
    position: 'absolute',
    left: uvSpacing.xl,
    right: uvSpacing.xl,
    bottom: 0,
  },
});

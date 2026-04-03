import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { WandSparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  BackButton,
  PrimaryButton,
  RitualCard,
  RitualInput,
  RitualScreen,
  SecondaryButton,
  TitleBlock,
  VowPreview,
} from '@/components/vow-ui';
import {
  composeVow,
  detectVowNeeds,
  durationOptions,
  getFrequencyOptions,
  palette,
} from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

type RefineStep = 'analyze' | 'vague' | 'frequency' | 'duration' | 'preview';

export default function RefineScreen() {
  const { analysis, activeVowText, vow, setRefinedText } = useVowFlow();
  const [step, setStep] = useState<RefineStep>('analyze');
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [editing, setEditing] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');

  const needs = useMemo(() => detectVowNeeds(vow.rawInput), [vow.rawInput]);
  const frequencyOptions = useMemo(() => getFrequencyOptions(vow.rawInput), [vow.rawInput]);

  const composedVow = useMemo(() => {
    return composeVow(vow.rawInput, selectedFrequency, selectedDuration, needs);
  }, [vow.rawInput, selectedFrequency, selectedDuration, needs]);

  const chipFade = useRef(new Animated.Value(0)).current;
  const chipSlide = useRef(new Animated.Value(12)).current;

  const animateChipsIn = useCallback(() => {
    chipFade.setValue(0);
    chipSlide.setValue(12);
    Animated.parallel([
      Animated.timing(chipFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(chipSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [chipFade, chipSlide]);

  useEffect(() => {
    if (analysis.type === 'vague') {
      setStep('vague');
      return;
    }

    if (needs.isNegation || needs.isDeadlineTask) {
      setStep('preview');
      return;
    }

    if (needs.showFrequency) {
      setStep('frequency');
      animateChipsIn();
      return;
    }

    if (needs.showDuration) {
      setStep('duration');
      animateChipsIn();
      return;
    }

    setStep('preview');
  }, [analysis.type, needs, animateChipsIn]);

  const handleFrequencySelect = (value: string) => {
    void Haptics.selectionAsync();
    setSelectedFrequency(value);

    if (needs.showDuration) {
      setTimeout(() => {
        setStep('duration');
        animateChipsIn();
      }, 200);
    } else {
      setTimeout(() => setStep('preview'), 200);
    }
  };

  const handleDurationSelect = (value: string) => {
    void Haptics.selectionAsync();
    setSelectedDuration(value);
    setTimeout(() => setStep('preview'), 200);
  };

  const handleSkipFrequency = () => {
    void Haptics.selectionAsync();
    setSelectedFrequency(null);
    if (needs.showDuration) {
      setStep('duration');
      animateChipsIn();
    } else {
      setStep('preview');
    }
  };

  const handleSkipDuration = () => {
    void Haptics.selectionAsync();
    setSelectedDuration(null);
    setStep('preview');
  };

  const continueWith = (value: string) => {
    console.log('[RefineScreen] continueWith', value);
    setRefinedText(value);
    router.push('/witness');
  };

  if (step === 'vague') {
    return (
      <RitualScreen
        footer={<SecondaryButton label="Go back and retype" onPress={() => router.back()} testID="refine-back" />}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title="Good instinct. Weak terms."
          subtitle="A vow needs a clear action and a clear window. Try one of these:"
        />
        <RitualCard>
          {analysis.suggestions?.map((suggestion) => (
            <Pressable key={suggestion} style={styles.suggestionCard} onPress={() => continueWith(suggestion)} testID={`suggestion-${suggestion}`}>
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </RitualCard>
      </RitualScreen>
    );
  }

  if (step === 'frequency') {
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title="Let's make it unbreakable."
          subtitle="We'll sharpen the details so your witness can judge it cleanly."
        />
        <VowPreview text={composedVow} />

        <Animated.View style={{ opacity: chipFade, transform: [{ translateY: chipSlide }] }}>
          <RitualCard>
            <Text style={styles.questionTitle}>How often?</Text>
            <Text style={styles.questionSub}>Pick a frequency so there's no wiggle room.</Text>
            <View style={styles.optionGrid}>
              {frequencyOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.optionChip, selectedFrequency === opt.value && styles.optionChipActive]}
                  onPress={() => handleFrequencySelect(opt.value)}
                  testID={`freq-${opt.label}`}
                >
                  <Text style={[styles.optionChipText, selectedFrequency === opt.value && styles.optionChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={handleSkipFrequency} style={styles.skipButton} testID="freq-skip">
              <Text style={styles.skipText}>Skip — keep it open</Text>
            </Pressable>
          </RitualCard>
        </Animated.View>
      </RitualScreen>
    );
  }

  if (step === 'duration') {
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title="Let's make it unbreakable."
          subtitle="Almost there. One more detail."
        />
        <VowPreview text={selectedFrequency ? composeVow(vow.rawInput, selectedFrequency, null, needs) : activeVowText} />

        <Animated.View style={{ opacity: chipFade, transform: [{ translateY: chipSlide }] }}>
          <RitualCard>
            <Text style={styles.questionTitle}>How long each time?</Text>
            <Text style={styles.questionSub}>Set a minimum so you can't phone it in.</Text>
            <View style={styles.optionGrid}>
              {durationOptions.map((opt) => (
                <Pressable
                  key={opt.label}
                  style={[styles.optionChip, selectedDuration === opt.value && styles.optionChipActive]}
                  onPress={() => handleDurationSelect(opt.value)}
                  testID={`dur-${opt.label}`}
                >
                  <Text style={[styles.optionChipText, selectedDuration === opt.value && styles.optionChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={handleSkipDuration} style={styles.skipButton} testID="dur-skip">
              <Text style={styles.skipText}>Skip — no minimum</Text>
            </Pressable>
          </RitualCard>
        </Animated.View>
      </RitualScreen>
    );
  }

  const finalText = editing ? customText : composedVow;

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label="Lock it in"
            onPress={() => continueWith(finalText)}
            testID="refine-continue"
          />
          {!editing ? (
            <SecondaryButton
              label="Edit it myself"
              onPress={() => { setEditing(true); setCustomText(composedVow); }}
              testID="refine-edit"
            />
          ) : (
            <SecondaryButton label="Cancel" onPress={() => setEditing(false)} testID="refine-cancel" />
          )}
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <BackButton />
      <TitleBlock
        title="Your vow."
        subtitle="This is what your witness will hold you to."
      />

      {editing ? (
        <RitualInput
          label="Your version"
          value={customText}
          onChangeText={setCustomText}
          placeholder="Refine the wording here"
          multiline
          testID="refine-custom-input"
        />
      ) : (
        <>
          <VowPreview text={composedVow} />
          {(selectedFrequency || selectedDuration || needs.isNegation || needs.isDeadlineTask) && (
            <RitualCard>
              <View style={styles.deltaRow}>
                <WandSparkles color={palette.goldBright} size={16} />
                <Text style={styles.deltaText}>
                  {needs.isNegation
                    ? 'Added a weekly window so your witness knows when to settle.'
                    : needs.isDeadlineTask
                      ? 'Added a deadline so the terms are clear.'
                      : 'Sharpened with your selections so there\'s no ambiguity.'}
                </Text>
              </View>
            </RitualCard>
          )}
        </>
      )}
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  suggestionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceElevated,
    padding: 14,
  },
  suggestionText: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
  questionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  questionSub: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -4,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceElevated,
    minWidth: 80,
    alignItems: 'center',
  },
  optionChipActive: {
    borderColor: palette.borderStrong,
    backgroundColor: 'rgba(212,162,79,0.14)',
  },
  optionChipText: {
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  optionChipTextActive: {
    color: palette.goldBright,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  deltaRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  deltaText: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
});

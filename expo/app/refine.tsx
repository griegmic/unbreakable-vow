import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowRight, Sparkles, WandSparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
  analyzeVow,
  composeVow,
  detectVowNeeds,
  durationOptions,
  getContextualSuggestions,
  getFrequencyOptions,
  palette,
} from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

type RefineStep = 'analyze' | 'vague' | 'frequency' | 'duration' | 'deadline' | 'preview';

export default function RefineScreen() {
  const { analysis, activeVowText, vow, setRawInput, setRefinedText } = useVowFlow();
  const [step, setStep] = useState<RefineStep>('analyze');
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [editing, setEditing] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');

  const [vagueInput, setVagueInput] = useState<string>(vow.rawInput);
  const [vagueError, setVagueError] = useState<string>('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const [deadlineComposed, setDeadlineComposed] = useState<string>('');

  const needs = useMemo(() => detectVowNeeds(vow.rawInput), [vow.rawInput]);
  const frequencyOptions = useMemo(() => getFrequencyOptions(vow.rawInput), [vow.rawInput]);
  const contextualSuggestions = useMemo(() => getContextualSuggestions(vow.rawInput), [vow.rawInput]);

  const composedVow = useMemo(() => {
    if (deadlineComposed) return deadlineComposed;
    return composeVow(vow.rawInput, selectedFrequency, selectedDuration, needs);
  }, [vow.rawInput, selectedFrequency, selectedDuration, needs, deadlineComposed]);

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

  const triggerShake = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const rawInputForEffect = vow.rawInput;
  useEffect(() => {
    if (analysis.type === 'vague') {
      setStep('vague');
      setVagueInput(rawInputForEffect);
      return;
    }

    if (analysis.type === 'already_good') {
      setStep('preview');
      return;
    }

    if (needs.isNegation) {
      setStep('preview');
      return;
    }

    if (needs.isDeadlineTask) {
      setStep('deadline');
      animateChipsIn();
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
  }, [analysis.type, needs, animateChipsIn, rawInputForEffect]);

  const handleVagueSubmit = useCallback(() => {
    const trimmed = vagueInput.trim();
    if (!trimmed) return;

    const localAnalysis = analyzeVow(trimmed);
    if (localAnalysis.type === 'vague') {
      setVagueError('Try adding a number and a time window.');
      triggerShake();
      return;
    }

    setVagueError('');
    setRawInput(trimmed);
  }, [vagueInput, triggerShake, setRawInput]);

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

  const handleDeadlineSelect = (deadline: string) => {
    void Haptics.selectionAsync();
    let clean = vow.rawInput.trim().replace(/[.!,]$/, '');
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    if (/by\s+(mon|tue|wed|thu|fri|sat|sun)/i.test(clean)) {
      setDeadlineComposed(`${clean}.`);
    } else {
      setDeadlineComposed(`${clean} ${deadline}.`);
    }
    setTimeout(() => setStep('preview'), 200);
  };

  const continueWith = (value: string) => {
    console.log('[RefineScreen] continueWith', value);
    setRefinedText(value);
    router.push('/witness');
  };

  if (step === 'vague') {
    return (
      <RitualScreen
        footer={
          <PrimaryButton
            label={"Set the terms \u2192"}
            onPress={handleVagueSubmit}
            disabled={!vagueInput.trim()}
            testID="vague-submit"
          />
        }
      >
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title={"Let\u2019s make it unbreakable."}
          subtitle={"Your witness has to call this \u2018kept\u2019 or \u2018broken\u2019 at the end. The best vows are specific enough to judge."}
        />

        <RitualCard>
          <View style={styles.guidanceHeader}>
            <Sparkles color={palette.goldBright} size={16} />
            <Text style={styles.guidanceTitle}>The strongest vows have:</Text>
          </View>
          <View style={styles.guidanceList}>
            <Text style={styles.guidanceLine}>
              <Text style={styles.guidanceBold}>A clear action</Text> — what exactly will you do or not do?
            </Text>
            <Text style={styles.guidanceLine}>
              <Text style={styles.guidanceBold}>A finish line</Text> — a number, a threshold, or a clear "done"
            </Text>
            <Text style={styles.guidanceLine}>
              <Text style={styles.guidanceBold}>A time window</Text> — when does your witness check?
            </Text>
          </View>
          <Text style={styles.guidanceExample}>
            {"\"Go to the gym\" \u2192 \"Go to the gym 3 times this week.\""}
          </Text>
        </RitualCard>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <View style={styles.vagueInputShell}>
            <Text style={styles.vagueInputLabel}>YOUR VOW</Text>
            <TextInput
              ref={inputRef}
              style={styles.vagueInputField}
              value={vagueInput}
              onChangeText={(text) => {
                setVagueInput(text);
                if (vagueError) setVagueError('');
              }}
              placeholder="No phone in bed all week"
              placeholderTextColor={palette.textMuted}
              onSubmitEditing={handleVagueSubmit}
              returnKeyType="go"
              autoFocus
              testID="vague-input"
            />
          </View>
        </Animated.View>
        {vagueError ? <Text style={styles.vagueErrorText}>{vagueError}</Text> : null}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>Try one of these</Text>
          <View style={styles.dividerLine} />
        </View>

        {contextualSuggestions.map((suggestion) => (
          <Pressable
            key={suggestion}
            style={({ pressed }) => [styles.suggestionCard, pressed && styles.suggestionCardPressed]}
            onPress={() => {
              void Haptics.selectionAsync();
              setVagueInput(suggestion);
              setVagueError('');
            }}
            testID={`suggestion-${suggestion}`}
          >
            <Text style={styles.suggestionText}>{suggestion}</Text>
            <ArrowRight color={palette.textMuted} size={16} />
          </Pressable>
        ))}
      </RitualScreen>
    );
  }

  if (step === 'deadline') {
    const deadlines = [
      { label: 'By Wednesday', value: 'by Wednesday' },
      { label: 'By Friday', value: 'by Friday' },
      { label: 'By Sunday end of day', value: 'by Sunday end of day' },
    ];

    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title="Good. When's the deadline?"
          subtitle="Pick a day so your witness knows when to check."
        />
        <VowPreview text={activeVowText} />

        <Animated.View style={{ opacity: chipFade, transform: [{ translateY: chipSlide }] }}>
          <View style={styles.optionGrid}>
            {deadlines.map((opt) => (
              <Pressable
                key={opt.value}
                style={styles.deadlineChip}
                onPress={() => handleDeadlineSelect(opt.value)}
                testID={`deadline-${opt.label}`}
              >
                <Text style={styles.deadlineChipText}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </RitualScreen>
    );
  }

  if (step === 'frequency') {
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title={"Let\u2019s make it unbreakable."}
          subtitle={"We\u2019ll sharpen the details so your witness can judge it cleanly."}
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
          title={"Let\u2019s make it unbreakable."}
          subtitle="Almost there. One more detail."
        />
        <VowPreview text={selectedFrequency ? composeVow(vow.rawInput, selectedFrequency, null, needs) : activeVowText} />

        <Animated.View style={{ opacity: chipFade, transform: [{ translateY: chipSlide }] }}>
          <RitualCard>
            <Text style={styles.questionTitle}>How long each time?</Text>
            <Text style={styles.questionSub}>{"Set a minimum so you can\u2019t phone it in."}</Text>
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
          {(selectedFrequency || selectedDuration || needs.isNegation || needs.isDeadlineTask || deadlineComposed) && (
            <RitualCard>
              <View style={styles.deltaRow}>
                <WandSparkles color={palette.goldBright} size={16} />
                <Text style={styles.deltaText}>
                  {needs.isNegation
                    ? 'Added a weekly window so your witness knows when to settle.'
                    : needs.isDeadlineTask || deadlineComposed
                      ? 'Added a deadline so the terms are clear.'
                      : "Sharpened with your selections so there\u2019s no ambiguity."}
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
  vagueInputShell: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  vagueInputLabel: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  vagueInputField: {
    color: palette.text,
    fontSize: 17,
    minHeight: 28,
    paddingVertical: 0,
  },
  vagueErrorText: {
    color: palette.goldBright,
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: -8,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guidanceTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  guidanceList: {
    gap: 6,
  },
  guidanceLine: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  guidanceBold: {
    color: palette.text,
    fontWeight: '600' as const,
  },
  guidanceExample: {
    color: palette.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
  },
  dividerLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceElevated,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  suggestionCardPressed: {
    backgroundColor: palette.surfaceStrong,
    borderColor: palette.borderStrong,
  },
  suggestionText: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
    marginRight: 8,
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
  deadlineChip: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceElevated,
    alignItems: 'center',
    flex: 1,
    minWidth: '30%' as unknown as number,
  },
  deadlineChipText: {
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
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

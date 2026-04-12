import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  BackButton,
  PrimaryButton,
  RitualCard,
  RitualScreen,
  SecondaryButton,
  TitleBlock,
} from '@/components/vow-ui';
import {
  generateSuggestion,
  getContextualSuggestions,
  palette,
} from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

export default function RefineScreen() {
  const { vow, setRefinedText } = useVowFlow();

  const contextualSuggestions = useMemo(() => getContextualSuggestions(vow.rawInput), [vow.rawInput]);
  const initialSuggestion = useMemo(() => generateSuggestion(vow.rawInput), [vow.rawInput]);

  const [suggestionText, setSuggestionText] = useState<string>(initialSuggestion);
  const [vagueError, setVagueError] = useState<string>('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  console.log('[RefineScreen] rawInput:', vow.rawInput, '| suggestion:', initialSuggestion);

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

  const continueWith = useCallback((value: string) => {
    console.log('[RefineScreen] continueWith', value);
    setRefinedText(value);
    router.push('/stake');
  }, [setRefinedText]);

  const handleSubmit = useCallback(() => {
    const trimmed = suggestionText.trim();
    if (!trimmed) return;

    setVagueError('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    continueWith(trimmed);
  }, [suggestionText, continueWith]);

  const handleKeepOriginal = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    continueWith(vow.rawInput);
  }, [vow.rawInput, continueWith]);

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label={"Use this vow \u2192"}
            onPress={handleSubmit}
            disabled={!suggestionText.trim()}
            testID="refine-submit"
          />
          <SecondaryButton
            label="Nah, I'll keep mine"
            onPress={handleKeepOriginal}
            testID="refine-keep-original"
          />
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <BackButton />
      <TitleBlock
        title="Make it stick"
        subtitle={"Your witness calls it \u2018kept\u2019 or \u2018broken\u2019 \u2014 make it clear."}
      />

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View style={styles.vagueInputShell}>
          <Text style={styles.vagueInputLabel}>YOUR VOW</Text>
          <TextInput
            ref={inputRef}
            style={styles.vagueInputField}
            value={suggestionText}
            onChangeText={(text) => {
              setSuggestionText(text);
              if (vagueError) setVagueError('');
            }}
            placeholder="Type your vow here"
            placeholderTextColor={palette.textMuted}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
            multiline
            testID="refine-input"
          />
        </View>
      </Animated.View>
      {vagueError ? <Text style={styles.vagueErrorText}>{vagueError}</Text> : null}

      <RitualCard>
        <View style={styles.guidanceHeader}>
          <Sparkles color={palette.goldBright} size={16} />
          <Text style={styles.guidanceTitle}>Bulletproof vows have three things:</Text>
        </View>
        <View style={styles.guidanceList}>
          <Text style={styles.guidanceLine}>
            <Text style={styles.guidanceBold}>Something specific</Text> — what exactly will you do or not do?
          </Text>
          <Text style={styles.guidanceLine}>
            <Text style={styles.guidanceBold}>A deadline</Text> — when does your witness check?
          </Text>
          <Text style={styles.guidanceLine}>
            <Text style={styles.guidanceBold}>A way to prove it</Text> — how will they know you did it?
          </Text>
        </View>
      </RitualCard>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>Or try one of these</Text>
        <View style={styles.dividerLine} />
      </View>

      {contextualSuggestions.map((suggestion) => (
        <Pressable
          key={suggestion}
          style={({ pressed }) => [styles.suggestionCard, pressed && styles.suggestionCardPressed]}
          onPress={() => {
            void Haptics.selectionAsync();
            setSuggestionText(suggestion);
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
  dividerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
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
});

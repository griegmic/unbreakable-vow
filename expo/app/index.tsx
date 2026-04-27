import { Stack, router } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppMenuButton } from '@/components/app-menu';
import { PrimaryButton, RitualScreen } from '@/components/vow-ui';
import { analyzeVow, inferDeadline, palette } from '@/constants/unbreakable';
import { hapticOtpError, hapticPrimary, hapticSelection } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

type DeadlinePreset = 'end_of_week' | 'tomorrow' | 'in_7_days' | 'in_30_days';

const DEADLINES: { id: DeadlinePreset; label: string }[] = [
  { id: 'end_of_week', label: 'End of this week' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'in_7_days', label: '7 days' },
  { id: 'in_30_days', label: '30 days' },
];

const FIRST_SCREEN_EXAMPLES = [
  'Workout 3x this week',
  'Delete TikTok for a week',
  'No alcohol 2 weeks',
  'No texting my ex for a month',
];

function getPresetDate(preset: DeadlinePreset): Date {
  const d = new Date();
  if (preset === 'tomorrow') d.setDate(d.getDate() + 1);
  if (preset === 'in_7_days') d.setDate(d.getDate() + 7);
  if (preset === 'in_30_days') d.setDate(d.getDate() + 30);
  if (preset === 'end_of_week') {
    const diff = 7 - d.getDay();
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  }
  d.setHours(23, 59, 0, 0);
  return d;
}

function formatDeadline(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function NativeCreateEntry() {
  const { session, loading } = useAuth();
  const { setRawInput, setRefinedText, setDeadline, shouldSkipRefine } = useVowFlow();

  const [checkingReturnUser, setCheckingReturnUser] = useState(true);
  const [vowText, setVowText] = useState('');
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>('end_of_week');

  useEffect(() => {
    if (loading) return;
    if (!session?.user?.id) {
      setCheckingReturnUser(false);
      return;
    }

    let active = true;
    (async () => {
      const { count } = await supabase
        .from('vows')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .neq('status', 'draft');

      if (!active) return;
      if (count && count > 0) {
        router.replace('/quick-vow');
        return;
      }
      setCheckingReturnUser(false);
    })();

    return () => {
      active = false;
    };
  }, [loading, session?.user?.id]);

  const inferredDeadline = useMemo(() => {
    if (!vowText.trim()) return null;
    return inferDeadline(vowText);
  }, [vowText]);

  const deadlineDate = useMemo(
    () => inferredDeadline || getPresetDate(deadlinePreset),
    [deadlinePreset, inferredDeadline],
  );

  const analysis = useMemo(() => {
    if (!vowText.trim()) return null;
    return analyzeVow(vowText);
  }, [vowText]);

  const canContinue = vowText.trim().length >= 3;
  const needsRefine = !!analysis && analysis.type === 'vague' && !shouldSkipRefine(vowText);

  const handleNext = () => {
    const trimmed = vowText.trim();
    if (!trimmed) {
      hapticOtpError();
      return;
    }

    hapticPrimary();
    setRawInput(trimmed);
    setDeadline(deadlineDate.toISOString());

    if (needsRefine) {
      router.push('/refine');
      return;
    }

    setRefinedText(trimmed);
    router.push('/stake');
  };

  if (checkingReturnUser) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingScreen} />
      </>
    );
  }

  return (
    <RitualScreen
      scroll={false}
      contentStyle={styles.content}
      footer={
        <PrimaryButton
          label="Next →"
          onPress={handleNext}
          disabled={!canContinue}
          testID="native-create-next"
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topbar}>
        <Pressable onPress={() => router.replace('/dashboard')} style={styles.dashboardLink}>
          <Text style={styles.dashboardArrow}>←</Text>
          <Text style={styles.dashboardText}>Dashboard</Text>
        </Pressable>
        <AppMenuButton />
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.progressBar, styles.progressBarActive]} />
        <View style={styles.progressBar} />
        <View style={styles.progressBar} />
        <View style={styles.progressBar} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.title}>{"What's your vow?"}</Text>
        <Text style={styles.subtitle}>You know the one.</Text>
      </View>

      <View style={styles.inputCard}>
        <TextInput
          value={vowText}
          onChangeText={setVowText}
          placeholder="I will..."
          placeholderTextColor="rgba(164,154,133,0.58)"
          style={styles.vowInput}
          multiline
          autoCapitalize="sentences"
          returnKeyType="done"
          testID="native-create-input"
        />
      </View>

      <View style={styles.deadlineCard}>
        <View style={styles.deadlineHeader}>
          <CalendarDays color={palette.textMuted} size={15} />
          <Text style={styles.deadlineText}>
            Verdict <Text style={styles.deadlineBy}>by</Text>{' '}
            <Text style={styles.deadlineDate}>{formatDeadline(deadlineDate)}</Text>
          </Text>
        </View>

        <View style={styles.deadlineChips}>
          {DEADLINES.map((deadline) => {
            const active = !inferredDeadline && deadlinePreset === deadline.id;
            return (
              <Pressable
                key={deadline.id}
                onPress={() => {
                  hapticSelection();
                  setDeadlinePreset(deadline.id);
                }}
                style={[styles.deadlineChip, active && styles.deadlineChipActive]}
                testID={`native-deadline-${deadline.id}`}
              >
                <Text style={[styles.deadlineChipText, active && styles.deadlineChipTextActive]}>
                  {deadline.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.examplesBlock}>
        <Text style={styles.examplesLabel}>Or start with one of these</Text>
        <View style={styles.exampleGrid}>
          {FIRST_SCREEN_EXAMPLES.map((example) => (
            <Pressable
              key={example}
              onPress={() => {
                hapticSelection();
                setVowText(example);
              }}
              style={styles.exampleCard}
              testID={`native-example-${example}`}
            >
              <Text style={styles.exampleText}>{example}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    paddingTop: 8,
    gap: 20,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dashboardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  dashboardArrow: {
    color: palette.textSecondary,
    fontSize: 18,
  },
  dashboardText: {
    color: palette.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: palette.borderStrong,
  },
  progressBarActive: {
    backgroundColor: palette.goldBright,
  },
  hero: {
    gap: 7,
  },
  title: {
    color: palette.text,
    fontSize: 33,
    lineHeight: 38,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: 18,
    fontStyle: 'italic',
  },
  inputCard: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(200,155,60,0.28)',
    backgroundColor: 'rgba(8, 21, 24, 0.78)',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  vowInput: {
    color: palette.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    minHeight: 82,
    textAlignVertical: 'top',
  },
  deadlineCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(240,233,219,0.08)',
    backgroundColor: 'rgba(8, 21, 24, 0.72)',
    padding: 16,
    gap: 14,
  },
  deadlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deadlineText: {
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  deadlineBy: {
    color: palette.textMuted,
    fontStyle: 'italic',
  },
  deadlineDate: {
    color: palette.text,
    fontWeight: '800',
  },
  deadlineChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deadlineChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 13,
    paddingVertical: 9,
    minHeight: 38,
    justifyContent: 'center',
  },
  deadlineChipActive: {
    borderColor: palette.gold,
    backgroundColor: 'rgba(200,155,60,0.12)',
  },
  deadlineChipText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  deadlineChipTextActive: {
    color: palette.goldBright,
  },
  examplesBlock: {
    gap: 13,
  },
  examplesLabel: {
    color: '#7f89a7',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  exampleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  exampleCard: {
    width: '48%',
    minHeight: 76,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(240,233,219,0.08)',
    backgroundColor: 'rgba(8, 21, 24, 0.82)',
    padding: 14,
    justifyContent: 'center',
  },
  exampleText: {
    color: palette.textSecondary,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
});

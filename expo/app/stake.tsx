import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { CreditCard, Flame, HeartHandshake, ShieldCheck } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  BackButton,
  ChoiceChip,
  PrimaryButton,
  RitualCard,
  RitualScreen,
  TitleBlock,
} from '@/components/vow-ui';
import { antiCauses, charities, inferDeadline, palette, stakeAmounts } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

type DeadlinePreset = 'tomorrow' | 'end_of_week' | 'in_7_days' | 'in_30_days' | 'custom';

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
    case 'custom':
      d.setDate(d.getDate() + 7);
      break;
  }
  d.setHours(23, 59, 59, 0);
  return d;
}

function formatDeadlineLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function StakeScreen() {
  const { setStake, setDeadline, vow, activeVowText } = useVowFlow();

  const [amount, setAmount] = useState<number>(vow.stake.amount);
  const [consequence, setConsequence] = useState<typeof vow.stake.consequence>(vow.stake.consequence);
  const [destination, setDestination] = useState<string>(vow.stake.destination);

  // Deadline state
  const implicitDeadline = useMemo(() => inferDeadline(activeVowText), [activeVowText]);
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>('in_7_days');
  const [customDate, setCustomDate] = useState<Date>(getPresetDate('in_7_days'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const showDeadlinePicker = !implicitDeadline;

  const deadlineDate = useMemo(() => {
    if (implicitDeadline) return implicitDeadline;
    if (deadlinePreset === 'custom') return customDate;
    return getPresetDate(deadlinePreset);
  }, [implicitDeadline, deadlinePreset, customDate]);

  // Sync deadline to provider
  useEffect(() => {
    setDeadline(deadlineDate.toISOString());
  }, [deadlineDate, setDeadline]);

  console.log('[StakeScreen] rendering, amount:', amount, 'consequence:', consequence);

  const options = useMemo(() => {
    if (consequence === 'anti') return antiCauses;
    return charities;
  }, [consequence]);

  const canContinue = useMemo(() => destination.trim().length > 0, [destination]);

  const handleContinue = () => {
    if (!canContinue) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStake({ amount, consequence, destination });
    router.push('/witness');
  };

  const amountHint = useMemo(() => {
    if (amount === 10) return 'A nudge. Better than nothing.';
    if (amount === 25) return 'Enough to sting.';
    if (amount === 50) return 'Now we\'re talking.';
    if (amount === 100) return 'You actually mean it.';
    return '';
  }, [amount]);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleAmountPress = (value: number) => {
    void Haptics.selectionAsync();
    setAmount(value);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
  };

  return (
    <RitualScreen
      footer={
        <PrimaryButton
          label={`Confirm $${amount} stake`}
          onPress={handleContinue}
          disabled={!canContinue}
          testID="stake-continue"
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <BackButton />
      <TitleBlock
        title="Set the stakes."
        subtitle="How much skin are you putting in?"
      />
      <RitualCard>
        <Animated.View style={[styles.amountDisplay, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.amountBig}>${amount}</Text>
          <Text style={styles.amountHint}>{amountHint}</Text>
        </Animated.View>
        <View style={styles.amountRow}>
          {stakeAmounts.map((value) => {
            const active = amount === value;
            return (
              <Pressable
                key={value}
                onPress={() => handleAmountPress(value)}
                style={[styles.amountChip, active ? styles.amountChipActive : null]}
                testID={`stake-amount-${value}`}
              >
                <Text style={[styles.amountText, active ? styles.amountTextActive : null]}>${value}</Text>
              </Pressable>
            );
          })}
        </View>
      </RitualCard>

      <RitualCard>
        <Text style={styles.sectionTitle}>When you break the vow, where does the money go?</Text>
        {[
          { id: 'charity' as const, label: 'A cause you believe in', description: 'Your money does some good.', Icon: HeartHandshake },
          { id: 'anti' as const, label: 'A cause you hate', description: 'Maximum pain. Maximum motivation.', Icon: Flame },
        ].map((option) => {
          const active = consequence === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                void Haptics.selectionAsync();
                setConsequence(option.id);
                if (option.id === 'charity') {
                  setDestination(charities[0]);
                } else {
                  setDestination(antiCauses[0]);
                }
              }}
              style={[styles.consequenceCard, active ? styles.consequenceCardActive : null]}
              testID={`stake-consequence-${option.id}`}
            >
              <View style={[styles.radio, active ? styles.radioActive : null]}>
                {active ? <View style={styles.radioDot} /> : null}
              </View>
              <option.Icon color={active ? palette.goldBright : palette.textSecondary} size={18} />
              <View style={styles.consequenceCopy}>
                <Text style={[styles.consequenceTitle, active ? styles.consequenceTitleActive : null]}>{option.label}</Text>
                <Text style={styles.consequenceDesc}>{option.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </RitualCard>

      <RitualCard>
        <Text style={styles.sectionTitle}>
          {consequence === 'anti' ? 'Pick a cause that stings' : 'Pick a charity'}
        </Text>
        {consequence === 'anti' ? (
          <Text style={styles.antiHint}>The worse it feels, the harder you'll try.</Text>
        ) : null}
        <View style={styles.optionWrap}>
          {options.map((option) => (
            <ChoiceChip key={option} label={option} active={destination === option} onPress={() => setDestination(option)} />
          ))}
        </View>
      </RitualCard>

      {/* Deadline picker */}
      {showDeadlinePicker && (
        <RitualCard>
          <Text style={styles.sectionTitle}>Deadline</Text>
          <View style={styles.deadlineRow}>
            {([
              ['tomorrow', 'Tomorrow'],
              ['end_of_week', 'End of week'],
              ['in_7_days', 'In 7 days'],
              ['in_30_days', 'A month'],
            ] as const).map(([id, label]) => {
              const active = deadlinePreset === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setDeadlinePreset(id);
                    setShowDatePicker(false);
                  }}
                  style={[styles.deadlineChip, active && styles.deadlineChipActive]}
                >
                  <Text style={[styles.deadlineChipText, active && styles.deadlineChipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                setDeadlinePreset('custom');
                setShowDatePicker(true);
              }}
              style={[styles.deadlineChip, deadlinePreset === 'custom' && styles.deadlineChipActive]}
            >
              <Text style={[styles.deadlineChipText, deadlinePreset === 'custom' && styles.deadlineChipTextActive]}>Pick date</Text>
            </Pressable>
          </View>
          {showDatePicker && deadlinePreset === 'custom' && (
            <DateTimePicker
              value={customDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date(Date.now() + 86400000)}
              themeVariant="dark"
              onChange={(_e, date) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (date) {
                  date.setHours(23, 59, 59, 0);
                  setCustomDate(date);
                }
              }}
            />
          )}
          <Text style={styles.deadlineLabel}>Ends {formatDeadlineLabel(deadlineDate)}</Text>
        </RitualCard>
      )}

      <View style={styles.paymentHint}>
        <View style={styles.paymentIconRow}>
          <CreditCard color={palette.textMuted} size={16} />
          <ShieldCheck color={palette.textMuted} size={16} />
        </View>
        <Text style={styles.paymentText}>
          You get it all back when you keep your vow.
        </Text>
      </View>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  amountDisplay: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  amountBig: {
    color: palette.goldBright,
    fontSize: 48,
    fontWeight: '800' as const,
    letterSpacing: -2,
  },
  amountHint: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 10,
  },
  amountChip: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountChipActive: {
    backgroundColor: 'rgba(212,162,79,0.14)',
    borderColor: palette.borderStrong,
  },
  amountText: {
    color: palette.textSecondary,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  amountTextActive: {
    color: palette.goldBright,
  },
  consequenceCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: palette.surfaceElevated,
    padding: 14,
  },
  consequenceCardActive: {
    borderColor: palette.borderStrong,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: palette.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: palette.goldBright,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.goldBright,
  },
  consequenceCopy: {
    flex: 1,
    gap: 2,
  },
  consequenceTitle: {
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  consequenceTitleActive: {
    color: palette.text,
  },
  consequenceDesc: {
    color: palette.textMuted,
    fontSize: 13,
  },
  antiHint: {
    color: palette.textMuted,
    fontSize: 13,
    fontStyle: 'italic' as const,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  deadlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deadlineChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceElevated,
  },
  deadlineChipActive: {
    backgroundColor: 'rgba(212,162,79,0.14)',
    borderColor: palette.borderStrong,
  },
  deadlineChipText: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  deadlineChipTextActive: {
    color: palette.goldBright,
  },
  deadlineLabel: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  paymentHint: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  paymentIconRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentText: {
    color: palette.textMuted,
    fontSize: 12,
    textAlign: 'center' as const,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});

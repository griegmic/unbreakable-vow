import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { CreditCard, Flame, HandCoins, HeartHandshake, ShieldCheck } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  BackButton,
  ChoiceChip,
  PrimaryButton,
  RitualCard,
  RitualScreen,
  TitleBlock,
  VowPreview,
} from '@/components/vow-ui';
import { antiCauses, charities, consequenceOptions, palette, stakeAmounts } from '@/constants/unbreakable';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

export default function StakeScreen() {
  const { activeVowText, setStake, vow } = useVowFlow();
  const { isAuthenticated } = useAuth();
  const [amount, setAmount] = useState<number>(vow.stake.amount);
  const [consequence, setConsequence] = useState<typeof vow.stake.consequence>(vow.stake.consequence);
  const [destination, setDestination] = useState<string>(vow.stake.destination);

  console.log('[StakeScreen] rendering, amount:', amount, 'consequence:', consequence);

  const options = useMemo(() => {
    if (consequence === 'anti') return antiCauses;
    if (consequence === 'charity') return charities;
    return [vow.witnessName || 'Your witness'];
  }, [consequence, vow.witnessName]);

  const canContinue = useMemo(() => destination.trim().length > 0, [destination]);

  const handleContinue = () => {
    if (!canContinue) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStake({ amount, consequence, destination });
    router.push(isAuthenticated ? '/seal' : '/auth');
  };

  const amountHint = useMemo(() => {
    if (amount === 10) return 'A nudge. Better than nothing.';
    if (amount === 25) return 'Enough to sting.';
    if (amount === 50) return 'Serious without being reckless.';
    if (amount === 100) return 'You really mean it.';
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
        subtitle="You're only charged if your witness says you broke it. Pick an amount you'd genuinely hate to lose."
      />
      <VowPreview text={activeVowText} compact />

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
        <Text style={styles.sectionTitle}>Where does it go if you fail?</Text>
        {consequenceOptions.map((option) => {
          const active = consequence === option.id;
          const Icon = option.id === 'charity' ? HeartHandshake : option.id === 'witness' ? HandCoins : Flame;
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                void Haptics.selectionAsync();
                setConsequence(option.id);
                if (option.id === 'witness') {
                  setDestination(vow.witnessName || 'Your witness');
                } else if (option.id === 'charity') {
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
              <Icon color={active ? palette.goldBright : palette.textSecondary} size={18} />
              <View style={styles.consequenceCopy}>
                <Text style={[styles.consequenceTitle, active ? styles.consequenceTitleActive : null]}>{option.label}</Text>
                <Text style={styles.consequenceDesc}>{option.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </RitualCard>

      {consequence !== 'witness' ? (
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
      ) : null}

      <View style={styles.paymentHint}>
        <View style={styles.paymentIconRow}>
          <CreditCard color={palette.textMuted} size={16} />
          <ShieldCheck color={palette.textMuted} size={16} />
        </View>
        <Text style={styles.paymentText}>
          Secure payment via Stripe. You'll be refunded in full if your witness confirms you kept your vow.
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

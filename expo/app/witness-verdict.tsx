import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Check, CircleDollarSign } from 'lucide-react-native';
import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { RitualCard, RitualScreen, TitleBlock } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

type VerdictChoice = 'kept' | 'broken' | null;

export default function WitnessVerdictScreen() {
  const { activeVowText, vow } = useVowFlow();
  const { displayName: makerName } = useAuth();

  const displayName = makerName || 'your friend';
  const destination =
    vow.stake.consequence === 'witness'
      ? 'you'
      : vow.stake.destination;

  console.log('[WitnessVerdictScreen] rendering');

  const handleCardTap = useCallback((choice: VerdictChoice) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (choice === 'kept') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    const route = choice === 'kept' ? '/vow-kept' : '/vow-broken';
    setTimeout(() => router.push(route as never), 150);
  }, []);

  return (
    <RitualScreen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <TitleBlock
          title={`Did ${displayName} keep the vow?`}
          subtitle="Be honest. That's the whole point."
        />

        <RitualCard>
          <Text style={styles.vowText}>{activeVowText}</Text>
          <View style={styles.rule} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>At stake</Text>
            <Text style={styles.metaValue}>${vow.stake.amount}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>If broken, goes to</Text>
            <Text style={styles.metaValueMuted}>{destination}</Text>
          </View>
        </RitualCard>

        <View style={styles.buttonColumn}>
          <Pressable
            style={[styles.verdictButton, styles.keepButtonWitness]}
            onPress={() => handleCardTap('kept')}
            testID="verdict-kept"
          >
            <View style={[styles.iconCircle, styles.iconCircleKept]}>
              <Check color={palette.success} size={22} />
            </View>
            <View style={styles.copyWrap}>
              <Text style={styles.verdictTitle}>Vow kept.</Text>
              <Text style={styles.verdictDesc}>
                {displayName} did what they said. ${vow.stake.amount} stays safe.
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.verdictButton, styles.breakButtonWitness]}
            onPress={() => handleCardTap('broken')}
            testID="verdict-broken"
          >
            <View style={[styles.iconCircle, styles.iconCircleBroken]}>
              <CircleDollarSign color={palette.warmAmber} size={22} />
            </View>
            <View style={styles.copyWrap}>
              <Text style={styles.verdictTitle}>Vow broken.</Text>
              <Text style={styles.verdictDesc}>
                ${vow.stake.amount} to {destination}.
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          Your honesty is what makes this work.
        </Text>
      </View>


    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    justifyContent: 'space-between',
    gap: 18,
  },
  vowText: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  rule: {
    height: 1,
    backgroundColor: palette.border,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    color: palette.textMuted,
    fontSize: 13,
  },
  metaValue: {
    color: palette.goldBright,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  metaValueMuted: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  buttonColumn: {
    gap: 14,
  },
  verdictButton: {
    minHeight: 96,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  keepButtonWitness: {
    borderColor: 'rgba(82,214,154,0.22)',
    backgroundColor: 'rgba(82,214,154,0.08)',
  },
  breakButtonWitness: {
    borderColor: palette.warmAmberBorder,
    backgroundColor: palette.warmAmberMuted,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleKept: {
    backgroundColor: 'rgba(82,214,154,0.12)',
    borderColor: 'rgba(82,214,154,0.24)',
  },
  iconCircleBroken: {
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderColor: palette.warmAmberBorder,
  },
  copyWrap: {
    flex: 1,
    gap: 4,
  },
  verdictTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  verdictDesc: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimer: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
  },

});

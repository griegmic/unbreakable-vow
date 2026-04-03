import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RitualCard, RitualScreen, TitleBlock } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

export default function WitnessVerdictScreen() {
  const { activeVowText, vow } = useVowFlow();

  const isVowkeeper = vow.witnessName === 'Vowkeeper';
  const firstName = isVowkeeper ? 'you' : vow.witnessName.split(' ')[0];
  const destination =
    vow.stake.consequence === 'witness'
      ? 'you'
      : vow.stake.destination;

  return (
    <RitualScreen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <TitleBlock
          title={isVowkeeper ? 'Did you keep the vow?' : `Did ${firstName} keep the vow?`}
          subtitle={isVowkeeper
            ? 'Be honest. This decision is final and the money moves.'
            : 'This decision is final. Once you choose, the money moves.'
          }
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
            style={[styles.verdictButton, styles.keepButton]}
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.push('/vow-kept');
            }}
            testID="verdict-kept"
          >
            <CheckCircle2 color={palette.success} size={24} />
            <View style={styles.copyWrap}>
              <Text style={styles.verdictTitle}>Vow kept</Text>
              <Text style={styles.verdictDesc}>
                {isVowkeeper
                  ? `I honored my vow. ${vow.stake.amount} stays safe.`
                  : `${firstName} did what they promised. ${vow.stake.amount} stays safe.`}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.verdictButton, styles.breakButton]}
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              router.push('/vow-broken');
            }}
            testID="verdict-broken"
          >
            <AlertTriangle color={palette.danger} size={24} />
            <View style={styles.copyWrap}>
              <Text style={styles.verdictTitle}>Vow broken</Text>
              <Text style={styles.verdictDesc}>
                {isVowkeeper
                  ? `I didn't follow through. ${vow.stake.amount} goes to ${destination}.`
                  : `${vow.stake.amount} goes to ${destination}. No take-backs.`}
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          {isVowkeeper ? 'Your honesty is what makes this work.' : `${firstName}'s fate is in your hands.`}
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
    minHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  keepButton: {
    borderColor: 'rgba(82,214,154,0.22)',
    backgroundColor: palette.successMuted,
  },
  breakButton: {
    borderColor: 'rgba(255,123,123,0.22)',
    backgroundColor: palette.dangerMuted,
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

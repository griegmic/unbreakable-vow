import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowUpRight, Check, CircleDollarSign } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { RitualCard, RitualScreen, TitleBlock } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

type VerdictChoice = 'kept' | 'broken' | null;

export default function WitnessVerdictScreen() {
  const { activeVowText, vow } = useVowFlow();

  const isVowkeeper = vow.witnessName === 'Vowkeeper';
  const displayName = isVowkeeper ? 'You' : vow.witnessName.split(' ')[0];
  const destination =
    vow.stake.consequence === 'witness'
      ? 'you'
      : vow.stake.destination;

  console.log('[WitnessVerdictScreen] rendering, isVowkeeper:', isVowkeeper);

  const [selected, setSelected] = useState<VerdictChoice>(null);
  const [confirmVisible, setConfirmVisible] = useState<boolean>(false);
  const [pendingVerdict, setPendingVerdict] = useState<VerdictChoice>(null);

  const keptColorAnim = useRef(new Animated.Value(0)).current;
  const brokenColorAnim = useRef(new Animated.Value(0)).current;

  const handleCardTap = useCallback((choice: VerdictChoice) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (choice === 'broken') {
      if (isVowkeeper) {
        setSelected('broken');
        Animated.timing(brokenColorAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
        Animated.timing(keptColorAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => router.push('/vow-broken'), isVowkeeper ? 350 : 150);
      return;
    }

    if (isVowkeeper) {
      setSelected(choice);
      Animated.timing(keptColorAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
      Animated.timing(brokenColorAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }

    setPendingVerdict(choice);
    setTimeout(() => setConfirmVisible(true), isVowkeeper ? 350 : 100);
  }, [isVowkeeper, keptColorAnim, brokenColorAnim]);

  const handleConfirm = useCallback(() => {
    setConfirmVisible(false);
    if (pendingVerdict === 'kept') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/vow-kept');
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      router.push('/vow-broken');
    }
  }, [pendingVerdict]);

  const handleCancel = useCallback(() => {
    setConfirmVisible(false);
    if (isVowkeeper) {
      setSelected(null);
      Animated.timing(keptColorAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      Animated.timing(brokenColorAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
    setPendingVerdict(null);
  }, [isVowkeeper, keptColorAnim, brokenColorAnim]);

  const keptBgColor = isVowkeeper
    ? keptColorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [palette.surface, 'rgba(82,214,154,0.1)'],
      })
    : undefined;

  const keptBorderColor = isVowkeeper
    ? keptColorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0.08)', 'rgba(82,214,154,0.24)'],
      })
    : undefined;

  const brokenBgColor = isVowkeeper
    ? brokenColorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [palette.surface, 'rgba(212,162,79,0.1)'],
      })
    : undefined;

  const brokenBorderColor = isVowkeeper
    ? brokenColorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0.08)', 'rgba(212,162,79,0.24)'],
      })
    : undefined;

  const keptIconColor = isVowkeeper
    ? (selected === 'kept' ? palette.success : palette.textSecondary)
    : palette.success;

  const brokenIconColor = isVowkeeper
    ? (selected === 'broken' ? palette.warmAmber : palette.textSecondary)
    : palette.warmAmber;

  return (
    <RitualScreen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <TitleBlock
          title={isVowkeeper ? 'How did it go?' : `Did ${displayName} keep the vow?`}
          subtitle={isVowkeeper
            ? 'No judgment. Just the truth.'
            : "Be honest. That\u2019s the whole point."
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
          {isVowkeeper ? (
            <>
              <Animated.View style={[
                styles.verdictCardBase,
                {
                  backgroundColor: keptBgColor,
                  borderColor: keptBorderColor,
                },
              ]}>
                <Pressable
                  style={styles.verdictPressable}
                  onPress={() => handleCardTap('kept')}
                  testID="verdict-kept"
                >
                  <View style={[styles.iconCircle, selected === 'kept' && styles.iconCircleKept]}>
                    <Check color={keptIconColor} size={22} />
                  </View>
                  <View style={styles.copyWrap}>
                    <Text style={styles.verdictTitle}>Nailed it.</Text>
                    <Text style={styles.verdictDesc}>
                      ${vow.stake.amount} stays safe. You earned it.
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>

              <Animated.View style={[
                styles.verdictCardBase,
                {
                  backgroundColor: brokenBgColor,
                  borderColor: brokenBorderColor,
                },
              ]}>
                <Pressable
                  style={styles.verdictPressable}
                  onPress={() => handleCardTap('broken')}
                  testID="verdict-broken"
                >
                  <View style={[styles.iconCircle, selected === 'broken' && styles.iconCircleBroken]}>
                    <ArrowUpRight color={brokenIconColor} size={22} />
                  </View>
                  <View style={styles.copyWrap}>
                    <Text style={styles.verdictTitle}>{"Didn\u2019t make it."}</Text>
                    <Text style={styles.verdictDesc}>
                      ${vow.stake.amount} goes to {destination}. Honest answer, good karma.
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            </>
          ) : (
            <>
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
                    ${vow.stake.amount} goes to {destination}. {displayName} would want you to be honest.
                  </Text>
                </View>
              </Pressable>
            </>
          )}
        </View>

        <Text style={styles.disclaimer}>
          Your honesty is what makes this work.
        </Text>
      </View>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
          <View style={styles.modalCard}>
            {pendingVerdict === 'kept' ? (
              <>
                <View style={[styles.modalIconWrap, styles.modalIconKept]}>
                  <Check color={palette.success} size={24} />
                </View>
                <Text style={styles.modalTitle}>
                  {isVowkeeper
                    ? 'Confirm: you kept the vow?'
                    : `Confirm: ${displayName} kept the vow?`
                  }
                </Text>
                <Text style={styles.modalBody}>
                  ${vow.stake.amount} stays safe. No charge.
                </Text>
              </>
            ) : (
              <>
                <View style={[styles.modalIconWrap, styles.modalIconBroken]}>
                  <CircleDollarSign color={palette.warmAmber} size={24} />
                </View>
                <Text style={styles.modalTitle}>
                  {isVowkeeper
                    ? `Confirm: you didn\u2019t keep the vow?`
                    : `Confirm: ${displayName} broke the vow?`
                  }
                </Text>
                <Text style={styles.modalBody}>
                  ${vow.stake.amount} will be donated to {destination}.
                </Text>
              </>
            )}

            <Pressable
              style={[
                styles.confirmButton,
                pendingVerdict === 'kept'
                  ? styles.confirmButtonKept
                  : styles.confirmButtonBroken,
              ]}
              onPress={handleConfirm}
              testID="verdict-confirm"
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </Pressable>

            <Pressable onPress={handleCancel} style={styles.cancelButton} testID="verdict-cancel">
              <Text style={styles.cancelButtonText}>Go back</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  verdictCardBase: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  verdictPressable: {
    minHeight: 96,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%',
    backgroundColor: palette.surfaceElevated,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalIconKept: {
    backgroundColor: 'rgba(82,214,154,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.24)',
  },
  modalIconBroken: {
    backgroundColor: palette.warmAmberMuted,
    borderWidth: 1,
    borderColor: palette.warmAmberBorder,
  },
  modalTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  modalBody: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center' as const,
  },
  confirmButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  confirmButtonKept: {
    backgroundColor: 'rgba(82,214,154,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.3)',
  },
  confirmButtonBroken: {
    backgroundColor: palette.warmAmberMuted,
    borderWidth: 1,
    borderColor: palette.warmAmberBorder,
  },
  confirmButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  cancelButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

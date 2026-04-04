import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Check, CircleDollarSign, Hand, ShieldCheck } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { RitualCard, RitualScreen, TitleBlock } from '@/components/vow-ui';
import { palette, serifFont } from '@/constants/unbreakable';
import { supabase } from '@/lib/supabase';
import { useVowFlow } from '@/providers/vow-flow';

type VerdictChoice = 'kept' | 'broken' | null;

export default function SelfResolveScreen() {
  const { activeVowText, vow } = useVowFlow();

  const destination =
    vow.stake.consequence === 'witness'
      ? 'charity'
      : vow.stake.destination;

  console.log('[SelfResolveScreen] rendering');

  const [sworn, setSworn] = useState<boolean>(false);
  const [selectedVerdict, setSelectedVerdict] = useState<VerdictChoice>(null);
  const [confirmVisible, setConfirmVisible] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const checkboxScale = useRef(new Animated.Value(1)).current;
  const swearGlow = useRef(new Animated.Value(0)).current;
  const oathPulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(oathPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(oathPulse, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwear = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSworn(true);
    Animated.parallel([
      Animated.timing(swearGlow, { toValue: 1, duration: 600, useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(checkboxScale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
        Animated.spring(checkboxScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
      ]),
    ]).start();
  };

  const handleUnswear = () => {
    void Haptics.selectionAsync();
    setSworn(false);
    setSelectedVerdict(null);
    Animated.timing(swearGlow, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  };

  const handleSelectVerdict = useCallback((choice: VerdictChoice) => {
    if (!sworn) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedVerdict(choice);
    setTimeout(() => setConfirmVisible(true), 100);
  }, [sworn]);

  const handleConfirm = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    if (vow.witnessInviteToken) {
      try {
        await supabase.functions.invoke('submit-verdict', {
          body: { token: vow.witnessInviteToken, verdict: selectedVerdict },
        });
      } catch (err) {
        console.error('[SelfResolve] submit error:', err);
        setSubmitting(false);
        setConfirmVisible(false);
        Alert.alert('Something went wrong', 'Please try again.');
        return;
      }
    }

    setSubmitting(false);
    setConfirmVisible(false);

    if (selectedVerdict === 'kept') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/vow-kept');
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      router.push('/vow-broken');
    }
  }, [selectedVerdict, submitting, vow.witnessInviteToken]);

  const handleCancel = useCallback(() => {
    if (submitting) return;
    setConfirmVisible(false);
    setSelectedVerdict(null);
  }, [submitting]);

  const swearBorderColor = swearGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.border, palette.borderStrong],
  });

  const swearBgOpacity = swearGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.06],
  });

  return (
    <RitualScreen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <View style={styles.topSection}>
          <View style={styles.oathSymbol}>
            <Animated.View style={[styles.oathGlow, { opacity: oathPulse }]} />
            <View style={styles.oathCircle}>
              <Hand color={palette.goldBright} size={26} />
            </View>
          </View>

          <TitleBlock
            title="Time to be honest."
            subtitle="No one is watching. No one will know but you. That's what makes this real."
          />

          <RitualCard>
            <Text style={styles.vowText}>{activeVowText}</Text>
            <View style={styles.rule} />
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>At stake</Text>
              <Text style={styles.metaValue}>${vow.stake.amount}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>If broken</Text>
              <Text style={styles.metaValueMuted}>Donated to {destination}</Text>
            </View>
          </RitualCard>
        </View>

        <View style={styles.bottomSection}>
          <Animated.View style={[styles.oathCard, { borderColor: swearBorderColor }]}>
            <Animated.View style={[styles.oathCardGlow, { opacity: swearBgOpacity }]} />
            <Pressable
              onPress={sworn ? handleUnswear : handleSwear}
              style={styles.oathRow}
              testID="self-resolve-swear"
            >
              <Animated.View style={[styles.checkbox, sworn && styles.checkboxChecked, { transform: [{ scale: checkboxScale }] }]}>
                {sworn ? <Check color="#0B0D11" size={14} strokeWidth={3} /> : null}
              </Animated.View>
              <View style={styles.oathCopy}>
                <Text style={styles.oathTitle}>I swear to tell the truth</Text>
                <Text style={styles.oathText}>
                  I will answer honestly, even if the truth costs me money.
                </Text>
              </View>
            </Pressable>
          </Animated.View>

          {sworn ? (
            <View style={styles.verdictColumn}>
              <Pressable
                style={[styles.verdictButton, styles.keepButton]}
                onPress={() => handleSelectVerdict('kept')}
                testID="self-verdict-kept"
              >
                <View style={[styles.iconCircle, styles.iconCircleKept]}>
                  <ShieldCheck color={palette.success} size={20} />
                </View>
                <View style={styles.verdictCopy}>
                  <Text style={styles.verdictTitle}>I kept my vow.</Text>
                  <Text style={styles.verdictDesc}>${vow.stake.amount} stays safe.</Text>
                </View>
              </Pressable>

              <Pressable
                style={[styles.verdictButton, styles.breakButton]}
                onPress={() => handleSelectVerdict('broken')}
                testID="self-verdict-broken"
              >
                <View style={[styles.iconCircle, styles.iconCircleBroken]}>
                  <CircleDollarSign color={palette.warmAmber} size={20} />
                </View>
                <View style={styles.verdictCopy}>
                  <Text style={styles.verdictTitle}>I broke it.</Text>
                  <Text style={styles.verdictDesc}>${vow.stake.amount} goes to {destination}.</Text>
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={styles.lockedHint}>
              <Text style={styles.lockedHintText}>Take the oath above to unlock your verdict.</Text>
            </View>
          )}
        </View>
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
            {selectedVerdict === 'kept' ? (
              <>
                <View style={[styles.modalIconWrap, styles.modalIconKept]}>
                  <ShieldCheck color={palette.success} size={24} />
                </View>
                <Text style={styles.modalTitle}>You kept your word.</Text>
                <Text style={styles.modalBody}>
                  ${vow.stake.amount} stays safe. No charge. You honored the promise you made to yourself.
                </Text>
              </>
            ) : (
              <>
                <View style={[styles.modalIconWrap, styles.modalIconBroken]}>
                  <CircleDollarSign color={palette.warmAmber} size={24} />
                </View>
                <Text style={styles.modalTitle}>Honest. Respect.</Text>
                <Text style={styles.modalBody}>
                  ${vow.stake.amount} will be donated to {destination}. It takes courage to admit that.
                </Text>
              </>
            )}

            <Pressable
              style={[
                styles.confirmButton,
                selectedVerdict === 'kept'
                  ? styles.confirmButtonKept
                  : styles.confirmButtonBroken,
                submitting && { opacity: 0.6 },
              ]}
              onPress={handleConfirm}
              disabled={submitting}
              testID="self-verdict-confirm"
            >
              {submitting ? (
                <ActivityIndicator color={palette.text} size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm</Text>
              )}
            </Pressable>

            <Pressable onPress={handleCancel} style={styles.cancelButton} testID="self-verdict-cancel">
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
  },
  topSection: {
    gap: 16,
  },
  bottomSection: {
    gap: 14,
  },
  oathSymbol: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 72,
  },
  oathGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 80,
    backgroundColor: palette.goldGlow,
  },
  oathCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
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
  oathCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    backgroundColor: palette.surface,
    overflow: 'hidden',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  oathCardGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.goldBright,
  },
  oathRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: palette.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: palette.goldBright,
    borderColor: palette.goldBright,
  },
  oathCopy: {
    flex: 1,
    gap: 4,
  },
  oathTitle: {
    color: palette.goldBright,
    fontSize: 17,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    letterSpacing: -0.3,
  },
  oathText: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  verdictColumn: {
    gap: 10,
  },
  verdictButton: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  keepButton: {
    borderColor: 'rgba(82,214,154,0.22)',
    backgroundColor: 'rgba(82,214,154,0.08)',
  },
  breakButton: {
    borderColor: palette.warmAmberBorder,
    backgroundColor: palette.warmAmberMuted,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconCircleKept: {
    backgroundColor: 'rgba(82,214,154,0.12)',
    borderColor: 'rgba(82,214,154,0.24)',
  },
  iconCircleBroken: {
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderColor: palette.warmAmberBorder,
  },
  verdictCopy: {
    flex: 1,
    gap: 2,
  },
  verdictTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  verdictDesc: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  lockedHint: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  lockedHintText: {
    color: palette.textMuted,
    fontSize: 13,
    fontStyle: 'italic' as const,
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
    fontFamily: serifFont,
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

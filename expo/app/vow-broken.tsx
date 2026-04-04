import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowRight, CircleDollarSign, ReceiptText } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualCard, RitualScreen, SecondaryButton, TitleBlock } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

export default function VowBrokenScreen() {
  const { activeVowText, resetVow, vow } = useVowFlow();

  const destination =
    vow.stake.consequence === 'witness'
      ? vow.witnessName
      : vow.stake.destination;

  const isVowkeeper = vow.witnessName === 'Vowkeeper';
  const firstName = isVowkeeper ? 'You' : vow.witnessName.split(' ')[0];

  const alertScale = useRef(new Animated.Value(0.5)).current;
  const alertOpacity = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const receiptSlide = useRef(new Animated.Value(20)).current;
  const receiptFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(alertScale, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 8 }),
        Animated.timing(alertOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(receiptFade, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(receiptSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();

    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label="Make a redemption vow"
            onPress={() => {
              resetVow();
              router.replace('/');
            }}
            testID="broken-new-vow"
          />
          <SecondaryButton label="View your record" onPress={() => router.push('/history')} testID="broken-history" />
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.alertWrap}>
        <Animated.View style={[styles.alertBadge, { opacity: alertOpacity, transform: [{ scale: alertScale }] }]}>
          <CircleDollarSign color={palette.warmAmber} size={28} />
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: contentFade }}>
        <TitleBlock
          title={isVowkeeper ? "It happens." : `${firstName} called it.`}
          subtitle={`${vow.stake.amount} goes to ${destination}. The terms were clear, and you were honest.`}
        />
      </Animated.View>

      <Animated.View style={{ opacity: contentFade }}>
        <RitualCard>
          <Text style={styles.vowText}>{activeVowText}</Text>
          <View style={styles.rule} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Witness</Text>
            <Text style={styles.metaValue}>{vow.witnessName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Stake</Text>
            <Text style={styles.metaValueAmber}>Donated to {destination}</Text>
          </View>
        </RitualCard>
      </Animated.View>

      <Animated.View style={{ opacity: receiptFade, transform: [{ translateY: receiptSlide }] }}>
        <RitualCard style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <ReceiptText color={palette.textSecondary} size={18} />
            <Text style={styles.receiptTitle}>Settlement</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Amount</Text>
            <Text style={styles.receiptValue}>${vow.stake.amount}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Donated to</Text>
            <Text style={styles.receiptValue}>{destination}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Status</Text>
            <Text style={styles.receiptValueAmber}>Payment processed</Text>
          </View>
        </RitualCard>
      </Animated.View>

      <Animated.View style={[styles.redemptionHint, { opacity: receiptFade }]}>
        <ArrowRight color={palette.goldBright} size={14} />
        <Text style={styles.redemptionText}>The best response is a new vow. Come back stronger.</Text>
      </Animated.View>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  alertWrap: {
    alignItems: 'center',
    height: 100,
    justifyContent: 'center',
  },
  alertBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.warmAmberMuted,
    borderWidth: 1,
    borderColor: palette.warmAmberBorder,
    shadowColor: palette.warmAmber,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
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
    color: palette.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  metaValueAmber: {
    color: palette.warmAmber,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  receiptCard: {
    backgroundColor: '#0D1219',
  },
  receiptHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  receiptTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    color: palette.textMuted,
    fontSize: 13,
  },
  receiptValue: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  receiptValueAmber: {
    color: palette.warmAmber,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  redemptionHint: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  redemptionText: {
    flex: 1,
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});

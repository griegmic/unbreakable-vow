import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { AlertTriangle, Share2 } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualCard, RitualScreen, SecondaryButton, TitleBlock } from '@/components/vow-ui';
import { palette, serifFont } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

const ANTI_CAUSES = ['Donald Trump', 'NRA', 'Flat Earth Society'];

function isAntiCause(destination: string): boolean {
  return ANTI_CAUSES.some(c => destination.toLowerCase().includes(c.toLowerCase()));
}

export default function VowBrokenScreen() {
  const { activeVowText, resetVow, vow, isSelfWitness, setRawInput } = useVowFlow();

  const destination = vow.stake.destination;
  const amount = vow.stake.amount;
  const isZeroStake = amount === 0;
  const antiCause = isAntiCause(destination);

  const firstName = isSelfWitness ? 'You' : vow.witnessName.split(' ')[0];

  const alertScale = useRef(new Animated.Value(0.5)).current;
  const alertOpacity = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const cardShakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[VowBrokenScreen] vow broken, destination:', destination);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Animated.sequence([
      // Scale in the alert icon
      Animated.parallel([
        Animated.spring(alertScale, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 8 }),
        Animated.timing(alertOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      // Fade in content
      Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      // Shake the card after content is visible
      Animated.sequence([
        Animated.timing(cardShakeX, { toValue: -3, duration: 50, useNativeDriver: true }),
        Animated.timing(cardShakeX, { toValue: 3, duration: 50, useNativeDriver: true }),
        Animated.timing(cardShakeX, { toValue: -2, duration: 50, useNativeDriver: true }),
        Animated.timing(cardShakeX, { toValue: 2, duration: 50, useNativeDriver: true }),
        Animated.timing(cardShakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    });

    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = isSelfWitness ? 'You took the L.' : `${firstName} called it.`;

  const subtitle = (() => {
    if (antiCause && !isZeroStake) {
      return `Yeah... $${amount} just went to ${destination}. Time for a redemption arc.`;
    }
    if (!isZeroStake) {
      return `$${amount} → ${destination}. Honesty noted.`;
    }
    return "Broken. But you told the truth.";
  })();

  const handleShare = async () => {
    void Haptics.selectionAsync();
    if (Platform.OS === 'web') return;

    let text: string;
    if (isZeroStake) {
      text = `I broke my vow: "${activeVowText}" — unbreakablevow.app`;
    } else if (antiCause) {
      text = `I broke my vow and just donated $${amount} to ${destination}. Don't be like me → unbreakablevow.app`;
    } else {
      text = `I broke my vow: "${activeVowText}" — $${amount} donated to ${destination}. unbreakablevow.app`;
    }

    try {
      await Share.share({ message: text });
    } catch {
      console.log('[VowBroken] share failed');
    }
  };

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label="Double down"
            onPress={() => {
              const textToKeep = activeVowText;
              resetVow();
              setRawInput(textToKeep);
              router.replace('/');
            }}
            testID="broken-double-down"
          />
          <SecondaryButton
            label="Challenge a friend"
            onPress={() => {
              resetVow();
              router.replace('/');
            }}
            testID="broken-challenge"
          />
          <SecondaryButton
            label="View your record"
            onPress={() => router.push('/history')}
            testID="broken-history"
          />
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Dramatic icon — animated scale-in */}
      <View style={styles.alertWrap}>
        <Animated.View style={[styles.alertBadge, { opacity: alertOpacity, transform: [{ scale: alertScale }] }]}>
          <AlertTriangle color="#FF7B7B" size={32} />
        </Animated.View>
      </View>

      {/* Title + subtitle */}
      <Animated.View style={{ opacity: contentFade }}>
        <TitleBlock title={title} subtitle={subtitle} />
      </Animated.View>

      {/* Vow card with amber/red border accent + shake animation */}
      <Animated.View style={{ opacity: contentFade, transform: [{ translateX: cardShakeX }] }}>
        <RitualCard style={styles.vowCard}>
          {/* Subtle BROKEN watermark */}
          <View style={styles.brokenStamp} pointerEvents="none">
            <Text style={styles.brokenStampText}>BROKEN</Text>
          </View>

          {/* Vow text in serif */}
          <Text style={styles.vowText}>&ldquo;{activeVowText}&rdquo;</Text>

          <View style={styles.rule} />

          {/* Witness */}
          {!isSelfWitness && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Witness</Text>
              <Text style={styles.metaValue}>{vow.witnessName}</Text>
            </View>
          )}

          {/* Payment line or accountability line */}
          {!isZeroStake ? (
            <View style={styles.paymentLine}>
              <Text style={styles.paymentText}>
                ${amount} → {destination} · Processed ✓
              </Text>
            </View>
          ) : (
            <View style={styles.paymentLine}>
              <Text style={styles.accountabilityText}>Accountability only</Text>
            </View>
          )}
        </RitualCard>
      </Animated.View>

      {/* Share section */}
      <Animated.View style={[styles.shareRow, { opacity: contentFade }]}>
        <Pressable
          onPress={handleShare}
          style={[
            styles.shareButton,
            antiCause && !isZeroStake ? styles.shareButtonAnti : null,
          ]}
          testID="broken-share"
        >
          <Share2 color={antiCause && !isZeroStake ? '#FF7B7B' : palette.goldBright} size={16} />
          <Text style={[
            styles.shareText,
            antiCause && !isZeroStake ? styles.shareTextAnti : null,
          ]}>
            Share the damage
          </Text>
        </Pressable>
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
    backgroundColor: 'rgba(255,123,123,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,123,123,0.28)',
    shadowColor: '#FF7B7B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  vowCard: {
    borderColor: palette.warmAmber,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  brokenStamp: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-18deg' }],
  },
  brokenStampText: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 6,
    color: 'rgba(255,123,123,0.06)',
    textTransform: 'uppercase',
  },
  vowText: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500',
    fontFamily: serifFont,
    textAlign: 'center',
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
    fontWeight: '600',
  },
  paymentLine: {
    alignItems: 'center',
  },
  paymentText: {
    color: palette.warmAmber,
    fontSize: 14,
    fontWeight: '700',
  },
  accountabilityText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  shareRow: {
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
    width: '100%',
    justifyContent: 'center',
  },
  shareButtonAnti: {
    backgroundColor: 'rgba(255,123,123,0.12)',
    borderColor: 'rgba(255,123,123,0.28)',
  },
  shareText: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '800',
  },
  shareTextAnti: {
    color: '#FF7B7B',
  },
});

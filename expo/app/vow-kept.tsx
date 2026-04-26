import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ShieldCheck, ArrowRight } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { AppMenuButton } from '@/components/app-menu';
import { PrimaryButton, RitualCard, RitualScreen, SecondaryButton, TitleBlock } from '@/components/vow-ui';
import { antiCauses, palette, serifFont } from '@/constants/unbreakable';
import { getVowHistory } from '@/lib/vow-api';
import { useVowFlow } from '@/providers/vow-flow';
import type { Database } from '@/types/database';

type VowRow = Database['public']['Tables']['vows']['Row'];

function isAntiCause(destination: string): boolean {
  return antiCauses.some(c => destination.toLowerCase().includes(c.toLowerCase()));
}

export default function VowKeptScreen() {
  const { activeVowText, resetVow, vow, isSelfWitness } = useVowFlow();
  const receiptRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    getVowHistory()
      .then((data) => {
        const rows = data as VowRow[];
        // Calculate streak
        let s = 1; // this one counts
        // Sort by verdict_at descending (should already be)
        const sorted = rows
          .filter((v) => v.verdict !== null)
          .sort((a, b) => {
            const da = a.verdict_at ? new Date(a.verdict_at).getTime() : 0;
            const db = b.verdict_at ? new Date(b.verdict_at).getTime() : 0;
            return db - da;
          });
        for (const v of sorted) {
          if (v.verdict === 'kept') s++;
          else break;
        }
        setStreak(s);
      })
      .catch((err) => {
        console.error('[VowKeptScreen] failed to load history:', err);
        setStreak(1);
      });
  }, []);

  const medalScale = useRef(new Animated.Value(0.3)).current;
  const medalOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const confettiScale = useRef(new Animated.Value(0)).current;

  const firstName = isSelfWitness ? 'You' : vow.witnessName.split(' ')[0];
  const isZeroStake = vow.stake.amount <= 0;
  const destination = vow.stake.destination;

  useEffect(() => {
    console.log('[VowKeptScreen] vow kept! playing celebration');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(medalScale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 12 }),
        Animated.timing(medalOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(confettiScale, { toValue: 1, useNativeDriver: true, speed: 6, bounciness: 14 }),
      ]),
    ]).start();

    // Gold glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 300);
    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 600);

    // Auto-trigger share sheet after celebration animation
    const shareTimer = setTimeout(() => {
      if (Platform.OS !== 'web') {
        Share.share({ message: getShareText() }).catch(() => {});
      }
    }, 1500);
    return () => clearTimeout(shareTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getShareText = useCallback(() => isZeroStake
    ? `I kept my Unbreakable Vow: "${activeVowText}" 🔥 ${streak > 1 ? `${streak} in a row\n` : ''}unbreakablevow.app`
    : `I kept my Unbreakable Vow: "${activeVowText}" — $${vow.stake.amount} protected. 🔥 ${streak > 1 ? `${streak} in a row\n` : ''}unbreakablevow.app`, [activeVowText, isZeroStake, streak, vow.stake.amount]);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    void Haptics.selectionAsync();

    if (Platform.OS === 'web') {
      setSharing(false);
      return;
    }

    try {
      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await Share.share({ url: uri, message: getShareText() });
    } catch {
      // Fallback to text-only
      try {
        await Share.share({ message: getShareText() });
      } catch {
        console.log('[VowKept] share failed');
      }
    } finally {
      setSharing(false);
    }
  }, [sharing, getShareText]);

  const handleDonate = () => {
    const url = `https://www.google.com/search?q=donate+${encodeURIComponent(destination)}`;
    Linking.openURL(url).catch(() => {});
  };

  const title = isSelfWitness ? 'Unbroken.' : `${firstName} confirmed it.`;
  const subtitle = isZeroStake
    ? 'Word honored. Another one in the books.'
    : `Your $${vow.stake.amount} stays safe. Another one in the books.`;

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label="Share your streak"
            onPress={handleShare}
            testID="kept-share"
          />
          <SecondaryButton
            label="Challenge a friend"
            onPress={() => router.push('/cast')}
            testID="kept-challenge"
          />
          <Pressable
            onPress={() => {
              resetVow();
              router.replace('/');
            }}
            style={styles.textLink}
            testID="kept-new-vow"
          >
            <Text style={styles.textLinkLabel}>Make another vow</Text>
          </Pressable>
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
        <AppMenuButton />
      </View>

      {/* Trophy icon with gold glow pulse */}
      <View style={styles.medalWrap}>
        <Animated.View style={[styles.medalGlow, { opacity: glowPulse, transform: [{ scale: glowScale }] }]} />
        <Animated.View style={[styles.medal, { opacity: medalOpacity, transform: [{ scale: medalScale }] }]}>
          <ShieldCheck color={palette.goldBright} size={32} />
        </Animated.View>
      </View>

      {/* Title + subtitle */}
      <Animated.View style={{ opacity: contentFade }}>
        <TitleBlock title={title} subtitle={subtitle} />
      </Animated.View>

      {/* Shareable receipt card — capture via ViewShot */}
      <Animated.View style={{ opacity: contentFade }}>
        <View ref={receiptRef} collapsable={false}>
          <RitualCard>
            <View style={styles.trophyCardInner}>
              {/* Header stamp */}
              <View style={styles.headerStamp}>
                <Text style={styles.headerStampTextKept}>VOW KEPT</Text>
              </View>

              {/* Vow text in serif */}
              <Text style={styles.vowText}>&ldquo;{activeVowText}&rdquo;</Text>

              {/* Divider */}
              <View style={styles.rule} />

              {/* Meta rows */}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Witness</Text>
                <Text style={styles.metaValue}>{isSelfWitness ? 'Self' : vow.witnessName}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Stake</Text>
                <Text style={styles.metaValueSuccess}>
                  {isZeroStake ? 'Accountability only' : `$${vow.stake.amount} saved`}
                </Text>
              </View>
              {streak > 0 && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Streak</Text>
                  <Text style={styles.streakValue}>🔥 {streak} in a row</Text>
                </View>
              )}

              {/* Watermark */}
              <View style={styles.watermarkRow}>
                <Text style={styles.watermarkText}>unbreakablevow.app</Text>
              </View>
            </View>
          </RitualCard>
        </View>
      </Animated.View>

      {/* Pay it forward section — staked vows with destination only */}
      {!isZeroStake && destination && !isAntiCause(destination) ? (
        <Animated.View style={{ opacity: contentFade }}>
          <RitualCard>
            <Text style={styles.payForwardText}>
              You saved ${vow.stake.amount}. Pay it forward?
            </Text>
            <Pressable onPress={handleDonate} style={styles.donateButton}>
              <Text style={styles.donateText}>Donate to {destination} anyway</Text>
              <ArrowRight color={palette.goldBright} size={14} />
            </Pressable>
          </RitualCard>
        </Animated.View>
      ) : null}
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  medalWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  medalGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 100,
    backgroundColor: 'rgba(212,162,79,0.2)',
  },
  medal: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(212,162,79,0.3)',
    shadowColor: '#D4A24F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  trophyCardInner: {
    gap: 12,
  },
  vowText: {
    color: palette.text,
    fontSize: 17,
    lineHeight: 26,
    fontFamily: serifFont,
    fontWeight: '500',
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
  metaValueSuccess: {
    color: palette.success,
    fontSize: 14,
    fontWeight: '700',
  },
  streakValue: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '700',
  },
  payForwardText: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  donateText: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '600',
  },
  headerStamp: {
    alignItems: 'center',
  },
  headerStampTextKept: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    color: palette.goldBright,
    textTransform: 'uppercase',
  },
  watermarkRow: {
    alignItems: 'center',
    paddingTop: 2,
  },
  watermarkText: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '600',
    color: palette.textMuted,
    opacity: 0.5,
  },
  textLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  textLinkLabel: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});

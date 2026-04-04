import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { PartyPopper, ShieldCheck, Share2 } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualCard, RitualScreen, SecondaryButton, StatPill, TitleBlock } from '@/components/vow-ui';
import { historyEntries, palette } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

export default function VowKeptScreen() {
  const { activeVowText, resetVow, vow } = useVowFlow();
  const keptCount = historyEntries.filter((e) => e.kept).length + 1;

  const medalScale = useRef(new Animated.Value(0.3)).current;
  const medalOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const confettiScale = useRef(new Animated.Value(0)).current;

  const isVowkeeper = vow.witnessName === 'Vowkeeper';
  const firstName = isVowkeeper ? 'You' : vow.witnessName.split(' ')[0];

  useEffect(() => {
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

    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 300);
    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = async () => {
    void Haptics.selectionAsync();
    if (Platform.OS !== 'web') {
      try {
        await Share.share({
          message: `I kept my Unbreakable Vow: "${activeVowText}" — $${vow.stake.amount} protected. 💪`,
        });
      } catch {
        console.log('[VowKept] share failed');
      }
    }
  };

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label="Make another vow"
            onPress={() => {
              resetVow();
              router.replace('/');
            }}
            testID="kept-new-vow"
          />
          <SecondaryButton label="View your record" onPress={() => router.push('/history')} testID="kept-history" />
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.medalWrap}>
        <Animated.View style={[styles.medalGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
        <Animated.View style={[styles.medal, { opacity: medalOpacity, transform: [{ scale: medalScale }] }]}>
          <ShieldCheck color={palette.success} size={32} />
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: contentFade }}>
        <TitleBlock
          title={isVowkeeper ? 'You nailed it.' : `${firstName} confirmed: vow kept.`}
          subtitle={`Your word held. ${vow.stake.amount} stays safe \u2014 you won\u2019t be charged.`}
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
            <Text style={styles.metaLabel}>Your stake</Text>
            <Text style={styles.metaValueSuccess}>Not charged</Text>
          </View>
        </RitualCard>
      </Animated.View>

      <Animated.View style={[styles.statsRow, { opacity: contentFade }]}>
        <StatPill value={`${keptCount}`} label="vows kept" tone="success" />
        <StatPill value="3 wk" label="streak" />
      </Animated.View>

      <Animated.View style={[styles.shareRow, { opacity: contentFade, transform: [{ scale: confettiScale }] }]}>
        <Pressable onPress={handleShare} style={styles.shareButton} testID="kept-share">
          <Share2 color={palette.goldBright} size={16} />
          <Text style={styles.shareText}>Share your win</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.celebrateRow, { opacity: contentFade }]}>
        <PartyPopper color={palette.goldBright} size={16} />
        <Text style={styles.celebrateText}>Keep the momentum going. Another vow, another week owned.</Text>
      </Animated.View>
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
    backgroundColor: 'rgba(82,214,154,0.18)',
  },
  medal: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.successMuted,
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.28)',
    shadowColor: '#52D69A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
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
  metaValueSuccess: {
    color: palette.success,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareRow: {
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(212,162,79,0.1)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  shareText: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  celebrateRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  celebrateText: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});

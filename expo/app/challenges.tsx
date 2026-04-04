import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { Lock, TrendingUp, Users } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, RitualScreen, TitleBlock } from '@/components/vow-ui';
import { palette, serifFont, upcomingChallenges } from '@/constants/unbreakable';

export default function ChallengesScreen() {
  const fadeValues = useRef(upcomingChallenges.map(() => new Animated.Value(0))).current;
  const slideValues = useRef(upcomingChallenges.map(() => new Animated.Value(20))).current;

  useEffect(() => {
    console.log('[ChallengesScreen] animating', upcomingChallenges.length, 'challenges');
    const animations = upcomingChallenges.map((_, i) =>
      Animated.parallel([
        Animated.timing(fadeValues[i], { toValue: 1, duration: 350, delay: i * 80, useNativeDriver: true }),
        Animated.timing(slideValues[i], { toValue: 0, duration: 350, delay: i * 80, useNativeDriver: true }),
      ])
    );
    Animated.stagger(60, animations).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RitualScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackButton />

      <View style={styles.headerSection}>
        <View style={styles.comingSoonBadge}>
          <Lock color={palette.goldBright} size={12} />
          <Text style={styles.comingSoonText}>COMING SOON</Text>
        </View>
        <TitleBlock
          title="Group Challenges"
          subtitle="Join hundreds of people putting money on the line for the same goal. One vow. One deadline. No excuses."
        />
      </View>

      {upcomingChallenges.map((challenge, index) => (
        <Animated.View
          key={challenge.id}
          style={{
            opacity: fadeValues[index],
            transform: [{ translateY: slideValues[index] }],
          }}
        >
          <Pressable
            style={styles.challengeCard}
            onPress={() => void Haptics.selectionAsync()}
            testID={`challenge-${challenge.id}`}
          >
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeEmoji}>{challenge.emoji}</Text>
              <View style={styles.challengeTitleWrap}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <View style={styles.lockBadge}>
                  <Lock color={palette.textMuted} size={10} />
                </View>
              </View>
            </View>
            <Text style={styles.challengeTagline}>{challenge.tagline}</Text>
            <View style={styles.challengeStats}>
              <View style={styles.statItem}>
                <Users color={palette.textMuted} size={13} />
                <Text style={styles.statText}>{challenge.participants.toLocaleString()} people in</Text>
              </View>
              <View style={styles.statDot} />
              <View style={styles.statItem}>
                <TrendingUp color={palette.goldBright} size={13} />
                <Text style={styles.statTextGold}>${challenge.totalStake.toLocaleString()} on the line</Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      ))}

      <View style={styles.bottomNote}>
        <Text style={styles.bottomNoteText}>
          Challenges launch soon. We'll notify you when they're live.
        </Text>
      </View>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    gap: 12,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(212,162,79,0.1)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  comingSoonText: {
    color: palette.goldBright,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  challengeCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    opacity: 0.7,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  challengeEmoji: {
    fontSize: 28,
  },
  challengeTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  challengeTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    letterSpacing: -0.3,
  },
  lockBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeTagline: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  challengeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statTextGold: {
    color: palette.goldBright,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 3,
    backgroundColor: palette.textMuted,
  },
  bottomNote: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomNoteText: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 19,
  },
});

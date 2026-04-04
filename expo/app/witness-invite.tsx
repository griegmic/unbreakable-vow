import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Check, Shield } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualCard, RitualScreen, SecondaryButton, TitleBlock } from '@/components/vow-ui';
import { getVowVerdictDate, palette, serifFont } from '@/constants/unbreakable';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

export default function WitnessInviteScreen() {
  const { displayName } = useAuth();
  const { activeVowText, vow } = useVowFlow();
  const [sworn, setSworn] = useState<boolean>(false);

  const makerName = displayName || 'Your friend';
  const dates = getVowVerdictDate(vow.rawInput);
  const brokenTarget =
    vow.stake.consequence === 'witness'
      ? 'you'
      : vow.stake.destination;

  console.log('[WitnessInviteScreen] rendering for witness:', vow.witnessName);

  const checkboxScale = useRef(new Animated.Value(1)).current;
  const swearGlow = useRef(new Animated.Value(0)).current;

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
    Animated.timing(swearGlow, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  };

  const swearBorderColor = swearGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.border, palette.borderStrong],
  });

  const swearBgOpacity = swearGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.06],
  });

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label="I accept — hold them to it"
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.push('/live');
            }}
            disabled={!sworn}
            testID="witness-invite-accept"
          />
          <SecondaryButton label="Decline" onPress={() => router.back()} testID="witness-invite-decline" />
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.badgeWrap}>
        <View style={styles.badge}>
          <Shield color={palette.goldBright} size={16} />
          <Text style={styles.badgeText}>YOU'VE BEEN CHOSEN AS A WITNESS</Text>
        </View>
      </View>

      <TitleBlock
        title={`${makerName} made a vow and named you as their witness.`}
        subtitle="They're putting real money on the line. Your one job: at the end of the week, decide if they kept their word."
      />

      <RitualCard>
        <Text style={styles.sectionLabel}>THE VOW</Text>
        <Text style={styles.vowText}>{activeVowText}</Text>
        <View style={styles.rule} />
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>At stake</Text>
          <Text style={styles.metaValueGold}>${vow.stake.amount}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>If broken</Text>
          <Text style={styles.metaValue}>${vow.stake.amount} goes to {brokenTarget}</Text>
        </View>
      </RitualCard>

      <RitualCard>
        <Text style={styles.whatTitle}>What happens when you accept</Text>
        <View style={styles.stepRow}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
          <Text style={styles.stepText}>You'll get an SMS when it's time to deliver your verdict.</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
          <Text style={styles.stepText}>You don't need to check in daily — just be aware of the vow during the week.</Text>
        </View>
        <View style={styles.stepRow}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
          <Text style={styles.stepText}>On {dates.endLabel}, you get a prompt: kept or broken. One tap. Their fate is in your hands.</Text>
        </View>
      </RitualCard>

      <Animated.View style={[styles.swearCard, { borderColor: swearBorderColor }]}>
        <Animated.View style={[styles.swearGlowBg, { opacity: swearBgOpacity }]} />
        <Pressable
          onPress={sworn ? handleUnswear : handleSwear}
          style={styles.swearRow}
          testID="witness-invite-swear"
        >
          <Animated.View style={[styles.checkbox, sworn && styles.checkboxChecked, { transform: [{ scale: checkboxScale }] }]}>
            {sworn ? <Check color="#0B0D11" size={14} strokeWidth={3} /> : null}
          </Animated.View>
          <View style={styles.swearCopy}>
            <Text style={styles.swearTitle}>I solemnly swear</Text>
            <Text style={styles.swearText}>
              to judge honestly, to hold them accountable, and to deliver a fair verdict.
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  badgeWrap: {
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(212,162,79,0.08)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  badgeText: {
    color: palette.goldBright,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  sectionLabel: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.1,
  },
  vowText: {
    color: palette.text,
    fontSize: 20,
    lineHeight: 30,
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
  metaValueGold: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  whatTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(212,162,79,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    color: palette.goldBright,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  stepText: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  swearCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    backgroundColor: palette.surface,
    overflow: 'hidden',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  swearGlowBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.goldBright,
  },
  swearRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
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
  swearCopy: {
    flex: 1,
    gap: 6,
  },
  swearTitle: {
    color: palette.goldBright,
    fontSize: 18,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    letterSpacing: -0.3,
  },
  swearText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
});

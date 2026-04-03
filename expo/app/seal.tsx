import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Camera, Check, Eye, Sparkles, Star } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, PrimaryButton, RitualCard, RitualScreen, SecondaryButton, TitleBlock } from '@/components/vow-ui';
import { palette, serifFont } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

export default function SealScreen() {
  const { activeVowText, vow, setProofMode } = useVowFlow();
  const [sworn, setSworn] = useState<boolean>(false);
  const [sealed, setSealed] = useState<boolean>(false);
  const [proofChoice, setProofChoice] = useState<'word' | 'screenshot'>('word');

  const glow = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const swearGlow = useRef(new Animated.Value(0)).current;
  const checkboxScale = useRef(new Animated.Value(1)).current;

  const isVowkeeper = vow.witnessName === 'Vowkeeper';

  const brokenLabel =
    vow.stake.consequence === 'witness'
      ? `${vow.witnessName} gets it`
      : `Donated to ${vow.stake.destination}`;

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

  const handleSeal = () => {
    if (!sworn) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (isVowkeeper) {
      setProofMode(proofChoice);
    }

    Animated.timing(glow, {
      toValue: 1,
      duration: 900,
      useNativeDriver: false,
    }).start(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSealed(true);

      Animated.spring(checkScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 8,
        bounciness: 14,
      }).start();

      setTimeout(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/sent');
      }, 700);
    });
  };

  const haloOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.55],
  });

  const ringBorderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.borderStrong, 'rgba(82,214,154,0.35)'],
  });

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
        sealed ? null : (
          <>
            <PrimaryButton label="Seal this vow" onPress={handleSeal} disabled={!sworn} testID="seal-primary" />
            <SecondaryButton label="Back" onPress={() => router.back()} testID="seal-back" />
          </>
        )
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      {!sealed ? <BackButton /> : null}
      <TitleBlock
        title={sealed ? 'Sealed.' : 'Your Unbreakable Vow'}
        subtitle={sealed ? 'No turning back. The terms are locked.' : 'Review everything below. Once sealed, the terms cannot be changed.'}
      />

      <View style={styles.sealCenter}>
        <Animated.View style={[styles.sealHalo, { opacity: haloOpacity }]} />
        <Animated.View style={[styles.sealRing, { borderColor: ringBorderColor }]}>
          {sealed ? (
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <Check color={palette.success} size={30} />
            </Animated.View>
          ) : (
            <Star color={palette.goldBright} fill={palette.goldBright} size={26} />
          )}
        </Animated.View>
      </View>

      <RitualCard>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>THE VOW</Text>
          <Sparkles color={palette.goldBright} size={14} />
        </View>
        <Text style={styles.summaryText}>{activeVowText}</Text>
        <View style={styles.rule} />
        <View style={styles.twoCol}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>WITNESS</Text>
            <Text style={styles.metaValue}>{vow.witnessName}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>AT STAKE</Text>
            <Text style={[styles.metaValue, styles.goldValue]}>${vow.stake.amount}</Text>
          </View>
        </View>
        <View style={styles.twoCol}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>DURATION</Text>
            <Text style={styles.metaValue}>7 days</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>IF BROKEN</Text>
            <Text style={styles.metaValue}>{brokenLabel}</Text>
          </View>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>VERDICT</Text>
          <Text style={styles.metaValue}>{vow.witnessName} decides on day 7</Text>
        </View>
      </RitualCard>

      {isVowkeeper && !sealed ? (
        <RitualCard>
          <Text style={styles.proofTitle}>How will you prove it?</Text>
          <Text style={styles.proofSub}>Since Vowkeeper is your witness, how do you want to verify?</Text>

          <Pressable
            onPress={() => { void Haptics.selectionAsync(); setProofChoice('word'); }}
            style={[styles.proofOption, proofChoice === 'word' && styles.proofOptionActive]}
            testID="proof-word"
          >
            <View style={styles.proofIconWrap}>
              <Eye color={proofChoice === 'word' ? palette.goldBright : palette.textSecondary} size={18} />
            </View>
            <View style={styles.proofCopy}>
              <Text style={[styles.proofLabel, proofChoice === 'word' && styles.proofLabelActive]}>My word is gold</Text>
              <Text style={styles.proofDesc}>You'll self-report honestly at the end</Text>
            </View>
            <View style={[styles.radioSmall, proofChoice === 'word' && styles.radioSmallActive]}>
              {proofChoice === 'word' ? <View style={styles.radioDotSmall} /> : null}
            </View>
          </Pressable>

          <Pressable
            onPress={() => { void Haptics.selectionAsync(); setProofChoice('screenshot'); }}
            style={[styles.proofOption, proofChoice === 'screenshot' && styles.proofOptionActive]}
            testID="proof-screenshot"
          >
            <View style={styles.proofIconWrap}>
              <Camera color={proofChoice === 'screenshot' ? palette.goldBright : palette.textSecondary} size={18} />
            </View>
            <View style={styles.proofCopy}>
              <Text style={[styles.proofLabel, proofChoice === 'screenshot' && styles.proofLabelActive]}>Screenshot proof</Text>
              <Text style={styles.proofDesc}>Vowkeeper will ask for photo evidence</Text>
            </View>
            <View style={[styles.radioSmall, proofChoice === 'screenshot' && styles.radioSmallActive]}>
              {proofChoice === 'screenshot' ? <View style={styles.radioDotSmall} /> : null}
            </View>
          </Pressable>
        </RitualCard>
      ) : null}

      {!sealed ? (
        <Animated.View style={[styles.swearCard, { borderColor: swearBorderColor }]}>
          <Animated.View style={[styles.swearGlowBg, { opacity: swearBgOpacity }]} />
          <Pressable
            onPress={sworn ? handleUnswear : handleSwear}
            style={styles.swearRow}
            testID="seal-swear"
          >
            <Animated.View style={[styles.checkbox, sworn && styles.checkboxChecked, { transform: [{ scale: checkboxScale }] }]}>
              {sworn ? <Check color="#0B0D11" size={14} strokeWidth={3} /> : null}
            </Animated.View>
            <View style={styles.swearCopy}>
              <Text style={styles.swearTitle}>I solemnly swear</Text>
              <Text style={styles.swearText}>
                to honor this vow, to be honest about my progress, and to accept the consequences if I fail.
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  sealCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 110,
  },
  sealHalo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 200,
    backgroundColor: palette.goldGlow,
  },
  sealRing: {
    width: 100,
    height: 100,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(212,162,79,0.06)',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.1,
  },
  summaryText: {
    color: palette.text,
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '600' as const,
  },
  rule: {
    height: 1,
    backgroundColor: palette.border,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  metaCell: {
    flex: 1,
    gap: 4,
  },
  metaLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  metaValue: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
  goldValue: {
    color: palette.goldBright,
    fontWeight: '800' as const,
  },
  proofTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  proofSub: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: -4,
  },
  proofOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: palette.surfaceElevated,
  },
  proofOptionActive: {
    borderColor: palette.borderStrong,
  },
  proofIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(212,162,79,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofCopy: {
    flex: 1,
    gap: 2,
  },
  proofLabel: {
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  proofLabelActive: {
    color: palette.text,
  },
  proofDesc: {
    color: palette.textMuted,
    fontSize: 12,
  },
  radioSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: palette.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSmallActive: {
    borderColor: palette.goldBright,
  },
  radioDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.goldBright,
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

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { uvColors, uvFonts, uvSpacing, uvRadius, uvDurations } from '../../lib/uv-tokens';
import { hapticPrimary } from '../../lib/haptics';

interface NeedCardProps {
  label: string;
  title: string;
  body: string;
  ctaLabel: string;
  onPress: () => void;
}

export function NeedCard({ label, title, body, ctaLabel, onPress }: NeedCardProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: uvDurations.pulseDot / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: uvDurations.pulseDot / 2,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const handleCTA = () => {
    hapticPrimary();
    onPress();
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable
        onPress={handleCTA}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

export default NeedCard;

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: uvColors.warn,
    borderLeftWidth: 3,
    borderRadius: uvRadius.lg,
    backgroundColor: uvColors.bgCard,
    padding: uvSpacing.base,
    gap: uvSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: uvSpacing.sm,
  },
  pulseDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: uvColors.warn,
    shadowColor: uvColors.warn,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  label: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    color: uvColors.warn,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: uvFonts.serifMedium,
    fontSize: 17,
    color: uvColors.text,
  },
  body: {
    fontFamily: uvFonts.sans,
    fontSize: 14,
    color: uvColors.textMuted,
    lineHeight: 20,
  },
  cta: {
    height: 44,
    borderRadius: uvRadius.md,
    backgroundColor: uvColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: uvSpacing.xs,
  },
  ctaPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  ctaText: {
    fontFamily: uvFonts.serifMedium,
    fontSize: 15,
    color: uvColors.textOnGold,
  },
});

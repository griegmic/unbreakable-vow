import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface StampProps {
  text: 'KEPT' | 'BROKEN' | 'VOIDED';
  tone?: 'gold' | 'muted-red' | 'muted-gray' | 'filled-gold';
  variant?: 'confirmed' | 'auto-resolved';
}

const TONE_MAP = {
  gold: { color: uvColors.gold, borderColor: uvColors.gold, bg: 'transparent' },
  'muted-red': { color: uvColors.danger, borderColor: uvColors.danger, bg: 'transparent' },
  'muted-gray': { color: uvColors.textDim, borderColor: uvColors.textDim, bg: 'transparent' },
  'filled-gold': { color: uvColors.textOnGold, borderColor: '#5C4514', bg: uvColors.goldBright },
} as const;

export function Stamp({ text, tone = 'gold', variant = 'confirmed' }: StampProps) {
  const t = TONE_MAP[tone];
  const isFilled = tone === 'filled-gold';

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.stamp,
          {
            backgroundColor: t.bg,
            borderColor: t.borderColor,
            borderWidth: isFilled ? 1.5 : 2,
            padding: isFilled ? 10 : 8,
            paddingHorizontal: isFilled ? 24 : 20,
          },
        ]}
      >
        <Text
          style={[
            styles.stampText,
            {
              color: t.color,
              fontSize: isFilled ? 28 : 22,
            },
          ]}
        >
          {text}
        </Text>
      </View>
      {variant === 'auto-resolved' && (
        <Text style={styles.sublabel}>AUTO-RESOLVED · 72H</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 4,
  },
  stamp: {
    borderRadius: 8,
    transform: [{ rotate: '-2.5deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampText: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '700',
    letterSpacing: 22 * 0.18,
  },
  sublabel: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 9 * 0.15,
    color: uvColors.textFaint,
    textTransform: 'uppercase',
  },
});

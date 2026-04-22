import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface EyebrowTagProps {
  children: string;
  tone?: 'gold' | 'imsg' | 'amber' | 'muted';
}

const TONE_MAP = {
  gold: { color: uvColors.gold, bg: uvColors.goldBg },
  imsg: { color: uvColors.imessage, bg: uvColors.successBg },
  amber: { color: uvColors.warn, bg: uvColors.warnBg },
  muted: { color: uvColors.textDim, bg: uvColors.bgElevated },
} as const;

export function EyebrowTag({ children, tone = 'gold' }: EyebrowTagProps) {
  const { color, bg } = TONE_MAP[tone];
  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  text: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 10 * 0.18,
    textTransform: 'uppercase',
  },
});

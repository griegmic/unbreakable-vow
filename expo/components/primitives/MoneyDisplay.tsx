import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface MoneyDisplayProps {
  amount: number;
  variant?: 'large' | 'compact';
}

export function MoneyDisplay({ amount, variant = 'large' }: MoneyDisplayProps) {
  const formatted = `$${amount}`;

  if (variant === 'compact') {
    return <Text style={styles.compact}>{formatted}</Text>;
  }

  return <Text style={styles.large}>{formatted}</Text>;
}

const styles = StyleSheet.create({
  large: {
    textAlign: 'center',
    fontFamily: uvFonts.serifSemibold,
    fontSize: 68,
    lineHeight: 76,
    color: uvColors.goldBright,
    marginTop: 2,
    marginBottom: 12,
  },
  compact: {
    textAlign: 'center',
    fontFamily: uvFonts.serif,
    fontSize: 49,
    color: uvColors.goldBright,
    textShadowColor: 'rgba(214, 168, 60, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
});

export default MoneyDisplay;

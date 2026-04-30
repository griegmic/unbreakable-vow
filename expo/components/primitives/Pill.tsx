import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '../../lib/uv-tokens';

type PillVariant = 'default' | 'live' | 'blue' | 'green' | 'orange';

interface PillProps {
  label: string;
  variant?: PillVariant;
  dot?: boolean;
}

const variantStyles: Record<PillVariant, { bg: string; text: string; dot: string }> = {
  default: { bg: uvColors.warnBg, text: uvColors.warn, dot: uvColors.warn },
  orange: { bg: uvColors.warnBg, text: uvColors.warn, dot: uvColors.warn },
  live: { bg: uvColors.successBg, text: uvColors.success, dot: uvColors.success },
  green: { bg: uvColors.successBg, text: uvColors.success, dot: uvColors.success },
  blue: { bg: uvColors.infoBg, text: uvColors.info, dot: uvColors.info },
};

export function Pill({ label, variant = 'default', dot }: PillProps) {
  const v = variantStyles[variant];

  return (
    <View style={[styles.pill, { backgroundColor: v.bg }]}>
      {dot && <View style={[styles.dot, { backgroundColor: v.dot }]} />}
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

export default Pill;

const styles = StyleSheet.create({
  pill: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 99,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

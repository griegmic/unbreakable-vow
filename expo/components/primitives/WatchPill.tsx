import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '../../lib/uv-tokens';

interface WatchPillProps {
  variant: 'watching' | 'pending' | 'none';
  label: string;
}

const dotColors: Record<WatchPillProps['variant'], string> = {
  watching: uvColors.success,
  pending: uvColors.warn,
  none: uvColors.textDim,
};

export function WatchPill({ variant, label }: WatchPillProps) {
  const isPending = variant === 'pending';

  return (
    <View
      style={[
        styles.pill,
        isPending && styles.pillPending,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dotColors[variant] }]} />
      <Text style={[styles.label, isPending && styles.labelPending]}>{label}</Text>
    </View>
  );
}

export default WatchPill;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: uvColors.bgCard,
  },
  pillPending: {
    borderColor: 'rgba(245, 154, 61, 0.35)',
    backgroundColor: uvColors.warnBg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: uvFonts.sans,
    fontSize: 12,
    color: uvColors.textMuted,
  },
  labelPending: {
    color: uvColors.warn,
  },
});

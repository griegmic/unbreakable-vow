import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts, uvSpacing, uvRadius } from '../../lib/uv-tokens';

interface TimelineProps {
  kicker?: string;
  children: React.ReactNode;
}

export function Timeline({ kicker = 'WHAT HAPPENS', children }: TimelineProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>{kicker}</Text>
      <View style={styles.box}>{children}</View>
    </View>
  );
}

export default Timeline;

const styles = StyleSheet.create({
  container: {
    gap: uvSpacing.sm,
  },
  kicker: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    color: uvColors.gold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  box: {
    borderWidth: 1,
    borderColor: uvColors.border,
    borderRadius: uvRadius.lg,
    backgroundColor: uvColors.bgCard,
    paddingHorizontal: uvSpacing.base,
    paddingVertical: uvSpacing.md,
  },
});

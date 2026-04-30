import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts, uvSpacing } from '../../lib/uv-tokens';

interface SectionHeadProps {
  title: string;
  count?: number;
}

export function SectionHead({ title, count }: SectionHeadProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        {count !== undefined && (
          <Text style={styles.count}>{count}</Text>
        )}
      </View>
      <View style={styles.border} />
    </View>
  );
}

export default SectionHead;

const styles = StyleSheet.create({
  container: {
    gap: uvSpacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: uvSpacing.sm,
  },
  title: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    color: uvColors.gold,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  count: {
    fontFamily: uvFonts.sans,
    fontSize: 12,
    color: uvColors.textMuted,
  },
  border: {
    height: 1,
    backgroundColor: uvColors.goldLine,
  },
});

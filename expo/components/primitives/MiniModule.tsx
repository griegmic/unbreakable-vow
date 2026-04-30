import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts, uvSpacing } from '../../lib/uv-tokens';

interface MiniModuleProps {
  value: number | string;
  label: string;
}

export function MiniModule({ value, label }: MiniModuleProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export default MiniModule;

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
    borderColor: uvColors.border,
    borderRadius: 17,
    padding: 13,
    backgroundColor: uvColors.bgCard,
    alignItems: 'center',
    gap: 2,
  },
  value: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 24,
    fontWeight: '700',
    color: uvColors.goldBright,
  },
  label: {
    fontFamily: uvFonts.sans,
    fontSize: 12,
    color: uvColors.textMuted,
  },
});

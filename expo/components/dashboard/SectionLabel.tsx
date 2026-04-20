import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { uvColors } from '@/lib/uv-tokens';

interface SectionLabelProps {
  label: string;
  count?: number;
}

export function SectionLabel({ label, count }: SectionLabelProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {count !== undefined && count > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: uvColors.textFaint,
  },
  countBadge: {
    backgroundColor: uvColors.bgSelected,
    borderRadius: 9999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 10,
    fontWeight: '500',
    color: uvColors.textDim,
  },
});

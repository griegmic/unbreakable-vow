import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { uvColors } from '@/lib/uv-tokens';

type BadgeVariant = 'active' | 'pending' | 'verdict' | 'kept' | 'broken' | 'voided';

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  active: { bg: uvColors.successBg, text: uvColors.success },
  pending: { bg: uvColors.warnBg, text: uvColors.warn },
  verdict: { bg: uvColors.infoBg, text: uvColors.info },
  kept: { bg: uvColors.successBg, text: uvColors.success },
  broken: { bg: 'rgba(248,113,113,0.14)', text: uvColors.danger },
  voided: { bg: 'rgba(90,86,80,0.20)', text: uvColors.textDim },
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
}

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  const colors = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

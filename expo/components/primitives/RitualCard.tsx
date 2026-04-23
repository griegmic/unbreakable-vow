import React from 'react';
import { View, StyleSheet } from 'react-native';
import { uvColors } from '@/lib/uv-tokens';

interface RitualCardProps {
  children: React.ReactNode;
  compact?: boolean;
  pulseColor?: 'gold' | 'amber';
}

export function RitualCard({ children, compact = false, pulseColor }: RitualCardProps) {
  return (
    <View
      style={[
        styles.card,
        compact && styles.compact,
        pulseColor === 'gold' && styles.pulseGold,
        pulseColor === 'amber' && styles.pulseAmber,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: uvColors.bgCard,
    borderWidth: 1,
    borderColor: uvColors.border,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  compact: {
    padding: 14,
    gap: 8,
  },
  pulseGold: {
    shadowColor: uvColors.gold,
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  pulseAmber: {
    shadowColor: uvColors.warn,
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
});

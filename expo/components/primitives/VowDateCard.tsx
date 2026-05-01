import React from 'react';
import { View, StyleSheet } from 'react-native';
import { uvColors } from '@/lib/uv-tokens';

interface VowDateCardProps {
  children: React.ReactNode;
}

export function VowDateCard({ children }: VowDateCardProps) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244,234,216,0.08)',
    paddingTop: 12,
    gap: 9,
  },
});

export default VowDateCard;

import React from 'react';
import { View, StyleSheet } from 'react-native';

interface QvCardProps {
  children: React.ReactNode;
}

export function QvCard({ children }: QvCardProps) {
  return <View style={styles.card}>{children}</View>;
}

export default QvCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(24,21,18,.82)',
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,.1)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 44,
    elevation: 6,
  },
});

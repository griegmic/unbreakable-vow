import React from 'react';
import { View, StyleSheet } from 'react-native';

interface TrustCardProps {
  children: React.ReactNode;
}

export function TrustCard({ children }: TrustCardProps) {
  return <View style={styles.card}>{children}</View>;
}

export default TrustCard;

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(244, 234, 216, 0.1)',
    borderRadius: 18,
    backgroundColor: 'rgba(244, 234, 216, 0.03)',
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
});

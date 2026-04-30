import React from 'react';
import { View, StyleSheet } from 'react-native';


interface QvReceiptProps {
  children: React.ReactNode;
}

export function QvReceipt({ children }: QvReceiptProps) {
  return <View style={styles.container}>{children}</View>;
}

export default QvReceipt;

const styles = StyleSheet.create({
  container: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

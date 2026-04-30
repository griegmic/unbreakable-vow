import React from 'react';
import { View, StyleSheet } from 'react-native';
import { uvColors, uvSpacing, uvRadius } from '../../lib/uv-tokens';

interface MenuPanelProps {
  children: React.ReactNode;
}

export function MenuPanel({ children }: MenuPanelProps) {
  return <View style={styles.panel}>{children}</View>;
}

export default MenuPanel;

const styles = StyleSheet.create({
  panel: {
    borderRadius: 24,
    backgroundColor: uvColors.bgCard,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts, uvSpacing } from '../../lib/uv-tokens';

interface MenuSectionProps {
  title: string;
  children?: React.ReactNode;
}

export function MenuSection({ title, children }: MenuSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default MenuSection;

const styles = StyleSheet.create({
  section: {
    // No extra wrapper needed; section acts as a grouping element
  },
  headerRow: {
    borderTopWidth: 1,
    borderTopColor: uvColors.border,
    paddingHorizontal: uvSpacing.base,
    paddingTop: uvSpacing.base,
    paddingBottom: uvSpacing.xs,
  },
  title: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 10,
    color: uvColors.textDim,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

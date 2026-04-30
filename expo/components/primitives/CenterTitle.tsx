import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface CenterTitleProps {
  children: React.ReactNode;
}

export function CenterTitle({ children }: CenterTitleProps) {
  return <Text style={styles.title}>{children}</Text>;
}

/** Styled span for green emphasis within CenterTitle */
export function CenterTitleGreen({ children }: { children: React.ReactNode }) {
  return <Text style={styles.green}>{children}</Text>;
}

/** Styled span for gold emphasis within CenterTitle */
export function CenterTitleGold({ children }: { children: React.ReactNode }) {
  return <Text style={styles.gold}>{children}</Text>;
}

export default CenterTitle;

const styles = StyleSheet.create({
  title: {
    fontFamily: uvFonts.serifMedium,
    fontSize: 40,
    fontWeight: '500',
    lineHeight: 42, // ~1.04 ratio
    color: uvColors.text,
    textAlign: 'center',
  },
  green: {
    color: uvColors.success,
  },
  gold: {
    color: uvColors.gold,
  },
});

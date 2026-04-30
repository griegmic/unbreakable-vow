import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts, uvRadius } from '../../lib/uv-tokens';

interface ActiveCardProps {
  kicker?: string;
  vowText?: string;
  children?: React.ReactNode;
}

export function ActiveCard({ kicker, vowText, children }: ActiveCardProps) {
  return (
    <View style={styles.card}>
      {kicker && <Text style={styles.kicker}>{kicker}</Text>}
      {vowText && <Text style={styles.vowText}>{vowText}</Text>}
      {children}
    </View>
  );
}

export default ActiveCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: uvRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(214,168,60,.34)',
    backgroundColor: 'rgba(27,22,15,.82)',
    padding: 16,
    gap: 8,
  },
  kicker: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    fontWeight: '700',
    color: uvColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  vowText: {
    fontFamily: uvFonts.serifItalic,
    fontSize: 17,
    fontStyle: 'italic',
    color: uvColors.text,
    lineHeight: 24,
  },
});

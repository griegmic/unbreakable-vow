import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface FrauncesSubProps {
  children: React.ReactNode;
  dim?: boolean;
}

export function FrauncesSub({ children, dim = false }: FrauncesSubProps) {
  return (
    <Text style={[styles.base, { color: dim ? uvColors.textDim : uvColors.textMuted }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: uvFonts.serifItalic,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 17 * 1.45,
  },
});

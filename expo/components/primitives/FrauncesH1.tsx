import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface FrauncesH1Props {
  children: string;
  italic?: boolean;
  size?: 'lg' | 'xl';
}

export function FrauncesH1({ children, italic = false, size = 'xl' }: FrauncesH1Props) {
  const fontSize = size === 'xl' ? 52 : 34;
  const letterSpacing = size === 'xl' ? -52 * 0.035 : -34 * 0.025;

  return (
    <Text
      style={[
        styles.base,
        {
          fontFamily: italic ? uvFonts.serifItalic : uvFonts.serifMedium,
          fontSize,
          letterSpacing,
        },
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: '500',
    lineHeight: undefined, // Let RN auto-calculate; we set lineHeightMultiplier via fontSize
    color: uvColors.text,
  },
});

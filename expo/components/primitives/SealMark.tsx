import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface SealMarkProps {
  variant: 'round' | 'square' | 'kept';
  glyph?: string;
  size?: number;
}

export function SealMark({ variant, glyph, size }: SealMarkProps) {
  const isRound = variant === 'round';
  const isKept = variant === 'kept';

  const markSize = size ?? (isRound ? 82 : 94);
  const borderRadius = isRound ? markSize / 2 : 26;

  const gradientColors: readonly [string, string, ...string[]] = isKept
    ? ['#63e1a5', '#25ad6a']
    : [uvColors.goldBright, uvColors.gold, uvColors.goldDeep];

  const shadowColor = isKept ? '#25ad6a' : uvColors.gold;
  const shadowRadius = isRound ? 20 : 28;

  const displayGlyph = glyph ?? (isKept ? '\u2713' : undefined);

  return (
    <View
      style={[
        styles.halo,
        {
          width: markSize,
          height: markSize,
          borderRadius,
          shadowColor,
          shadowRadius,
        },
      ]}
    >
      <LinearGradient
        colors={[...gradientColors]}
        style={[
          styles.mark,
          {
            width: markSize,
            height: markSize,
            borderRadius,
          },
        ]}
      >
        {displayGlyph && (
          <Text
            style={[
              styles.glyph,
              {
                color: isKept ? uvColors.textOnGold : uvColors.textOnGold,
                fontSize: markSize * 0.4,
              },
            ]}
          >
            {displayGlyph}
          </Text>
        )}
      </LinearGradient>
    </View>
  );
}

export default SealMark;

const styles = StyleSheet.create({
  halo: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    overflow: 'visible',
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glyph: {
    fontFamily: uvFonts.serifMedium,
    fontWeight: '500',
  },
});

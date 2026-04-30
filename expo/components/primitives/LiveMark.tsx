import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface LiveMarkProps {
  size?: number;
  glyph?: string;
}

export function LiveMark({ size = 82, glyph }: LiveMarkProps) {
  const radius = size / 2;

  return (
    <View
      style={[
        styles.halo,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
      ]}
    >
      <LinearGradient
        colors={['#63e1a5', '#25ad6a']}
        style={[
          styles.mark,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
        ]}
      >
        {glyph && (
          <Text
            style={[
              styles.glyph,
              { fontSize: size * 0.4 },
            ]}
          >
            {glyph}
          </Text>
        )}
      </LinearGradient>
    </View>
  );
}

export default LiveMark;

const styles = StyleSheet.create({
  halo: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25ad6a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
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
    color: uvColors.textOnGold,
  },
});

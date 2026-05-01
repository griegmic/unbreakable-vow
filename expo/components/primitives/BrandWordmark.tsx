import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface BrandWordmarkProps {
  variant: 'tinybrand' | 'qvBrand';
}

export function BrandWordmark({ variant }: BrandWordmarkProps) {
  if (variant === 'tinybrand') {
    return (
      <Text style={styles.tinybrand}>UNBREAKABLE VOW</Text>
    );
  }

  return (
    <View style={styles.qvRow}>
      <View style={styles.qvMark}>
        <View style={styles.qvDot} />
      </View>
      <Text style={styles.qvText}>
        Unbreakable{' '}
        <Text style={styles.qvVow}>Vow</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // tinybrand
  tinybrand: {
    fontFamily: uvFonts.sansSemibold,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 10 * 0.34,
    fontSize: 10,
    fontWeight: '800',
    color: uvColors.textDim,
  },

  // qvBrand
  qvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qvMark: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: uvColors.gold,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  qvDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: uvColors.gold,
  },
  qvText: {
    fontFamily: uvFonts.serifItalic,
    fontSize: 18,
    color: uvColors.text,
  },
  qvVow: {
    color: uvColors.gold,
  },
});

export default BrandWordmark;

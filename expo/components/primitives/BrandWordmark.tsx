import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface BrandWordmarkProps {
  variant: 'tinybrand' | 'qvBrand';
}

export function BrandWordmark({ variant }: BrandWordmarkProps) {
  if (variant === 'tinybrand') {
    return (
      <View style={styles.tinybrandRow}>
        <View style={styles.tinyMark}>
          <View style={styles.tinyDot} />
        </View>
        <Text style={styles.tinybrand}>UNBREAKABLE VOW</Text>
      </View>
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
  tinybrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  tinyMark: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: uvColors.gold,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tinyDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: uvColors.gold,
  },
  tinybrand: {
    fontFamily: uvFonts.sansSemibold,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 11 * 0.28,
    fontSize: 11,
    fontWeight: '800',
    color: uvColors.textMuted,
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

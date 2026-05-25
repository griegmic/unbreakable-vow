import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSelection } from '@/lib/haptics';

interface StakeTileProps {
  amount: number;
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function StakeTile({ label, selected, onPress }: StakeTileProps) {
  const handlePress = () => {
    hapticSelection();
    onPress();
  };

  if (selected) {
    return (
      <Pressable onPress={handlePress} style={styles.tileOuter}>
        <LinearGradient
          colors={['rgba(214,168,60,0.25)', 'rgba(168,122,34,0.18)']}
          style={styles.tileSelected}
        >
          <Text style={[styles.label, styles.labelSelected]}>
            {label}
          </Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress} style={styles.tile}>
      <Text style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    height: 58,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.16)',
    backgroundColor: 'rgba(244,234,216,0.018)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOuter: {
    flex: 1,
    height: 58,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: uvColors.gold,
    // box-shadow: 0 0 0 1px rgba(237,196,101,.08) approximated
    shadowColor: 'rgba(237,196,101,1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  tileSelected: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  label: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 19,
    fontWeight: '800',
    color: '#b7ad9b',
  },
  labelSelected: {
    color: uvColors.goldBright,
  },
});

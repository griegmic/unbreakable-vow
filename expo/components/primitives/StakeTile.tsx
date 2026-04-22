import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSelection } from '@/lib/haptics';

interface StakeTileProps {
  amount: number;
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function StakeTile({ amount, label, selected, onPress }: StakeTileProps) {
  const handlePress = () => {
    hapticSelection();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.tile,
        selected && styles.selected,
      ]}
    >
      <Text style={[styles.amount, selected && styles.amountSelected]}>
        ${amount}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 80,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: uvColors.bgCard,
    alignItems: 'center',
    gap: 4,
  },
  selected: {
    borderWidth: 1.5,
    borderColor: uvColors.gold,
    backgroundColor: uvColors.goldBg,
  },
  amount: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 20,
    fontWeight: '600',
    color: uvColors.text,
  },
  amountSelected: {
    color: uvColors.goldBright,
  },
  label: {
    fontFamily: uvFonts.sans,
    fontSize: 11,
    color: uvColors.textDim,
  },
});

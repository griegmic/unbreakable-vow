import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSelection } from '@/lib/haptics';

interface DestinationChipProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
}

export function DestinationChip({ label, selected, onSelect }: DestinationChipProps) {
  const handlePress = () => {
    hapticSelection();
    onSelect();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: uvColors.bgCard,
  },
  chipSelected: {
    borderColor: uvColors.gold,
    backgroundColor: 'rgba(214,168,60,0.12)',
  },
  label: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 14,
    fontWeight: '500',
    color: uvColors.textMuted,
  },
  labelSelected: {
    color: uvColors.goldBright,
  },
});

export default DestinationChip;

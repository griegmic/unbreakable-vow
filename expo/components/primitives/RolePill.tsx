import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { uvColors, uvFonts, uvSpacing } from '../../lib/uv-tokens';
import { hapticSelection } from '../../lib/haptics';

interface RolePillProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  showDot?: boolean;
}

export function RolePill({ label, selected, onSelect, showDot = false }: RolePillProps) {
  const handlePress = () => {
    hapticSelection();
    onSelect();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.pill,
        selected && styles.pillSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      {showDot && <View style={styles.dot} />}
    </Pressable>
  );
}

export default RolePill;

const styles = StyleSheet.create({
  pill: {
    height: 34,
    paddingHorizontal: uvSpacing.base,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: uvColors.bgCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: uvSpacing.xs,
  },
  pillSelected: {
    borderColor: uvColors.borderGold,
    backgroundColor: uvColors.goldSoft,
  },
  label: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 13,
    color: uvColors.textMuted,
  },
  labelSelected: {
    color: uvColors.goldBright,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: uvColors.warn,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});

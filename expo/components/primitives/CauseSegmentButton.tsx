import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { hapticSelection } from '@/lib/haptics';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface CauseSegmentButtonProps {
  label: string;
  selected: boolean;
  tone?: 'good' | 'hate';
  onPress: () => void;
}

export function CauseSegmentButton({
  label,
  selected,
  tone = 'good',
  onPress,
}: CauseSegmentButtonProps) {
  const isHate = tone === 'hate';

  const handlePress = () => {
    hapticSelection();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        selected && styles.selected,
        selected && isHate && styles.selectedHate,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          selected && styles.labelSelected,
          selected && isHate && styles.labelHateSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default CauseSegmentButton;

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: 'rgba(244,234,216,0.035)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  selected: {
    borderColor: uvColors.gold,
    backgroundColor: 'rgba(214,168,60,0.12)',
  },
  selectedHate: {
    borderColor: uvColors.warn,
    backgroundColor: 'rgba(245,154,61,0.12)',
  },
  label: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 14 * 1.15,
    color: uvColors.textMuted,
    textAlign: 'center',
  },
  labelSelected: {
    color: uvColors.goldBright,
  },
  labelHateSelected: {
    color: uvColors.warn,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
});

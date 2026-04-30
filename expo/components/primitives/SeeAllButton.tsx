import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '../../lib/uv-tokens';
import { hapticPrimary } from '../../lib/haptics';

interface SeeAllButtonProps {
  label: string;
  onPress: () => void;
}

export function SeeAllButton({ label, onPress }: SeeAllButtonProps) {
  const handlePress = () => {
    hapticPrimary();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

export default SeeAllButton;

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
    backgroundColor: uvColors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    fontWeight: '700',
    color: uvColors.goldBright,
  },
});

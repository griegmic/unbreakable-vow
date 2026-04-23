import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSecondary } from '@/lib/haptics';

interface OutlinedGoldCTAProps {
  label: string;
  onPress: () => void;
}

export function OutlinedGoldCTA({ label, onPress }: OutlinedGoldCTAProps) {
  const handlePress = () => {
    hapticSecondary();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: uvColors.gold,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: uvFonts.serifMedium,
    fontSize: 16,
    fontWeight: '500',
    color: uvColors.gold,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: uvColors.goldBg,
  },
});

import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticPrimary } from '@/lib/haptics';

interface GoldCTAProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'filled-gold' | 'filled-imsg-green';
}

export function GoldCTA({ label, onPress, disabled = false, variant = 'filled-gold' }: GoldCTAProps) {
  const isGreen = variant === 'filled-imsg-green';
  const colors = isGreen
    ? [uvColors.imessage, uvColors.imessageDeep] as const
    : [uvColors.goldBright, uvColors.gold, uvColors.goldDeep] as const;
  const textColor = isGreen ? '#FFFFFF' : uvColors.textOnGold;

  const handlePress = () => {
    if (!disabled) {
      hapticPrimary();
      onPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={disabled ? [uvColors.bgElevated, uvColors.bgElevated] : [...colors]}
        style={styles.gradient}
      >
        <Text style={[styles.label, { color: disabled ? uvColors.textDim : textColor }]}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 62,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: uvColors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: uvFonts.serifMedium,
    fontSize: 17,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});

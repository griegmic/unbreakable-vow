import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
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
    : ['#f1cf7a', '#c2912d'] as const;
  const textColor = isGreen ? '#FFFFFF' : '#151006';

  const handlePress = () => {
    if (!disabled) {
      hapticPrimary();
      onPress();
    }
  };

  if (disabled) {
    return (
      <View style={[styles.button, styles.disabled]}>
        <View style={[styles.gradient, styles.disabledBg]}>
          <Text style={[styles.label, styles.disabledLabel]}>{label}</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        styles.enabled,
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={[...colors]}
        style={styles.gradient}
      >
        <Text style={[styles.label, { color: textColor }]}>
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
    borderRadius: 24,
    overflow: 'hidden',
  },
  enabled: {
    shadowColor: 'rgba(201,148,42,1)',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 46,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 20,
    fontWeight: '800',
  },
  disabled: {
    shadowOpacity: 0,
  },
  disabledBg: {
    backgroundColor: 'rgba(244,234,216,0.06)',
  },
  disabledLabel: {
    color: uvColors.textDim,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});

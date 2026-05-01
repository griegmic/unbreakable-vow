import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSecondary } from '@/lib/haptics';

interface QuietPillProps {
  label: string;
  onPress: () => void;
}

/**
 * Quiet pill button — small, pill-shaped, subtle border.
 * Used for secondary/tertiary actions like "Share link" / "Decide later".
 * Mock class: .quietBtn
 */
export function QuietPill({ label, onPress }: QuietPillProps) {
  return (
    <Pressable
      onPress={() => {
        hapticSecondary();
        onPress();
      }}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 44,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.13)',
    backgroundColor: 'rgba(244,234,216,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    fontWeight: '700',
    color: uvColors.textQuiet,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
});

export default QuietPill;

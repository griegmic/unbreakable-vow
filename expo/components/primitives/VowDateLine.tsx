import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { uvColors } from '@/lib/uv-tokens';
import { hapticSecondary } from '@/lib/haptics';

interface VowDateLineProps {
  label: string;
  value: string;
  tappable?: boolean;
  onTap?: () => void;
  editLabel?: string;
}

export function VowDateLine({
  label,
  value,
  tappable = false,
  onTap,
  editLabel,
}: VowDateLineProps) {
  const content = (
    <View style={[styles.row, tappable && styles.tappableRow]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      {editLabel && (
        <Text style={styles.editLink}>{editLabel}</Text>
      )}
    </View>
  );

  if (tappable && onTap) {
    return (
      <Pressable
        onPress={() => {
          hapticSecondary();
          onTap();
        }}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  tappableRow: {
    backgroundColor: uvColors.goldSoft,
    borderRadius: 8,
  },
  label: {
    width: 82,
    fontSize: 13,
    fontWeight: '600',
    color: uvColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    flex: 1,
    fontSize: 15,
    color: uvColors.text,
  },
  editLink: {
    fontSize: 13,
    fontWeight: '600',
    color: uvColors.goldBright,
  },
  pressed: {
    opacity: 0.8,
  },
});

export default VowDateLine;

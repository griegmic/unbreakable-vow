import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
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
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tappableRow: {
    minHeight: 44,
    backgroundColor: 'rgba(214,168,60,0.035)',
    borderRadius: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  label: {
    width: 82,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    lineHeight: 14 * 1.2,
    fontWeight: '600',
    color: uvColors.textMuted,
  },
  value: {
    flex: 1,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    lineHeight: 15 * 1.2,
    fontWeight: '800',
    color: '#d5cbb8',
    textAlign: 'left',
  },
  editLink: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    fontWeight: '800',
    color: uvColors.goldBright,
    opacity: 0.84,
  },
  pressed: {
    opacity: 0.8,
  },
});

export default VowDateLine;

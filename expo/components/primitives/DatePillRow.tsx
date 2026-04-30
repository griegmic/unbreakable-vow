import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSelection } from '@/lib/haptics';

interface DateOption {
  label: string;
  value: string;
}

interface DatePillRowProps {
  options: DateOption[];
  selected: string | null;
  onSelect: (value: string) => void;
  onPickDate?: () => void;
}

export function DatePillRow({
  options,
  selected,
  onSelect,
  onPickDate,
}: DatePillRowProps) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              hapticSelection();
              onSelect(opt.value);
            }}
            style={[styles.pill, isSelected && styles.pillSelected]}
          >
            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
      {onPickDate && (
        <Pressable
          onPress={() => {
            hapticSelection();
            onPickDate();
          }}
          style={[
            styles.pill,
            selected && !options.some((o) => o.value === selected) && styles.pillSelected,
          ]}
        >
          <Text
            style={[
              styles.pillText,
              selected && !options.some((o) => o.value === selected) && styles.pillTextSelected,
            ]}
          >
            Pick date
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: uvColors.bgCard,
  },
  pillSelected: {
    borderColor: uvColors.gold,
    backgroundColor: 'rgba(214,168,60,0.12)',
  },
  pillText: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 14,
    fontWeight: '500',
    color: uvColors.textMuted,
  },
  pillTextSelected: {
    color: uvColors.goldBright,
  },
});

export default DatePillRow;

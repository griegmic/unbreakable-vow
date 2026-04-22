import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface StreakGridProps {
  total: number;
  completed: number[];
  today: number;
}

export function StreakGrid({ total, completed, today }: StreakGridProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => {
        const day = i + 1;
        const isDone = completed.includes(day);
        const isToday = day === today;
        const isFuture = day > today;

        return (
          <View
            key={day}
            style={[
              styles.circle,
              isDone && styles.done,
              isToday && !isDone && styles.today,
              isFuture && styles.future,
            ]}
          >
            <Text
              style={[
                styles.text,
                isDone && styles.textDone,
                isToday && !isDone && styles.textToday,
              ]}
            >
              {isDone ? '✓' : day}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: uvColors.border,
  },
  done: {
    borderWidth: 2,
    borderColor: uvColors.success,
    backgroundColor: uvColors.successBg,
  },
  today: {
    borderWidth: 2,
    borderColor: uvColors.gold,
    backgroundColor: uvColors.goldBg,
  },
  future: {
    opacity: 0.35,
  },
  text: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    fontWeight: '600',
    color: uvColors.textFaint,
  },
  textDone: {
    color: uvColors.success,
  },
  textToday: {
    color: uvColors.gold,
  },
});

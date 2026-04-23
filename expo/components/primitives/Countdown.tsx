import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface CountdownProps {
  endsAt: Date;
  onElapsed?: () => void;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function calcRemaining(endsAt: Date) {
  const diff = Math.max(0, endsAt.getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, elapsed: diff === 0 };
}

export function Countdown({ endsAt, onElapsed }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => calcRemaining(endsAt));

  const tick = useCallback(() => {
    const r = calcRemaining(endsAt);
    setRemaining(r);
    if (r.elapsed) onElapsed?.();
    return r.elapsed;
  }, [endsAt, onElapsed]);

  useEffect(() => {
    const id = setInterval(() => {
      if (tick()) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const cells = [
    { value: remaining.days, label: 'D' },
    { value: remaining.hours, label: 'H' },
    { value: remaining.minutes, label: 'M' },
    { value: remaining.seconds, label: 'S' },
  ];

  return (
    <View style={styles.row}>
      {cells.map(({ value, label }) => (
        <View key={label} style={styles.cell}>
          <Text style={styles.value}>{pad(value)}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    minWidth: 48,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: uvColors.bgCard,
    borderWidth: 1,
    borderColor: uvColors.border,
    alignItems: 'center',
  },
  value: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 24,
    fontWeight: '500',
    color: uvColors.text,
    lineHeight: 24,
  },
  label: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 9 * 0.18,
    color: uvColors.textFaint,
    marginTop: 4,
  },
});

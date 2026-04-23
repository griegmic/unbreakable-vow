import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface TimestampPillProps {
  timestamp: Date;
  format?: 'time' | 'datetime';
}

export function TimestampPill({ timestamp, format = 'time' }: TimestampPillProps) {
  const text = format === 'datetime'
    ? timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <Text style={styles.pill}>{text}</Text>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: uvColors.bgElevated,
    fontFamily: uvFonts.sans,
    fontSize: 11,
    color: uvColors.textDim,
    overflow: 'hidden',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface VowDocCardProps {
  vow: string;
  stake: number;
  destination: string;
  verdictDate: Date;
  compact?: boolean;
}

export function VowDocCard({ vow, stake, destination, verdictDate, compact = false }: VowDocCardProps) {
  const dateStr = verdictDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const metaParts: string[] = [];
  if (stake > 0) metaParts.push(`$${stake} on the line`);
  if (destination) metaParts.push(`If broken → ${destination}`);
  metaParts.push(`Verdict ${dateStr}`);

  return (
    <View style={[styles.card, compact && styles.compact]}>
      <Text style={[styles.vow, compact && styles.vowCompact]}>{vow}</Text>
      <Text style={styles.meta}>{metaParts.join(' · ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: uvColors.bgCard,
    borderWidth: 1,
    borderColor: uvColors.border,
    gap: 14,
  },
  compact: {
    padding: 14,
    gap: 8,
  },
  vow: {
    fontFamily: uvFonts.serifItalic,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 17 * 1.45,
    color: uvColors.text,
  },
  vowCompact: {
    fontSize: 15,
  },
  meta: {
    fontFamily: uvFonts.sans,
    fontSize: 12,
    color: uvColors.textDim,
  },
});

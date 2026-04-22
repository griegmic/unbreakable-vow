import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface DeliveredPillProps {
  timestamp: Date;
}

export function DeliveredPill({ timestamp }: DeliveredPillProps) {
  const time = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.pill}>
      <Text style={styles.delivered}>DELIVERED</Text>
      <Text style={styles.time}>· {time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: uvColors.bgCard,
    borderWidth: 1,
    borderColor: uvColors.border,
  },
  delivered: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 11 * 0.12,
    color: uvColors.imessage,
    textTransform: 'uppercase',
  },
  time: {
    fontFamily: uvFonts.sans,
    fontSize: 11,
    color: uvColors.textDim,
  },
});

import React from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { uvColors, uvRadius } from '@/lib/uv-tokens';
import { StatusBadge } from './StatusBadge';

interface VowCardUVProps {
  vowText: string;
  status: 'active' | 'pending' | 'verdict' | 'kept' | 'broken' | 'voided';
  statusLabel: string;
  meta?: string;
  stakeAmount?: number;
  witnessName?: string;
  onPress?: () => void;
}

export function VowCardUV({
  vowText,
  status,
  statusLabel,
  meta,
  stakeAmount,
  witnessName,
  onPress,
}: VowCardUVProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.topRow}>
        <StatusBadge variant={status} label={statusLabel} />
        {meta && <Text style={styles.meta}>{meta}</Text>}
      </View>
      <Text style={styles.vowText} numberOfLines={2}>
        {vowText}
      </Text>
      <View style={styles.bottomRow}>
        {witnessName && (
          <Text style={styles.witnessText}>
            {witnessName} is judging
          </Text>
        )}
        {stakeAmount !== undefined && stakeAmount > 0 && (
          <Text style={styles.stakeText}>${stakeAmount}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: uvColors.bgCard,
    borderWidth: 1,
    borderColor: uvColors.borderStrong,
    borderRadius: uvRadius['2xl'],
    padding: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  cardPressed: {
    transform: [{ translateY: -1 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meta: {
    fontSize: 11,
    fontWeight: '500',
    color: uvColors.textDim,
  },
  vowText: {
    fontSize: 22,
    fontStyle: 'italic',
    color: uvColors.text,
    lineHeight: 28,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  witnessText: {
    fontSize: 13,
    color: uvColors.textDim,
  },
  stakeText: {
    fontSize: 13,
    fontWeight: '500',
    color: uvColors.gold,
  },
});

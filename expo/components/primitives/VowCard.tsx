import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts, uvSpacing, uvRadius } from '../../lib/uv-tokens';
import { hapticSecondary } from '../../lib/haptics';
import { WatchPill } from './WatchPill';

interface VowCardProps {
  vowText: string;
  status: string;
  stake?: number;
  witnessName?: string;
  timeLabel?: string;
  variant?: 'default' | 'pending' | 'blue';
  onPress?: () => void;
  watchStatus?: 'watching' | 'pending' | 'none';
}

const borderColors: Record<NonNullable<VowCardProps['variant']>, string> = {
  default: uvColors.gold,
  pending: uvColors.warn,
  blue: uvColors.info,
};

const statusPillBg: Record<NonNullable<VowCardProps['variant']>, string> = {
  default: uvColors.goldSoft,
  pending: uvColors.warnBg,
  blue: uvColors.infoBg,
};

const statusPillText: Record<NonNullable<VowCardProps['variant']>, string> = {
  default: uvColors.goldBright,
  pending: uvColors.warn,
  blue: uvColors.info,
};

export function VowCard({
  vowText,
  status,
  stake,
  witnessName,
  timeLabel,
  variant = 'default',
  onPress,
  watchStatus,
}: VowCardProps) {
  const handlePress = () => {
    if (onPress) {
      hapticSecondary();
      onPress();
    }
  };

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: borderColors[variant] },
        pressed && onPress && styles.pressed,
      ]}
    >
      {/* Top row: status pill + time */}
      <View style={styles.topRow}>
        <View style={[styles.statusPill, { backgroundColor: statusPillBg[variant] }]}>
          <Text style={[styles.statusText, { color: statusPillText[variant] }]}>
            {status}
          </Text>
        </View>
        {timeLabel && <Text style={styles.timeLabel}>{timeLabel}</Text>}
      </View>

      {/* Vow text */}
      <Text style={styles.vowText} numberOfLines={3}>
        {vowText}
      </Text>

      {/* Meta row */}
      <View style={styles.metaRow}>
        {stake !== undefined && stake > 0 && (
          <Text style={styles.metaText}>${stake}</Text>
        )}
        {witnessName && (
          <Text style={styles.metaText}>
            {stake !== undefined && stake > 0 ? ' \u00B7 ' : ''}
            {witnessName}
          </Text>
        )}
        <View style={styles.metaSpacer} />
        {watchStatus && watchStatus !== 'none' && (
          <WatchPill
            variant={watchStatus}
            label={watchStatus === 'watching' ? 'Watching' : 'Pending'}
          />
        )}
      </View>
    </Pressable>
  );
}

export default VowCard;

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: uvColors.border,
    borderLeftWidth: 3,
    borderRadius: uvRadius.lg,
    backgroundColor: uvColors.bgCard,
    padding: uvSpacing.base,
    gap: uvSpacing.md,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeLabel: {
    fontFamily: uvFonts.sans,
    fontSize: 12,
    color: uvColors.textDim,
  },
  vowText: {
    fontFamily: uvFonts.serifItalic,
    fontSize: 16,
    color: uvColors.text,
    lineHeight: 23,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontFamily: uvFonts.sans,
    fontSize: 13,
    color: uvColors.textMuted,
  },
  metaSpacer: {
    flex: 1,
  },
});

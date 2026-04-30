import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts, uvRadius } from '../../lib/uv-tokens';
import { hapticSecondary } from '../../lib/haptics';

interface JudgingRowCardProps {
  avatarInitial: string;
  vowText: string;
  makerName: string;
  timeLabel: string;
  urgency?: string;
  statusPill?: { label: string; variant: 'orange' | 'green' };
  onPress?: () => void;
}

export function JudgingRowCard({
  avatarInitial,
  vowText,
  makerName,
  timeLabel,
  urgency,
  statusPill,
  onPress,
}: JudgingRowCardProps) {
  const handlePress = () => {
    if (onPress) {
      hapticSecondary();
      onPress();
    }
  };

  const pillColors =
    statusPill?.variant === 'green'
      ? { bg: uvColors.successBg, text: uvColors.success }
      : { bg: uvColors.warnBg, text: uvColors.warn };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && onPress ? styles.pressed : undefined,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{avatarInitial}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.vowText} numberOfLines={2}>
          {vowText}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.makerName}>{makerName}</Text>
          <Text style={styles.dot}>{'\u00B7'}</Text>
          {urgency ? (
            <Text style={styles.urgency}>{urgency}</Text>
          ) : (
            <Text style={styles.timeLabel}>{timeLabel}</Text>
          )}
          {statusPill && (
            <View style={[styles.pill, { backgroundColor: pillColors.bg }]}>
              <Text style={[styles.pillText, { color: pillColors.text }]}>
                {statusPill.label}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default JudgingRowCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: uvRadius.lg,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: uvColors.bgCard,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  avatar: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: uvColors.goldBg,
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: uvFonts.serifMedium,
    fontSize: 16,
    fontWeight: '500',
    color: uvColors.goldBright,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  vowText: {
    fontFamily: uvFonts.serifItalic,
    fontSize: 15,
    fontStyle: 'italic',
    color: uvColors.text,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  makerName: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
    color: uvColors.textMuted,
  },
  dot: {
    fontSize: 13,
    color: uvColors.textDim,
  },
  timeLabel: {
    fontFamily: uvFonts.sans,
    fontSize: 13,
    color: uvColors.textDim,
  },
  urgency: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: uvColors.warn,
  },
  pill: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  pillText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

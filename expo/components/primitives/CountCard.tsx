import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uvColors, uvFonts, uvRadius } from '../../lib/uv-tokens';

interface CountCardProps {
  label: string;
  value: string;
  subtitle?: string;
  progress: number;
  children?: React.ReactNode;
}

export function CountCard({ label, value, subtitle, progress, children }: CountCardProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={styles.meterTrack}>
        <LinearGradient
          colors={[uvColors.goldBright, uvColors.gold, uvColors.goldDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.meterFill,
            { width: `${clampedProgress * 100}%` as unknown as number },
          ]}
        />
      </View>
      {children}
    </View>
  );
}

export default CountCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: uvRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(214,168,60,.34)',
    backgroundColor: 'rgba(27,22,15,.82)',
    padding: 16,
    gap: 6,
  },
  label: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
    color: uvColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 44,
    fontWeight: '700',
    color: uvColors.goldBright,
    fontVariant: ['tabular-nums'],
  },
  subtitle: {
    fontFamily: uvFonts.sans,
    fontSize: 13,
    color: uvColors.textDim,
  },
  meterTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: uvColors.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: 6,
    borderRadius: 3,
  },
});

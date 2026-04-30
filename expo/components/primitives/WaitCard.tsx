import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface WaitCardProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export function WaitCard({ title, subtitle, children }: WaitCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.clockCircle}>
          <Text style={styles.clockIcon}>{'\u25F7'}</Text>
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      {children && <View style={styles.childrenSlot}>{children}</View>}
    </View>
  );
}

export default WaitCard;

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(214, 168, 60, 0.34)',
    borderRadius: 22,
    backgroundColor: uvColors.bgCard,
    padding: 16,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  clockCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: uvColors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockIcon: {
    fontSize: 22,
    color: uvColors.gold,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 16,
    fontWeight: '500',
    color: uvColors.text,
  },
  subtitle: {
    fontFamily: uvFonts.sans,
    fontSize: 14,
    color: uvColors.textMuted,
  },
  childrenSlot: {
    marginTop: 2,
  },
});

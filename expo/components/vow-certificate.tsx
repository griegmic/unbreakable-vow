import { LinearGradient } from 'expo-linear-gradient';
import { Shield } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { palette, serifFont } from '@/constants/unbreakable';

interface VowCertificateProps {
  vowText: string;
  witnessName: string;
  stakeAmount: number;
  consequence: string;
  dateRange: string;
  verdictDate: string;
  isSelfWitness: boolean;
  animate?: boolean;
}

export const VowCertificate = React.memo(function VowCertificate({
  vowText,
  witnessName,
  stakeAmount,
  consequence,
  dateRange,
  verdictDate,
  isSelfWitness,
  animate = true,
}: VowCertificateProps) {
  const fadeIn = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const scaleIn = useRef(new Animated.Value(animate ? 0.95 : 1)).current;
  const sealSpin = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;

    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleIn, {
          toValue: 1,
          speed: 6,
          bounciness: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(sealSpin, {
        toValue: 1,
        speed: 4,
        bounciness: 14,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 2400,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sealRotation = sealSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.35],
  });

  const sealScale = sealSpin.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1.1, 1],
  });

  const displayConsequence = isSelfWitness ? 'charity' : consequence;

  return (
    <Animated.View
      style={[
        styles.outer,
        {
          opacity: fadeIn,
          transform: [{ scale: scaleIn }],
        },
      ]}
      testID="vow-certificate"
    >
      <View style={styles.card}>
        <LinearGradient
          colors={['#0D1117', '#0F1520', '#111826']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[
            styles.cornerGlow,
            { opacity: glowOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.cornerGlowBottom,
            { opacity: glowOpacity },
          ]}
        />

        <View style={styles.borderInner}>
          <View style={styles.headerRow}>
            <View style={styles.ruleLeft} />
            <Text style={styles.headerText}>UNBREAKABLE VOW</Text>
            <View style={styles.ruleRight} />
          </View>

          <View style={styles.vowBlock}>
            <View style={styles.quoteAccent} />
            <Text style={styles.vowText}>{vowText}</Text>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerDot} />
            <View style={styles.dividerLine} />
            <View style={styles.dividerDot} />
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>STAKE</Text>
              <Text style={styles.detailValueGold}>${stakeAmount}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{isSelfWitness ? 'JUDGE' : 'WITNESS'}</Text>
              <Text style={styles.detailValue}>{witnessName}</Text>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>IF BROKEN</Text>
              <Text style={styles.detailValueMuted}>${stakeAmount} → {displayConsequence}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>VERDICT</Text>
              <Text style={styles.detailValueMuted}>{verdictDate}</Text>
            </View>
          </View>

          <View style={styles.sealRow}>
            <Animated.View
              style={[
                styles.sealContainer,
                {
                  transform: [
                    { rotate: sealRotation },
                    { scale: sealScale },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#D4A24F', '#C4923F', '#8C6423']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sealGradient}
              >
                <Shield color="#0B0D11" fill="#0B0D11" size={18} />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.sealLabel}>SEALED</Text>
          </View>

          <Text style={styles.dateRange}>{dateRange}</Text>

          <Text style={styles.watermark}>unbreakablevow.app</Text>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  outer: {
    shadowColor: '#D4A24F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.25)',
  },
  borderInner: {
    margin: 1,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.08)',
    padding: 24,
    paddingTop: 20,
    gap: 16,
  },
  cornerGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(212,162,79,0.2)',
  },
  cornerGlowBottom: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212,162,79,0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  ruleLeft: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(212,162,79,0.2)',
  },
  ruleRight: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(212,162,79,0.2)',
  },
  headerText: {
    color: palette.goldBright,
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 3,
  },
  vowBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  quoteAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: palette.gold,
    marginRight: 14,
  },
  vowText: {
    flex: 1,
    color: palette.text,
    fontSize: 18,
    lineHeight: 26,
    fontFamily: serifFont,
    fontWeight: '400' as const,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(212,162,79,0.3)',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(212,162,79,0.1)',
  },
  detailsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flex: 1,
    gap: 4,
  },
  detailDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(212,162,79,0.12)',
    marginHorizontal: 16,
  },
  detailLabel: {
    color: palette.textMuted,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
  },
  detailValueGold: {
    color: palette.goldBright,
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  detailValue: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  detailValueMuted: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  sealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 4,
  },
  sealContainer: {
    shadowColor: '#D4A24F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  sealGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealLabel: {
    color: palette.gold,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 2.5,
  },
  dateRange: {
    color: palette.textMuted,
    fontSize: 12,
    textAlign: 'center' as const,
    letterSpacing: 0.5,
  },
  watermark: {
    color: 'rgba(212,162,79,0.2)',
    fontSize: 10,
    textAlign: 'center' as const,
    letterSpacing: 1,
    fontWeight: '600' as const,
    ...Platform.select({
      web: { userSelect: 'none' as const },
      default: {},
    }),
  },
});

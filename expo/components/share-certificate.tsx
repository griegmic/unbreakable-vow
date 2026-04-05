import { LinearGradient } from 'expo-linear-gradient';
import { Shield } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { palette, serifFont } from '@/constants/unbreakable';

interface ShareCertificateProps {
  vowText: string;
  stakeAmount: number;
  sealDate: string;
}

export const ShareCertificate = React.forwardRef<View, ShareCertificateProps>(
  function ShareCertificate({ vowText, stakeAmount, sealDate }, ref) {
    return (
      <View ref={ref} style={styles.container} collapsable={false}>
        <LinearGradient
          colors={[palette.bg, '#080C14', '#0A0F18', palette.bg]}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.topFiber} pointerEvents="none" />
        <View style={styles.bottomFiber} pointerEvents="none" />

        <View style={styles.glow} pointerEvents="none" />

        <View style={styles.inner}>
          <View style={styles.topSection}>
            <View style={styles.headerRuleRow}>
              <View style={styles.headerRule} />
              <Text style={styles.headerText}>UNBREAKABLE VOW</Text>
              <View style={styles.headerRule} />
            </View>
          </View>

          <View style={styles.centerSection}>
            <Text style={styles.vowText}>{vowText}</Text>
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.goldRule} />

            <View style={styles.sealBadge}>
              <LinearGradient
                colors={['#D4A24F', '#C4923F', '#8C6423']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sealGradient}
              >
                <Shield color="#0B0D11" fill="#0B0D11" size={16} />
              </LinearGradient>
            </View>

            <Text style={styles.stakeText}>${stakeAmount} at stake</Text>
            <Text style={styles.dateText}>Sealed {sealDate}</Text>

            <Text style={styles.watermark}>unbreakablevow.app</Text>
          </View>
        </View>
      </View>
    );
  },
);

const ASPECT_WIDTH = 1080;
const ASPECT_HEIGHT = 1920;
const DISPLAY_WIDTH = 300;
const DISPLAY_HEIGHT = (DISPLAY_WIDTH / ASPECT_WIDTH) * ASPECT_HEIGHT;

const styles = StyleSheet.create({
  container: {
    width: DISPLAY_WIDTH,
    height: DISPLAY_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center' as const,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  glow: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 200,
    backgroundColor: 'rgba(212,162,79,0.12)',
  },
  topFiber: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: 'rgba(212,162,79,0.04)',
  },
  bottomFiber: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 140,
    backgroundColor: 'rgba(212,162,79,0.03)',
  },
  topSection: {
    alignItems: 'center',
  },
  headerRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  headerRule: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(212,162,79,0.18)',
  },
  headerText: {
    color: palette.goldBright,
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 3,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  vowText: {
    color: palette.goldBright,
    fontSize: 20,
    lineHeight: 30,
    fontFamily: serifFont,
    textAlign: 'center' as const,
    fontWeight: '400' as const,
  },
  bottomSection: {
    alignItems: 'center',
    gap: 14,
  },
  goldRule: {
    width: '40%',
    height: 1,
    backgroundColor: 'rgba(212,162,79,0.3)',
  },
  sealBadge: {
    shadowColor: '#D4A24F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  sealGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stakeText: {
    color: palette.goldBright,
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  dateText: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  watermark: {
    color: palette.textMuted,
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: '600' as const,
    opacity: 0.6,
    marginTop: 6,
    ...Platform.select({
      web: { userSelect: 'none' as const },
      default: {},
    }),
  },
});

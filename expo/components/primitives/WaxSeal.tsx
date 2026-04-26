import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface WaxSealProps {
  monogram?: string;
  size?: 'sm' | 'md' | 'lg';
  showHalo?: boolean;
  showCheck?: boolean;
}

const SIZES = { sm: 64, md: 96, lg: 112 } as const;

export function WaxSeal({ monogram = 'UV', size = 'lg', showHalo = true, showCheck = false }: WaxSealProps) {
  const px = SIZES[size];
  const checkSize = Math.round(px * 0.32);
  const haloScale = useRef(new Animated.Value(1)).current;
  const haloOpacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (!showHalo) return undefined;
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(haloScale, {
            toValue: 1.08,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(haloScale, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(haloOpacity, {
            toValue: 0.85,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0.55,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [haloOpacity, haloScale, showHalo]);

  return (
    <View style={[styles.container, { width: px, height: px }]}>
      {showHalo && (
        <Animated.View
          style={[
            styles.halo,
            { width: px + 20, height: px + 20, borderRadius: (px + 20) / 2 },
            { opacity: haloOpacity, transform: [{ scale: haloScale }] },
          ]}
        />
      )}
      <View
        style={[
          styles.seal,
          { width: px, height: px, borderRadius: px / 2 },
        ]}
      >
        <Text style={[styles.monogram, { fontSize: px * 0.4 }]}>
          {monogram}
        </Text>
      </View>
      {showCheck && (
        <View
          style={[
            styles.check,
            { width: checkSize, height: checkSize, borderRadius: checkSize / 2 },
          ]}
        >
          <Text style={[styles.checkMark, { fontSize: checkSize * 0.45 }]}>✓</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: uvColors.goldGlow,
    shadowColor: uvColors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
  },
  seal: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: uvColors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    backgroundColor: uvColors.gold,
  },
  monogram: {
    fontFamily: uvFonts.serifSemibold,
    fontWeight: '600',
    color: uvColors.textOnGold,
    letterSpacing: 2,
  },
  check: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: uvColors.imessage,
    borderWidth: 2,
    borderColor: uvColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

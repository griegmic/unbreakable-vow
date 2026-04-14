import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { palette, serifFont } from '@/constants/unbreakable';

interface IntroCeremonyProps {
  showFullIntro: boolean;
  onComplete: () => void;
}

type IntroPhase = 'line1' | 'line2' | 'line3' | 'hold' | 'dissolve' | 'oath' | 'bloom' | 'done';

export function IntroCeremony({ showFullIntro, onComplete }: IntroCeremonyProps) {
  const [phase, setPhase] = useState<IntroPhase>(showFullIntro ? 'line1' : 'oath');

  const line1 = useRef(new Animated.Value(0)).current;
  const line1Y = useRef(new Animated.Value(18)).current;
  const line2 = useRef(new Animated.Value(0)).current;
  const line2Y = useRef(new Animated.Value(18)).current;
  const line3 = useRef(new Animated.Value(0)).current;
  const line3Y = useRef(new Animated.Value(18)).current;

  const allLinesY = useRef(new Animated.Value(0)).current;
  const allLinesFade = useRef(new Animated.Value(1)).current;

  const oathFade = useRef(new Animated.Value(0)).current;
  const oathY = useRef(new Animated.Value(14)).current;
  const btnFade = useRef(new Animated.Value(0)).current;
  const btnY = useRef(new Animated.Value(10)).current;

  const bloomScale = useRef(new Animated.Value(0)).current;
  const bloomOpacity = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!showFullIntro) {
      oathFade.setValue(0);
      oathY.setValue(14);
      btnFade.setValue(0);
      btnY.setValue(10);

      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(oathFade, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(oathY, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(btnFade, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(btnY, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();
      return;
    }

    const springConfig = { speed: 12, bounciness: 4, useNativeDriver: true };

    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(line1, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(line1Y, { toValue: 0, ...springConfig }),
      ]),
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(line2, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(line2Y, { toValue: 0, ...springConfig }),
      ]),
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(line3, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(line3Y, { toValue: 0, ...springConfig }),
      ]),
      Animated.delay(1000),
    ]).start(() => {
      setPhase('dissolve');
      Animated.parallel([
        Animated.timing(allLinesFade, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(allLinesY, { toValue: -30, duration: 500, useNativeDriver: true }),
      ]).start(() => {
        setPhase('oath');
        Animated.sequence([
          Animated.delay(500),
          Animated.parallel([
            Animated.timing(oathFade, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(oathY, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(btnFade, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(btnY, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
        ]).start();
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwear = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase('bloom');

    Animated.parallel([
      Animated.timing(bloomOpacity, { toValue: 0.6, duration: 500, useNativeDriver: true }),
      Animated.spring(bloomScale, { toValue: 8, speed: 4, bounciness: 0, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(screenFade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setPhase('done');
        onComplete();
      });
    });
  }, [bloomOpacity, bloomScale, screenFade, onComplete]);

  if (phase === 'done') return null;

  const showLines = phase === 'line1' || phase === 'line2' || phase === 'line3' || phase === 'hold' || phase === 'dissolve';
  const showOath = phase === 'oath' || phase === 'bloom' || (!showFullIntro);

  return (
    <Animated.View style={[styles.container, { opacity: screenFade }]}>
      <View style={styles.bg}>
        <LinearGradient
          colors={['#030508', '#050810', '#030508']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View pointerEvents="none" style={styles.ambientOrb} />

      {showLines && (
        <Animated.View style={[styles.linesWrap, { opacity: allLinesFade, transform: [{ translateY: allLinesY }] }]}>
          <Animated.Text style={[styles.introLine, { opacity: line1, transform: [{ translateY: line1Y }] }]}>
            One vow.
          </Animated.Text>
          <Animated.Text style={[styles.introLine, { opacity: line2, transform: [{ translateY: line2Y }] }]}>
            One witness.
          </Animated.Text>
          <Animated.Text style={[styles.introLine, { opacity: line3, transform: [{ translateY: line3Y }] }]}>
            Money on the line.
          </Animated.Text>
        </Animated.View>
      )}

      {showOath && (
        <View style={styles.oathWrap}>
          <Animated.Text style={[styles.oathText, { opacity: oathFade, transform: [{ translateY: oathY }] }]}>
            I do solemnly swear{'\n'}to keep my word this week.
          </Animated.Text>

          <Animated.View style={[styles.btnWrap, { opacity: btnFade, transform: [{ translateY: btnY }] }]}>
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable
                onPress={handleSwear}
                onPressIn={() => {
                  Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
                }}
                onPressOut={() => {
                  Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
                }}
                style={styles.swearBtn}
                testID="intro-swear"
              >
                <LinearGradient
                  colors={[palette.goldBright, palette.gold, palette.goldDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.swearBtnGradient}
                >
                  <Text style={styles.swearBtnText}>I swear it</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </View>
      )}

      {phase === 'bloom' && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bloom,
            {
              opacity: bloomOpacity,
              transform: [{ scale: bloomScale }],
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  ambientOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: 'rgba(212,162,79,0.06)',
    top: '35%',
    alignSelf: 'center',
  },
  linesWrap: {
    alignItems: 'center',
    gap: 14,
  },
  introLine: {
    color: palette.goldBright,
    fontSize: 34,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    textAlign: 'center' as const,
    letterSpacing: -1,
    textShadowColor: 'rgba(212,162,79,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  oathWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 36,
  },
  oathText: {
    color: palette.goldBright,
    fontSize: 28,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    textAlign: 'center' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(212,162,79,0.25)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  btnWrap: {
    width: '100%',
    paddingHorizontal: 20,
  },
  swearBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  swearBtnGradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  swearBtnText: {
    color: '#0B0D11',
    fontSize: 17,
    fontWeight: '800' as const,
    fontFamily: serifFont,
    letterSpacing: 0.3,
  },
  bloom: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 60,
    backgroundColor: palette.goldGlow,
  },
});

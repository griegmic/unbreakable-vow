import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { uvColors, uvFonts, uvSpacing, uvDurations } from '../../lib/uv-tokens';

interface TimelineItemProps {
  label: string;
  text: string;
  dotColor?: string;
  active?: boolean;
}

export function TimelineItem({
  label,
  text,
  dotColor,
  active = false,
}: TimelineItemProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: uvDurations.pulseDot / 2,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: uvDurations.pulseDot / 2,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [active]);

  const resolvedDotColor = dotColor ?? (active ? uvColors.gold : uvColors.textDim);

  return (
    <View style={styles.row}>
      <View style={styles.dotColumn}>
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: resolvedDotColor, opacity: active ? pulseAnim : 0.5 },
          ]}
        />
      </View>
      <View style={styles.textColumn}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

export default TimelineItem;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: uvSpacing.sm,
  },
  dotColumn: {
    width: 18,
    alignItems: 'center',
    paddingTop: 5,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  textColumn: {
    flex: 1,
    paddingLeft: uvSpacing.sm,
    gap: 2,
  },
  label: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    color: uvColors.textMuted,
    letterSpacing: 0.3,
  },
  text: {
    fontFamily: uvFonts.sans,
    fontSize: 14,
    color: uvColors.text,
    lineHeight: 20,
  },
});

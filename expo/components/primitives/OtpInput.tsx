import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
} from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticOtpDigit, hapticOtpError } from '@/lib/haptics';

interface OtpInputProps {
  length?: number;
  value: string;
  onChangeText: (text: string) => void;
  error?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChangeText,
  error = false,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevLength = useRef(value.length);

  useEffect(() => {
    if (value.length > prevLength.current) {
      hapticOtpDigit();
    }
    prevLength.current = value.length;
  }, [value]);

  useEffect(() => {
    if (error) {
      hapticOtpError();
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [error, shakeAnim]);

  const handleChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, length);
    onChangeText(digits);
  };

  const activeIndex = Math.min(value.length, length - 1);
  const boxes = Array.from({ length }, (_, i) => {
    const filled = i < value.length;
    const active = i === activeIndex && value.length < length;
    return (
      <View
        key={i}
        style={[
          styles.box,
          active && styles.boxActive,
          filled && styles.boxFilled,
          error && filled && styles.boxError,
        ]}
      >
        {filled ? (
          <Text style={styles.digit}>{value[i]}</Text>
        ) : active ? (
          <View style={styles.caret} />
        ) : null}
      </View>
    );
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}>
      <View style={styles.boxesRow}>{boxes}</View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        style={styles.hiddenInput}
        keyboardType="number-pad"
        keyboardAppearance="dark"
        maxLength={length}
        autoFocus
        caretHidden
        textContentType="oneTimeCode"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  boxesRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
  },
  box: {
    width: 46,
    height: 58,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(244,234,216,0.18)',
    backgroundColor: 'rgba(244,234,216,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: uvColors.gold,
    backgroundColor: uvColors.goldSoft,
  },
  boxFilled: {
    borderColor: 'rgba(244,234,216,0.32)',
    backgroundColor: 'rgba(244,234,216,0.06)',
  },
  boxError: {
    borderColor: uvColors.danger,
    backgroundColor: uvColors.dangerBg,
  },
  digit: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    color: uvColors.text,
  },
  caret: {
    width: 2,
    height: 28,
    borderRadius: 99,
    backgroundColor: uvColors.goldBright,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
});

export default OtpInput;

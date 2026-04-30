import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Animated,
} from 'react-native';
import { uvColors } from '@/lib/uv-tokens';
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

  const dots = Array.from({ length }, (_, i) => {
    const filled = i < value.length;
    return (
      <View
        key={i}
        style={[
          styles.dot,
          filled && styles.dotFilled,
          error && styles.dotError,
        ]}
      />
    );
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}>
      <View style={styles.dotsRow}>{dots}</View>
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
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: uvColors.borderStrong,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    borderColor: uvColors.gold,
    backgroundColor: uvColors.gold,
  },
  dotError: {
    borderColor: uvColors.danger,
    backgroundColor: uvColors.dangerBg,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
});

export default OtpInput;

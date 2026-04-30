import React, { useEffect, useRef } from 'react';
import { Pressable, Text, StyleSheet, Animated } from 'react-native';
import { uvColors, uvFonts, uvRadius } from '../../lib/uv-tokens';
import { hapticOtpError, hapticPrimary } from '../../lib/haptics';

interface ToastNetworkErrorProps {
  message: string;
  onRetry?: () => void;
  visible: boolean;
}

export function ToastNetworkError({ message, onRetry, visible }: ToastNetworkErrorProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      hapticOtpError();
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      dismissTimer.current = setTimeout(() => {
        slideOut();
      }, 6000);
    } else {
      slideOut();
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [visible]);

  const slideOut = () => {
    Animated.timing(translateY, {
      toValue: 100,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const handleRetry = () => {
    if (onRetry) {
      hapticPrimary();
      onRetry();
    }
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <Pressable
        onPress={handleRetry}
        style={({ pressed }) => [styles.toast, pressed && onRetry ? styles.pressed : undefined]}
      >
        <Text style={styles.message}>{message}</Text>
        {onRetry && <Text style={styles.retry}>Retry</Text>}
      </Pressable>
    </Animated.View>
  );
}

export default ToastNetworkError;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: uvRadius.lg,
    borderWidth: 1,
    borderColor: uvColors.dangerBorder,
    backgroundColor: uvColors.bgElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  message: {
    flex: 1,
    fontFamily: uvFonts.sansMedium,
    fontSize: 14,
    fontWeight: '500',
    color: uvColors.text,
  },
  retry: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    fontWeight: '600',
    color: uvColors.goldBright,
    marginLeft: 12,
  },
});

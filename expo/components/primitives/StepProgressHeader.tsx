import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { uvColors, uvFonts, uvRadius } from '@/lib/uv-tokens';
import { hapticSecondary } from '@/lib/haptics';

interface StepProgressHeaderProps {
  step: number;
  totalSteps: number;
  progress: number;
  onSignIn?: () => void;
}

export function StepProgressHeader({
  step,
  totalSteps,
  progress,
  onSignIn,
}: StepProgressHeaderProps) {
  return (
    <View style={styles.container}>
      {/* 58px column */}
      <View style={styles.stepCol}>
        <Text style={styles.stepText}>
          {step} / {totalSteps}
        </Text>
      </View>

      {/* 1fr column */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(Math.max(progress, 0), 1) * 100}%` },
          ]}
        />
      </View>

      {/* 72px column */}
      <View style={styles.signInCol}>
        {onSignIn ? (
          <Pressable
            onPress={() => {
              hapticSecondary();
              onSignIn();
            }}
            hitSlop={8}
          >
            <Text style={styles.signIn}>SIGN IN</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 38,
  },
  stepCol: {
    width: 58,
  },
  stepText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 16 * 0.08,
    color: uvColors.textMuted,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    backgroundColor: uvColors.borderSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: uvColors.gold,
  },
  signInCol: {
    width: 72,
    alignItems: 'flex-end',
  },
  signIn: {
    fontFamily: uvFonts.sansSemibold,
    textTransform: 'uppercase',
    letterSpacing: 12 * 0.26,
    fontSize: 12,
    fontWeight: '800',
    color: uvColors.textMuted,
  },
});

export default StepProgressHeader;

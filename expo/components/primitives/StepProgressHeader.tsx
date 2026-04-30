import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { uvColors, uvRadius } from '@/lib/uv-tokens';
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
      <Text style={styles.stepText}>
        {step} / {totalSteps}
      </Text>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(Math.max(progress, 0), 1) * 100}%` },
          ]}
        />
      </View>

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
        <View style={styles.signInPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stepText: {
    fontSize: 13,
    fontWeight: '600',
    color: uvColors.textMuted,
    minWidth: 36,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: uvRadius.xs,
    backgroundColor: uvColors.borderSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: uvRadius.xs,
    backgroundColor: uvColors.gold,
  },
  signIn: {
    textTransform: 'uppercase',
    letterSpacing: 4,
    fontSize: 12,
    fontWeight: '800',
    color: uvColors.textMuted,
  },
  signInPlaceholder: {
    width: 60,
  },
});

export default StepProgressHeader;

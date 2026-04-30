/**
 * Global background phase color — shared value at app root.
 *
 * Per STEP_4 §F: maintained as a single shared value. When a vow's
 * status implies a phase change, the global shared value animates.
 * Individual screens read it via useBackgroundPhase().
 *
 * Phases:
 * - 'default' — standard dark bg
 * - 'green'   — witness accepted / vow kept
 * - 'gold'    — almost verdict time (<24h)
 * - 'blue'    — verdict due / vow broken
 */
import React, { createContext, useContext } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { uvColors, uvDurations } from './uv-tokens';

export type BackgroundPhase = 'default' | 'green' | 'gold' | 'blue';

const PHASE_COLORS: Record<BackgroundPhase, string> = {
  default: uvColors.bg,
  green: uvColors.phaseBgGreen,
  gold: uvColors.phaseBgGold,
  blue: uvColors.phaseBgBlue,
};

interface BackgroundPhaseContext {
  phase: SharedValue<number>;
  setPhase: (phase: BackgroundPhase) => void;
  phaseColors: typeof PHASE_COLORS;
}

const Ctx = createContext<BackgroundPhaseContext | null>(null);

const PHASE_INDEX: Record<BackgroundPhase, number> = {
  default: 0,
  green: 1,
  gold: 2,
  blue: 3,
};

export function BackgroundPhaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const phase = useSharedValue(0);

  const setPhase = (p: BackgroundPhase) => {
    phase.value = withTiming(PHASE_INDEX[p], {
      duration: uvDurations.ceremonial,
    });
  };

  return React.createElement(
    Ctx.Provider,
    { value: { phase, setPhase, phaseColors: PHASE_COLORS } },
    children,
  );
}

export function useBackgroundPhase() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      'useBackgroundPhase must be used within BackgroundPhaseProvider',
    );
  }
  return ctx;
}

/**
 * Returns an animated style that interpolates the background color
 * based on the current phase shared value.
 */
export function useBackgroundPhaseStyle() {
  const { phase, phaseColors } = useBackgroundPhase();
  const colors = Object.values(phaseColors);

  return useAnimatedStyle(() => {
    // Simple discrete mapping — at each integer, snap to that phase's color.
    // The withTiming on the shared value handles the smooth transition.
    const idx = Math.round(phase.value);
    return {
      backgroundColor: colors[Math.min(idx, colors.length - 1)],
    };
  });
}

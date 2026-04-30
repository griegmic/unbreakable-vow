/**
 * Reanimated spring profiles and easing presets.
 *
 * Per STEP_4 §A.2. All screen animations reference these constants.
 */
import { Easing } from 'react-native-reanimated';

/** iOS standard ease-out — cross-fades, sheet presents, generic animations */
export const defaultEase = Easing.bezier(0.25, 0.1, 0.25, 1);

/** Standard spring — state transitions with appropriate bounce */
export const standardSpring = {
  stiffness: 180,
  damping: 22,
  mass: 1,
} as const;

/** Tight spring — seal/live marks, "settled with finality" */
export const tightSpring = {
  stiffness: 260,
  damping: 28,
  mass: 1,
} as const;

/** Ceremonial spring — seal moment apex ONLY. Slower, weightier. */
export const ceremonialSpring = {
  stiffness: 120,
  damping: 18,
  mass: 1.2,
} as const;

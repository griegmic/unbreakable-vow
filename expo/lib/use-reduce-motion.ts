/**
 * useReduceMotion — reads iOS AccessibilityInfo.isReduceMotionEnabled.
 *
 * Per STEP_4 §A.3: read once on mount, listen for changes.
 * All animated screens conditionally reference this value.
 * Reduce-motion disables visual motion but NOT haptics or sound.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

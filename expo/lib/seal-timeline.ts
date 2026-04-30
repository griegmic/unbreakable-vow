/**
 * Seal moment (screen 06) choreography timing constants.
 *
 * Per STEP_4 §D.1 screen 06 spec. All values in ms.
 * Step 9's screen-06 build spec references these directly.
 */
export const SEAL_TIMELINE = {
  startMs: 0,
  sealMarkAt: 100,
  hapticAt: 540,
  soundAt: 540,
  kickerAt: 620,
  titleAt: 820,
  ruleAt: 1020,
  quoteAt: 1280,
  subAt: 1500,
  continueAffordanceAt: 1820,
  continueAffordancePulseMs: 1400,
  exitFadeMs: 300,
  exitTransitionMs: 400,
} as const;

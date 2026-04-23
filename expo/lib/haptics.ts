/**
 * Unbreakable Vow — Typed Haptics Module
 *
 * RULE: No screen or component should import expo-haptics directly.
 * All haptic feedback goes through these typed wrappers.
 * Primitives (GoldCTA, OutlinedGoldCTA, StakeTile, etc.) call these internally.
 *
 * Map source: IMPLEMENTATION-V6.md §2.5
 */
import * as Haptics from 'expo-haptics';

/** Primary button press (Make my vow, Tell Nick, Seal it, etc.) */
export function hapticPrimary() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Secondary button press */
export function hapticSecondary() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Verdict: Kept */
export function hapticVerdictKept() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Verdict: Broken */
export function hapticVerdictBroken() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Seal animation completes (single fire on wax stamp moment) */
export function hapticSealComplete() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** OTP digit entered */
export function hapticOtpDigit() {
  Haptics.selectionAsync();
}

/** Wrong OTP entered */
export function hapticOtpError() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** Stake tile selected */
export function hapticSelection() {
  Haptics.selectionAsync();
}

/** Pull-to-refresh threshold reached */
export function hapticPullRefresh() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Voiding/canceling a vow (destructive action after confirmation) */
export function hapticVoidConfirm() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Clock Starts — first tick of countdown (soft) */
export function hapticClockStart() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
}

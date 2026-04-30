/**
 * Native-Perfect Feature Flags
 *
 * Master flag: EXPO_PUBLIC_USE_NATIVE_PERFECT enables all graduated screens.
 * Per-screen flags: EXPO_PUBLIC_USE_NATIVE_PERFECT_<SCREEN> enables individual screens.
 *
 * Graduation model (per STEP_5_PHASE_PLAN.md §E):
 * - Each screen starts behind its per-screen flag (off by default)
 * - When a screen graduates (both reviewers PASS + Joey signs off),
 *   the per-screen flag flips ON in production EAS profile
 * - The master flag is a convenience override that enables ALL screens
 *
 * Phase 10: master flag defaults ON, per-screen flags removed.
 */

const env = (key: string): boolean =>
  process.env[key] === '1' || process.env[key] === 'true';

/** Master toggle — enables all native-perfect screens */
export const USE_NATIVE_PERFECT = env('EXPO_PUBLIC_USE_NATIVE_PERFECT');

// --- Per-screen flags (Phase 1) ---
export const USE_NATIVE_PERFECT_01 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_01');
export const USE_NATIVE_PERFECT_02 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_02');
export const USE_NATIVE_PERFECT_02B = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_02B');
export const USE_NATIVE_PERFECT_02C = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_02C');
export const USE_NATIVE_PERFECT_D9 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D9');

// --- Per-screen flags (Phase 2) ---
export const USE_NATIVE_PERFECT_03 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_03');
export const USE_NATIVE_PERFECT_03B = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_03B');
export const USE_NATIVE_PERFECT_03C = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_03C');
export const USE_NATIVE_PERFECT_D10 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D10');
export const USE_NATIVE_PERFECT_D11 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D11');

// --- Per-screen flags (Phase 3) ---
export const USE_NATIVE_PERFECT_04 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_04');
export const USE_NATIVE_PERFECT_04B = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_04B');
export const USE_NATIVE_PERFECT_04C = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_04C');
export const USE_NATIVE_PERFECT_05 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_05');
export const USE_NATIVE_PERFECT_05B = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_05B');
export const USE_NATIVE_PERFECT_06 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_06');
export const USE_NATIVE_PERFECT_D12 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D12');
export const USE_NATIVE_PERFECT_D13 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D13');
export const USE_NATIVE_PERFECT_D17 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D17');

// --- Per-screen flags (Phase 4) ---
export const USE_NATIVE_PERFECT_07 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_07');
export const USE_NATIVE_PERFECT_07B = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_07B');
export const USE_NATIVE_PERFECT_08 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_08');
export const USE_NATIVE_PERFECT_08B = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_08B');
export const USE_NATIVE_PERFECT_08C = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_08C');

// --- Per-screen flags (Phase 5) ---
export const USE_NATIVE_PERFECT_09 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_09');
export const USE_NATIVE_PERFECT_10 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_10');
export const USE_NATIVE_PERFECT_11 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_11');
export const USE_NATIVE_PERFECT_12 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_12');

// --- Per-screen flags (Phase 6) ---
export const USE_NATIVE_PERFECT_13 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_13');
export const USE_NATIVE_PERFECT_13B = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_13B');
export const USE_NATIVE_PERFECT_D14 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D14');

// --- Per-screen flags (Phase 6.5) ---
export const USE_NATIVE_PERFECT_D19 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D19');
export const USE_NATIVE_PERFECT_D20 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D20');

// --- Per-screen flags (Phase 7) ---
export const USE_NATIVE_PERFECT_14 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_14');
export const USE_NATIVE_PERFECT_15 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_15');
export const USE_NATIVE_PERFECT_16 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_16');
export const USE_NATIVE_PERFECT_16B = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_16B');

// --- Per-screen flags (Phase 8) ---
export const USE_NATIVE_PERFECT_17 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_17');
export const USE_NATIVE_PERFECT_18 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_18');
export const USE_NATIVE_PERFECT_19 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_19');
export const USE_NATIVE_PERFECT_20 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_20');
export const USE_NATIVE_PERFECT_D1 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D1');
export const USE_NATIVE_PERFECT_D2 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D2');
export const USE_NATIVE_PERFECT_D3 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D3');
export const USE_NATIVE_PERFECT_D4 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D4');
export const USE_NATIVE_PERFECT_D5 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D5');
export const USE_NATIVE_PERFECT_D6 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D6');
export const USE_NATIVE_PERFECT_D7 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D7');
export const USE_NATIVE_PERFECT_D8 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D8');
export const USE_NATIVE_PERFECT_D18 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D18');

// --- Per-screen flags (Phase 9) ---
export const USE_NATIVE_PERFECT_D15 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D15');
export const USE_NATIVE_PERFECT_D16 = USE_NATIVE_PERFECT || env('EXPO_PUBLIC_USE_NP_D16');

/**
 * V6 Primitives — Expo
 *
 * All visual primitives for the Unbreakable Vow Expo app.
 * These are the ONLY components screens should use for interactive and display elements.
 * Haptics are wired internally — screens never call expo-haptics directly.
 *
 * Canonical source: IMPLEMENTATION-V6.md §2.5B
 */

// Core display
export { WaxSeal } from './WaxSeal';
export { FrauncesH1 } from './FrauncesH1';
export { FrauncesSub } from './FrauncesSub';
export { EyebrowTag } from './EyebrowTag';
export { Stamp } from './Stamp';
export { DeliveredPill } from './DeliveredPill';
export { TimestampPill } from './TimestampPill';

// Cards & layout
export { RitualCard } from './RitualCard';
export { VowDocCard } from './VowDocCard';

// Interactive (haptics wired internally)
export { GoldCTA } from './GoldCTA';
export { OutlinedGoldCTA } from './OutlinedGoldCTA';
export { StakeTile } from './StakeTile';
export { RadioCard } from './RadioCard';

// Data display
export { Countdown } from './Countdown';
export { StreakGrid } from './StreakGrid';

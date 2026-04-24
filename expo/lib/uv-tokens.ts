/**
 * Unbreakable Vow — V6 Design Tokens for React Native
 *
 * CANONICAL SOURCE: design-alignment/v1v2/IMPLEMENTATION-V6.md §2.1
 * These values MUST match web/src/app/globals.css --uv-* variables exactly.
 * Run `node scripts/verify-token-parity.js` to verify parity.
 */

export const uvColors = {
  // Surfaces
  bg: '#0F0D0A',
  bgCard: '#181512',
  bgElevated: '#1F1B16',
  bgInput: '#1A1612',
  bgSelected: '#2A2015',
  bgOverlay: 'rgba(5, 4, 4, 0.72)',

  // Borders
  border: '#322D24',
  borderStrong: '#4A4036',
  borderSoft: 'rgba(240, 233, 219, 0.08)',
  borderGold: '#C89B3C', // same as gold
  borderGoldSoft: 'rgba(200, 155, 60, 0.22)',

  // Text
  text: '#F0E9DB',
  textMuted: '#A49A85',
  textDim: '#726A5A',
  textFaint: '#5A5346',
  textOnGold: '#1A1205',

  // Gold (primary accent)
  gold: '#C89B3C',
  goldBright: '#E8B656',
  goldDeep: '#8B6820',
  goldBg: '#2A2015',
  goldGlow: 'rgba(200, 155, 60, 0.28)',
  goldLine: 'rgba(200, 155, 60, 0.22)',

  // Status
  success: '#4ADE80',
  successDeep: '#2AA84A',
  successBg: 'rgba(52, 199, 89, 0.10)',
  successBorder: 'rgba(52, 199, 89, 0.28)',
  danger: '#F87171',
  dangerDeep: '#C84A4A',
  dangerBg: 'rgba(248, 113, 113, 0.10)',
  warn: '#FB923C',
  warnBg: 'rgba(251, 146, 60, 0.10)',

  // iMessage / system
  imessage: '#34C759',
  imessageDeep: '#2AA84A',
  imessageBg: 'rgba(52, 199, 89, 0.10)',
  imessageBorder: 'rgba(52, 199, 89, 0.28)',

  // Selection states
  goldSelectedBg: 'rgba(200, 155, 60, 0.12)',
  goldSelectedShadow: 'rgba(200, 155, 60, 0.15)',

  // Certificate
  certPaper: '#14110D',
  certStampText: '#1A1205',
} as const;

export const uvSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
  '5xl': 80,
} as const;

export const uvRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  pill: 9999,
} as const;

export const uvFonts = {
  serif: 'Fraunces_400Regular',
  serifMedium: 'Fraunces_500Medium',
  serifSemibold: 'Fraunces_600SemiBold',
  serifItalic: 'Fraunces_400Regular_Italic',
  sans: 'InterTight_400Regular',
  sansMedium: 'InterTight_500Medium',
  sansSemibold: 'InterTight_600SemiBold',
} as const;

// Animation durations (match web globals.css)
export const uvDurations = {
  fast: 120,
  base: 240,
  slow: 400,
  ceremonial: 800,
  halo: 3200,
  sealPopIn: 480,
  checkBounce: 420,
  fadeUp: 320,
  pulseDot: 1600,
} as const;

export type UVColors = typeof uvColors;
export type UVSpacing = typeof uvSpacing;
export type UVRadius = typeof uvRadius;
export type UVFonts = typeof uvFonts;

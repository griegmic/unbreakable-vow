/**
 * Unbreakable Vow — UV Design Tokens for React Native
 *
 * Mirrors web/src/lib/design-tokens.ts for style consistency.
 * Use these in new Expo components to match the web design upgrade.
 */

export const uvColors = {
  // Backgrounds
  bg: '#0a0907',
  bgCard: '#100d09',
  bgElevated: '#15110c',
  bgInput: '#1a1612',
  bgSelected: '#2a2015',

  // Text
  text: '#f5f0e4',
  textMuted: '#a8a193',
  textDim: '#8a8275',
  textFaint: '#6b6354',
  textInvisible: '#4a443a',
  textOnGold: '#1a1205',

  // Gold
  gold: '#d4a84a',
  goldBright: '#f0c86e',
  goldDim: '#8a7540',
  goldDeep: '#8c6423',
  goldBg: '#2a2015',

  // Borders
  border: '#1a1612',
  borderStrong: '#2a231b',

  // Signals
  success: '#4ade80',
  successBg: '#0f2916',
  danger: '#f87171',
  dangerBg: '#2a1612',
  warnBg: '#2a1f14',
  warnBorder: '#5a4520',

  // Status
  statusActive: '#52d69a',
  statusPending: '#fb923c',
  statusVerdict: '#60a5fa',
  statusNeutral: '#5a5650',

  // Anti-cause
  antiRed: '#c04040',
  antiRedDeep: '#5a1a1a',
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
  serif: 'PlayfairDisplay_400Regular',
  serifMedium: 'PlayfairDisplay_500Medium',
  serifSemibold: 'PlayfairDisplay_600SemiBold',
  serifItalic: 'PlayfairDisplay_400Regular_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
} as const;

export type UVColors = typeof uvColors;
export type UVSpacing = typeof uvSpacing;
export type UVRadius = typeof uvRadius;

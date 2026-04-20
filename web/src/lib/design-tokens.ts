/**
 * Unbreakable Vow — Design Tokens (TypeScript mirror)
 *
 * These values mirror the --uv-* CSS custom properties in globals.css.
 * Used where CSS vars don't work (e.g., Stripe Elements iframe theming).
 *
 * Source of truth: design-upgrade/design-system.md
 */

export const designTokens = {
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

  // Status
  statusActive: '#52d69a',
  statusPending: '#fb923c',
  statusVerdict: '#60a5fa',
  statusNeutral: '#5a5650',

  // Anti-cause
  antiRed: '#c04040',
  antiRedDeep: '#5a1a1a',

  // Typography
  fontSerif: "'Playfair Display', Georgia, serif",
  fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

  // Radius
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 14,
    xl: 18,
    '2xl': 22,
    '3xl': 28,
  },
} as const;

export type DesignTokens = typeof designTokens;

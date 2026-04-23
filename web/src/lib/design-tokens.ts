/**
 * Unbreakable Vow — V6 Design Tokens (TypeScript mirror)
 *
 * These values mirror the --uv-* CSS custom properties in globals.css.
 * Used where CSS vars don't work (e.g., Stripe Elements iframe theming, OG card rendering).
 *
 * CANONICAL SOURCE: design-alignment/v1v2/IMPLEMENTATION-V6.md §2.1
 * Keep in sync with globals.css and expo/lib/uv-tokens.ts.
 */

export const designTokens = {
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
  borderGold: '#C89B3C',
  borderGoldSoft: 'rgba(200, 155, 60, 0.22)',

  // Text
  text: '#F0E9DB',
  textMuted: '#A49A85',
  textDim: '#726A5A',
  textFaint: '#5A5346',
  textOnGold: '#1A1205',

  // Gold
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

  // Typography
  fontSerif: "'Fraunces', Georgia, serif",
  fontSans: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

  // Radius
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 14,
    xl: 18,
    '2xl': 22,
    '3xl': 28,
    pill: 9999,
  },
} as const;

export type DesignTokens = typeof designTokens;

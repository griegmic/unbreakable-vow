/**
 * Unbreakable Vow — design tokens (TypeScript mirror of CSS vars in globals.css)
 *
 * Populated in Phase 1 of the design-upgrade build plan.
 * This placeholder keeps the import path stable so downstream phases can
 * reference `designTokens` before the full token set is defined.
 *
 * See: design-upgrade/design-system.md for the authoritative token list.
 */

export const designTokens = {} as const;

export type DesignTokens = typeof designTokens;

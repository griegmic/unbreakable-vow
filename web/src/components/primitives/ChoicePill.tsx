'use client';

/**
 * ChoicePill — selectable pill for filters, stakes, and inline choices.
 *
 * Consolidated from 3 screen-local implementations:
 *   - FilterChip (history) → size="sm"
 *   - StakeChip (c/[token]) → size="md" (default)
 *   - SelectionPill (quick-vow) → size="md" or flex={true}
 *
 * Visual contract:
 *   sm:   12px/600, 6px 14px padding, pill shape, --uv-text-dim inactive
 *   md:   14px/500, 8px 16px padding, pill shape, --uv-text-muted inactive
 *   flex: 15px/600, 10px 0 padding, 12px radius, fills container
 */

interface ChoicePillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  flex?: boolean;
  size?: 'sm' | 'md';
}

export function ChoicePill({ label, active, onPress, flex = false, size = 'md' }: ChoicePillProps) {
  const isSm = size === 'sm' && !flex;

  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={active}
      style={{
        flex: flex ? 1 : undefined,
        padding: flex ? '10px 0' : isSm ? '6px 14px' : '8px 16px',
        borderRadius: flex ? 12 : 9999,
        border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
        background: active ? 'var(--uv-gold-bg)' : 'transparent',
        color: active ? 'var(--uv-gold)' : isSm ? 'var(--uv-text-dim)' : 'var(--uv-text-muted)',
        fontFamily: 'var(--uv-font-sans)',
        fontSize: flex ? 15 : isSm ? 12 : 14,
        fontWeight: flex ? 600 : isSm ? 600 : 500,
        cursor: 'pointer',
        transition: 'background 100ms, border-color 100ms',
      }}
    >
      {label}
    </button>
  );
}

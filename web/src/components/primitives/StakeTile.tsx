'use client';

interface StakeTileProps {
  amount: number;
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function StakeTile({ amount, label, selected, onPress }: StakeTileProps) {
  return (
    <button
      onClick={onPress}
      style={{
        flex: 1,
        minWidth: 80,
        padding: '16px 12px',
        borderRadius: 14,
        border: selected ? '1.5px solid var(--uv-gold)' : '1px solid var(--uv-border)',
        background: selected ? 'var(--uv-gold-bg)' : 'var(--uv-bg-card)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: 4,
        transition: 'border-color 150ms ease, background 150ms ease',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 20,
          fontWeight: 600,
          fontFeatureSettings: '"tnum"',
          color: selected ? 'var(--uv-gold-bright)' : 'var(--uv-text)',
        }}
      >
        ${amount}
      </span>
      <span
        style={{
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 11,
          color: 'var(--uv-text-dim)',
        }}
      >
        {label}
      </span>
    </button>
  );
}

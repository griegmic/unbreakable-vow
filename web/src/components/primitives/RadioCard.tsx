'use client';

interface RadioCardProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
}

export function RadioCard({ label, sublabel, selected, onPress }: RadioCardProps) {
  return (
    <button
      onClick={onPress}
      style={{
        width: '100%',
        padding: '14px 16px',
        borderRadius: 14,
        border: selected ? '1.5px solid var(--uv-gold)' : '1px solid var(--uv-border)',
        background: selected ? 'var(--uv-gold-bg)' : 'var(--uv-bg-card)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left' as const,
        transition: 'border-color 150ms ease, background 150ms ease',
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: selected ? '6px solid var(--uv-gold)' : '2px solid var(--uv-border-strong)',
          background: selected ? 'var(--uv-gold-bg)' : 'transparent',
          flexShrink: 0,
          transition: 'border 150ms ease',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--uv-text)',
          }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            style={{
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 13,
              color: 'var(--uv-text-dim)',
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </button>
  );
}

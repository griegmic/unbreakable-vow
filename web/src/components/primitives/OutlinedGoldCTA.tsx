'use client';

interface OutlinedGoldCTAProps {
  label: string;
  onPress: () => void;
}

export function OutlinedGoldCTA({ label, onPress }: OutlinedGoldCTAProps) {
  return (
    <button
      onClick={onPress}
      style={{
        width: '100%',
        height: 56,
        borderRadius: 14,
        border: '1.5px solid var(--uv-gold)',
        background: 'transparent',
        color: 'var(--uv-gold)',
        fontFamily: 'var(--uv-font-serif)',
        fontSize: 16,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'transform 100ms ease, background 200ms ease',
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {label}
    </button>
  );
}

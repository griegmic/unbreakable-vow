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
        height: 62,
        borderRadius: 14,
        border: '1.5px solid var(--uv-gold)',
        background: 'transparent',
        color: 'var(--uv-gold-bright)',
        fontFamily: 'var(--uv-font-serif)',
        fontSize: 18,
        letterSpacing: '0.005em',
        boxShadow: '0 0 0 4px rgba(200,155,60,0.07)',
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

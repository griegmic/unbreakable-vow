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
        height: 52,
        borderRadius: 14,
        border: '1px solid var(--uv-gold-line)',
        background: 'transparent',
        color: 'var(--uv-gold-bright)',
        fontFamily: 'var(--uv-font-sans)',
        fontSize: 14,
        fontStyle: 'normal',
        letterSpacing: '0',
        fontWeight: 650,
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

'use client';

interface MutedSecondaryProps {
  label: string;
  onPress: () => void;
}

export function MutedSecondary({ label, onPress }: MutedSecondaryProps) {
  return (
    <button
      onClick={onPress}
      style={{
        width: '100%',
        height: 44,
        borderRadius: 12,
        border: '1px solid var(--uv-border-soft)',
        background: 'transparent',
        color: 'var(--uv-text-muted)',
        fontFamily: 'var(--uv-font-sans)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'transform 100ms ease',
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {label}
    </button>
  );
}

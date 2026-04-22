'use client';

interface GoldCTAProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'filled-gold' | 'filled-imsg-green';
}

export function GoldCTA({ label, onPress, disabled = false, variant = 'filled-gold' }: GoldCTAProps) {
  const bg = variant === 'filled-imsg-green'
    ? 'linear-gradient(180deg, var(--uv-imessage) 0%, var(--uv-imessage-deep) 100%)'
    : 'linear-gradient(180deg, var(--uv-gold-bright) 0%, var(--uv-gold) 60%, var(--uv-gold-deep) 100%)';

  const textColor = variant === 'filled-imsg-green' ? '#FFFFFF' : 'var(--uv-text-on-gold)';

  return (
    <button
      onClick={onPress}
      disabled={disabled}
      style={{
        width: '100%',
        height: 62,
        borderRadius: 14,
        border: 'none',
        background: disabled ? 'var(--uv-bg-elevated)' : bg,
        color: disabled ? 'var(--uv-text-dim)' : textColor,
        fontFamily: 'var(--uv-font-serif)',
        fontSize: 17,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 100ms ease, opacity 100ms ease',
        boxShadow: disabled ? 'none' : '0 0 20px var(--uv-gold-glow), inset 0 1px 0 rgba(255,255,255,0.18)',
      }}
      onMouseDown={(e) => { if (!disabled) (e.currentTarget.style.transform = 'scale(0.97)'); }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {label}
    </button>
  );
}

interface StampProps {
  text: 'KEPT' | 'BROKEN' | 'VOIDED';
  tone?: 'gold' | 'muted-red' | 'muted-gray' | 'filled-gold';
  variant?: 'confirmed' | 'auto-resolved';
}

const TONE_STYLES = {
  gold: { color: 'var(--uv-gold)', border: '2px solid var(--uv-gold)', bg: 'transparent' },
  'muted-red': { color: 'var(--uv-danger)', border: '2px solid var(--uv-danger)', bg: 'transparent' },
  'muted-gray': { color: 'var(--uv-text-dim)', border: '2px solid var(--uv-text-dim)', bg: 'transparent' },
  'filled-gold': {
    color: 'var(--uv-text-on-gold)',
    border: '1.5px solid #5C4514',
    bg: 'linear-gradient(180deg, #E8B656 0%, #B88930 100%)',
  },
} as const;

export function Stamp({ text, tone = 'gold', variant = 'confirmed' }: StampProps) {
  const style = TONE_STYLES[tone];
  const isFilled = tone === 'filled-gold';
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isFilled ? '10px 24px' : '8px 20px',
          borderRadius: 8,
          border: style.border,
          background: style.bg,
          color: style.color,
          fontFamily: 'var(--uv-font-sans)',
          fontSize: isFilled ? 28 : 22,
          fontWeight: 700,
          letterSpacing: '0.18em',
          transform: 'rotate(-2.5deg)',
          boxShadow: isFilled
            ? '0 1px 0 rgba(255,228,150,0.45) inset, 0 0 28px rgba(232,182,86,0.32), 0 6px 16px rgba(140,90,20,0.30)'
            : 'none',
        }}
      >
        {text}
      </div>
      {variant === 'auto-resolved' && (
        <span
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.15em',
            color: 'var(--uv-text-faint)',
            textTransform: 'uppercase',
          }}
        >
          AUTO-RESOLVED &middot; 72H
        </span>
      )}
      {variant === 'confirmed' && text === 'KEPT' && (
        <span
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.15em',
            color: 'var(--uv-text-faint)',
            textTransform: 'uppercase',
          }}
        >
          {/* Sublabel rendered by screen with witness name */}
        </span>
      )}
    </div>
  );
}

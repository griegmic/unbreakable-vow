interface EyebrowTagProps {
  children: string;
  tone?: 'gold' | 'imsg' | 'amber' | 'muted';
}

const TONE_COLORS = {
  gold: { color: 'var(--uv-gold)', bg: 'var(--uv-gold-bg)' },
  imsg: { color: 'var(--uv-imessage)', bg: 'rgba(52, 199, 89, 0.10)' },
  amber: { color: 'var(--uv-warn)', bg: 'var(--uv-warn-bg)' },
  muted: { color: 'var(--uv-text-dim)', bg: 'var(--uv-bg-elevated)' },
} as const;

export function EyebrowTag({ children, tone = 'gold' }: EyebrowTagProps) {
  const { color, bg } = TONE_COLORS[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 9999,
        background: bg,
        color,
        fontFamily: 'var(--uv-font-sans)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

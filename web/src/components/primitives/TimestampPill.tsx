interface TimestampPillProps {
  timestamp: Date;
  format?: 'time' | 'datetime';
}

export function TimestampPill({ timestamp, format = 'time' }: TimestampPillProps) {
  const text = format === 'datetime'
    ? timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '3px 8px',
        borderRadius: 9999,
        background: 'var(--uv-bg-elevated)',
        fontFamily: 'var(--uv-font-sans)',
        fontSize: 11,
        fontFeatureSettings: '"tnum"',
        color: 'var(--uv-text-dim)',
      }}
    >
      {text}
    </span>
  );
}

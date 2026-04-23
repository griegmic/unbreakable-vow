interface DeliveredPillProps {
  timestamp: Date;
}

export function DeliveredPill({ timestamp }: DeliveredPillProps) {
  const time = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        borderRadius: 9999,
        background: 'var(--uv-bg-card)',
        border: '1px solid var(--uv-border)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: 'var(--uv-imessage)',
          textTransform: 'uppercase',
        }}
      >
        DELIVERED
      </span>
      <span
        style={{
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 11,
          color: 'var(--uv-text-dim)',
        }}
      >
        · {time}
      </span>
    </div>
  );
}

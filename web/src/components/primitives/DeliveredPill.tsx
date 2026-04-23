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
        gap: 8,
        padding: '8px 14px',
        borderRadius: 9999,
        background: 'var(--uv-imessage-bg)',
        border: '1px solid var(--uv-imessage-border)',
        color: 'var(--uv-imessage)',
        fontFamily: 'var(--uv-font-sans)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700 }}>✓</span>
      Delivered · {time}
    </div>
  );
}

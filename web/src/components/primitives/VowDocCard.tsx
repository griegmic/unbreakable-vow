interface VowDocCardProps {
  vow: string;
  stake: number;
  destination: string;
  verdictDate: Date;
  compact?: boolean;
}

export function VowDocCard({ vow, stake, destination, verdictDate, compact = false }: VowDocCardProps) {
  const dateStr = verdictDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <div
      style={{
        borderRadius: 18,
        padding: compact ? '14px 16px' : '20px 22px',
        background: 'var(--uv-bg-card)',
        border: '1px solid var(--uv-border)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: compact ? 8 : 14,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--uv-font-serif)',
          fontSize: compact ? 15 : 17,
          fontWeight: 400,
          fontStyle: 'italic',
          lineHeight: 1.45,
          color: 'var(--uv-text)',
          margin: 0,
        }}
      >
        {vow}
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: '6px 16px',
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 12,
          color: 'var(--uv-text-dim)',
        }}
      >
        {stake > 0 && <span>${stake} on the line</span>}
        {stake > 0 && <span>&middot;</span>}
        {destination && <span>If broken &rarr; {destination}</span>}
        {destination && <span>&middot;</span>}
        <span>Verdict {dateStr}</span>
      </div>
    </div>
  );
}

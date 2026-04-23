interface StreakGridProps {
  total: number;
  completed: number[];
  today: number;
}

export function StreakGrid({ total, completed, today }: StreakGridProps) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => {
        const day = i + 1;
        const isDone = completed.includes(day);
        const isToday = day === today;
        const isFuture = day > today;

        return (
          <div
            key={day}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isToday
                ? '2px solid var(--uv-gold)'
                : isDone
                  ? '2px solid var(--uv-success)'
                  : '1px solid var(--uv-border)',
              background: isDone
                ? 'var(--uv-success-bg)'
                : isToday
                  ? 'var(--uv-gold-bg)'
                  : 'transparent',
              opacity: isFuture ? 0.35 : 1,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--uv-font-sans)',
                fontSize: 12,
                fontWeight: 600,
                fontFeatureSettings: '"tnum"',
                color: isDone
                  ? 'var(--uv-success)'
                  : isToday
                    ? 'var(--uv-gold)'
                    : 'var(--uv-text-faint)',
              }}
            >
              {isDone ? '✓' : day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

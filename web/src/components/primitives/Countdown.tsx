'use client';
import { useState, useEffect } from 'react';

interface CountdownProps {
  endsAt: Date;
  onElapsed?: () => void;
}

function pad(n: number) { return n.toString().padStart(2, '0'); }

function calcRemaining(endsAt: Date) {
  const diff = Math.max(0, endsAt.getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, elapsed: diff === 0 };
}

export function Countdown({ endsAt, onElapsed }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => calcRemaining(endsAt));

  useEffect(() => {
    const id = setInterval(() => {
      const r = calcRemaining(endsAt);
      setRemaining(r);
      if (r.elapsed) { clearInterval(id); onElapsed?.(); }
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt, onElapsed]);

  const cells = [
    { value: remaining.days, label: 'D' },
    { value: remaining.hours, label: 'H' },
    { value: remaining.minutes, label: 'M' },
    { value: remaining.seconds, label: 'S' },
  ];

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {cells.map(({ value, label }) => (
        <div
          key={label}
          style={{
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            minWidth: 48,
            padding: '10px 8px',
            borderRadius: 12,
            background: 'var(--uv-bg-card)',
            border: '1px solid var(--uv-border)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 24,
              fontWeight: 500,
              fontFeatureSettings: '"tnum"',
              color: 'var(--uv-text)',
              lineHeight: 1,
            }}
          >
            {pad(value)}
          </span>
          <span
            style={{
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: 'var(--uv-text-faint)',
              marginTop: 4,
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

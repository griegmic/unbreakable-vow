'use client';
import { useState } from 'react';

interface ChangeStakeSheetProps {
  currentValue: number;
  onConfirm: (amount: number) => void;
  onDismiss: () => void;
}

const STAKES = [
  { amount: 10, label: 'a nudge' },
  { amount: 25, label: 'a week of thinking' },
  { amount: 50, label: "you'll remember" },
  { amount: 100, label: "won't break it" },
] as const;

export function ChangeStakeSheet({ currentValue, onConfirm, onDismiss }: ChangeStakeSheetProps) {
  const [selected, setSelected] = useState(currentValue);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div onClick={onDismiss} style={{ position: 'absolute', inset: 0, background: 'var(--uv-bg-overlay)' }} />
      <div
        className="animate-slide-up"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          borderRadius: '24px 24px 0 0',
          background: 'var(--uv-bg-card)',
          border: '1px solid var(--uv-border)',
          borderBottom: 'none',
          padding: '24px 22px 40px',
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 16,
        }}
      >
        <h2 style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 22, fontWeight: 500, fontStyle: 'italic', color: 'var(--uv-text)', margin: 0 }}>
          Change your stake
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {STAKES.map(({ amount, label }) => (
            <button
              key={amount}
              onClick={() => setSelected(amount)}
              style={{
                flex: 1,
                padding: '14px 8px',
                borderRadius: 14,
                border: selected === amount ? '1.5px solid var(--uv-gold)' : '1px solid var(--uv-border)',
                background: selected === amount ? 'var(--uv-gold-bg)' : 'var(--uv-bg-elevated)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 18, fontWeight: 600, fontFeatureSettings: '"tnum"', color: selected === amount ? 'var(--uv-gold-bright)' : 'var(--uv-text)' }}>${amount}</span>
              <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 10, color: 'var(--uv-text-dim)' }}>{label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => onConfirm(selected)}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(180deg, var(--uv-gold-bright) 0%, var(--uv-gold) 60%, var(--uv-gold-deep) 100%)',
            color: 'var(--uv-text-on-gold)',
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 16,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Lock in ${selected}
        </button>
      </div>
    </div>
  );
}

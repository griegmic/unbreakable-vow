import { type ReactNode } from 'react';

interface RitualCardProps {
  children: ReactNode;
  compact?: boolean;
  pulseColor?: 'gold' | 'amber';
}

export function RitualCard({ children, compact = false, pulseColor }: RitualCardProps) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: compact ? '14px 16px' : '18px 22px',
        background: 'var(--uv-bg-card)',
        border: '1px solid var(--uv-border)',
        boxShadow: pulseColor
          ? `0 0 12px ${pulseColor === 'amber' ? 'rgba(251, 146, 60, 0.15)' : 'var(--uv-gold-glow)'}`
          : '0 8px 24px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: compact ? 8 : 12,
      }}
    >
      {children}
    </div>
  );
}

import { type ReactNode } from 'react';

interface RitualCardProps {
  children: ReactNode;
  variant?: 'ceremony' | 'dashboard';
  pulseColor?: 'gold' | 'amber';
}

export function RitualCard({ children, variant = 'ceremony', pulseColor }: RitualCardProps) {
  const isDashboard = variant === 'dashboard';
  const className = isDashboard ? '' : 'ritual-card-ceremony';

  return (
    <div
      className={className}
      style={{
        borderRadius: isDashboard ? 14 : 18,
        padding: isDashboard ? '14px 16px' : '18px 22px',
        background: 'var(--uv-bg-card)',
        border: isDashboard
          ? '1px solid var(--uv-border-soft)'
          : '1px solid var(--uv-gold-line)',
        boxShadow: pulseColor
          ? `0 0 12px ${pulseColor === 'amber' ? 'rgba(251, 146, 60, 0.15)' : 'var(--uv-gold-glow)'}`
          : isDashboard
            ? 'none'
            : '0 20px 50px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: isDashboard ? 8 : 12,
        position: 'relative' as const,
      }}
    >
      {children}
    </div>
  );
}

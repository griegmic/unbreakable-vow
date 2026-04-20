'use client';

import React from 'react';

type StatusVariant = 'active' | 'pending' | 'verdict' | 'kept' | 'broken' | 'voided';

interface StatusPillProps {
  variant: StatusVariant;
  children: React.ReactNode;
}

const variantStyles: Record<StatusVariant, { background: string; color: string }> = {
  active: { background: 'rgba(82,214,154,0.14)', color: 'var(--uv-status-active)' },
  pending: { background: 'rgba(251,146,60,0.14)', color: 'var(--uv-status-pending)' },
  verdict: { background: 'rgba(96,165,250,0.14)', color: 'var(--uv-status-verdict)' },
  kept: { background: 'rgba(82,214,154,0.18)', color: 'var(--uv-status-active)' },
  broken: { background: 'rgba(248,113,113,0.14)', color: 'var(--uv-danger)' },
  voided: { background: 'rgba(90,86,80,0.20)', color: 'var(--uv-status-neutral)' },
};

export function StatusPill({ variant, children }: StatusPillProps) {
  const styles = variantStyles[variant];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 'var(--uv-radius-pill)',
        background: styles.background,
        color: styles.color,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

'use client';

import React from 'react';

interface GoldSealBadgeProps {
  size?: number;
  animate?: boolean;
}

export function GoldSealBadge({ size = 48, animate = false }: GoldSealBadgeProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '12px',
        background: 'var(--uv-gold)',
        flexShrink: 0,
        animation: animate ? 'pulse-glow 2s ease-in-out infinite' : undefined,
      }}
    >
      <span
        style={{
          display: 'block',
          width: '7px',
          height: '7px',
          background: 'var(--uv-text-on-gold)',
          transform: 'rotate(45deg)',
        }}
      />
    </span>
  );
}

'use client';

import React from 'react';

interface VoidedSealBadgeProps {
  size?: number;
}

export function VoidedSealBadge({ size = 48 }: VoidedSealBadgeProps) {
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
        background: 'var(--uv-status-neutral)',
        flexShrink: 0,
        opacity: 0.5,
      }}
    >
      <span
        style={{
          display: 'block',
          width: '7px',
          height: '7px',
          background: 'var(--uv-text-on-gold)',
          transform: 'rotate(45deg)',
          opacity: 0.6,
        }}
      />
    </span>
  );
}

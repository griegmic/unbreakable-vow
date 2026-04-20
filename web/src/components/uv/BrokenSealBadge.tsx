'use client';

import React from 'react';

interface BrokenSealBadgeProps {
  size?: number;
}

export function BrokenSealBadge({ size = 48 }: BrokenSealBadgeProps) {
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
        background: 'var(--uv-danger)',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
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
      {/* Red slash line through center */}
      <span
        style={{
          position: 'absolute',
          top: '50%',
          left: '10%',
          width: '80%',
          height: '2px',
          background: 'var(--uv-text-on-gold)',
          transform: 'translateY(-50%) rotate(-45deg)',
          opacity: 0.9,
        }}
      />
    </span>
  );
}

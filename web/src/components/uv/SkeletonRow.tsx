'use client';

import React from 'react';

interface SkeletonRowProps {
  count?: number;
}

export function SkeletonRow({ count = 1 }: SkeletonRowProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            height: '80px',
            borderRadius: 'var(--uv-radius-2xl)',
            background: 'var(--uv-bg-card)',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

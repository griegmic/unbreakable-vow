'use client';

import React from 'react';

interface VowDisplayProps {
  text: string;
  size?: 'lg' | 'md' | 'sm';
}

const sizeMap = {
  lg: '32px',
  md: '26px',
  sm: '22px',
} as const;

export function VowDisplay({ text, size = 'md' }: VowDisplayProps) {
  return (
    <p
      style={{
        fontFamily: 'var(--uv-font-serif)',
        fontStyle: 'italic',
        fontWeight: 400,
        fontSize: sizeMap[size],
        lineHeight: 1.08,
        color: 'var(--uv-gold)',
        margin: 0,
      }}
    >
      {text}
    </p>
  );
}

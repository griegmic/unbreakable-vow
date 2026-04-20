'use client';

import React from 'react';

interface SectionProps {
  label: string;
  children: React.ReactNode;
}

export function Section({ label, children }: SectionProps) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          fontWeight: 500,
          color: 'var(--uv-text-faint)',
          fontFamily: 'var(--uv-font-sans)',
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

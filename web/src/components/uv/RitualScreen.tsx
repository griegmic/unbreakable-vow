'use client';

import React from 'react';

type RitualScreenVariant = 'default' | 'ceremony' | 'outcome-kept' | 'outcome-broken' | 'anti-cause-broken';

interface RitualScreenProps {
  variant?: RitualScreenVariant;
  children: React.ReactNode;
}

function getAmbient(variant: RitualScreenVariant): React.CSSProperties | null {
  switch (variant) {
    case 'default':
      return {
        position: 'absolute',
        top: -60,
        right: -60,
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--uv-gold-glow), transparent 70%)',
        opacity: 0.6,
        filter: 'blur(60px)',
        pointerEvents: 'none',
      };
    case 'ceremony':
      return {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, transparent 60%, var(--uv-gold-glow))',
        opacity: 0.3,
        pointerEvents: 'none',
      };
    case 'outcome-kept':
      return {
        position: 'absolute',
        inset: 0,
        background: 'var(--uv-success-bg)',
        opacity: 0.4,
        pointerEvents: 'none',
      };
    case 'outcome-broken':
      return {
        position: 'absolute',
        inset: 0,
        background: 'var(--uv-danger-bg)',
        opacity: 0.4,
        pointerEvents: 'none',
      };
    case 'anti-cause-broken':
      return {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, var(--uv-anti-red), transparent)',
        opacity: 0.4,
        pointerEvents: 'none',
      };
    default:
      return null;
  }
}

export function RitualScreen({ variant = 'default', children }: RitualScreenProps) {
  const ambientStyles = getAmbient(variant);

  return (
    <div
      style={{
        background: 'var(--uv-bg)',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        colorScheme: 'dark',
      }}
    >
      {ambientStyles && <div style={ambientStyles} aria-hidden="true" />}
      <div
        style={{
          maxWidth: 440,
          margin: '0 auto',
          padding: 'max(24px, env(safe-area-inset-top)) 20px 40px',
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
}

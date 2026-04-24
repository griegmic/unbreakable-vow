'use client';

import { type ReactNode } from 'react';

interface GoldCTAProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'pill' | 'filled-imsg-green';
  /** For pill variant: shown next to label, e.g. "— $50" */
  amount?: string;
}

export function GoldCTA({ label, onPress, disabled = false, variant = 'default', amount }: GoldCTAProps) {
  if (variant === 'pill') {
    return (
      <button
        onClick={onPress}
        disabled={disabled}
        style={{
          width: '100%',
          height: 60,
          borderRadius: 9999,
          border: 'none',
          background: '#F4ECDB',
          color: '#1A1205',
          fontFamily: 'var(--uv-font-serif)',
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: '0.005em',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'transform 100ms ease',
          boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 18px 40px rgba(0,0,0,0.4)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '0 64px 0 24px',
        }}
        onMouseDown={(e) => { if (!disabled) (e.currentTarget.style.transform = 'scale(0.97)'); }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {label}
        {amount && <span style={{ opacity: 0.7 }}>{amount}</span>}
        <span style={{
          position: 'absolute',
          right: 8,
          top: 8,
          bottom: 8,
          width: 44,
          borderRadius: 9999,
          background: '#1A1205',
          color: '#F4ECDB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
        }}>
          →
        </span>
      </button>
    );
  }

  const isImsg = variant === 'filled-imsg-green';
  const bg = isImsg
    ? 'linear-gradient(180deg, var(--uv-imessage) 0%, var(--uv-imessage-deep) 100%)'
    : 'linear-gradient(180deg, #D4A94A, #B88930)';
  const textColor = isImsg ? '#FFFFFF' : 'var(--uv-text-on-gold)';
  const shadow = isImsg
    ? 'inset 0 1px 0 rgba(255,255,255,0.22), 0 12px 32px rgba(52,199,89,0.26)'
    : '0 1px 0 rgba(255,220,140,0.25) inset, 0 10px 30px rgba(200,155,60,0.18)';

  return (
    <button
      onClick={onPress}
      disabled={disabled}
      style={{
        width: '100%',
        height: 58,
        borderRadius: 14,
        border: 'none',
        background: disabled ? 'var(--uv-bg-elevated)' : bg,
        color: disabled ? 'var(--uv-text-dim)' : textColor,
        fontFamily: 'var(--uv-font-serif)',
        fontSize: 17,
        fontWeight: 500,
        letterSpacing: '0.005em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 100ms ease, opacity 100ms ease',
        boxShadow: disabled ? 'none' : shadow,
      }}
      onMouseDown={(e) => { if (!disabled) (e.currentTarget.style.transform = 'scale(0.97)'); }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {label}
    </button>
  );
}

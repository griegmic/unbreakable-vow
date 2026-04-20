'use client';

import React from 'react';

interface IconButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}

export function IconButton({
  onClick,
  children,
  ariaLabel,
  className,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '44px',
        height: '44px',
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--uv-radius-sm)',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 120ms',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--uv-bg-input)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
      onFocus={(e) => {
        if (e.currentTarget.matches(':focus-visible')) {
          e.currentTarget.style.outline = '2px solid var(--uv-gold)';
          e.currentTarget.style.outlineOffset = '2px';
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      {children}
    </button>
  );
}

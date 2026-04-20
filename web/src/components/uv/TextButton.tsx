'use client';

import React from 'react';

interface TextButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function TextButton({
  onClick,
  children,
  className,
}: TextButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--uv-text-dim)',
        fontSize: '13px',
        fontWeight: 500,
        fontFamily: 'var(--uv-font-sans)',
        padding: '8px 4px',
        cursor: 'pointer',
        transition: 'color 120ms',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--uv-text-muted)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--uv-text-dim)';
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

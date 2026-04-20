'use client';

import React from 'react';

interface SecondaryButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SecondaryButton({
  onClick,
  children,
  className,
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--uv-gold)',
        fontSize: '13px',
        fontWeight: 500,
        fontFamily: 'var(--uv-font-sans)',
        padding: '8px 4px',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'text-decoration 120ms',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.textDecoration = 'underline';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecoration = 'none';
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

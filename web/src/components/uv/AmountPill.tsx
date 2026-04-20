'use client';

import React from 'react';

interface AmountPillProps {
  amount: string;
  selected?: boolean;
  onClick: () => void;
}

export function AmountPill({ amount, selected = false, onClick }: AmountPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minHeight: 44,
        padding: '8px 0',
        borderRadius: 'var(--uv-radius-sm)',
        background: selected ? 'var(--uv-gold-bg)' : 'var(--uv-bg-input)',
        border: selected ? '1px solid var(--uv-gold)' : 'none',
        color: selected ? 'var(--uv-gold)' : 'var(--uv-text-dim)',
        fontFamily: 'var(--uv-font-sans)',
        fontSize: 11,
        fontWeight: 500,
        textAlign: 'center',
        cursor: 'pointer',
        outline: 'none',
      }}
      onFocus={(e) => {
        if (e.target.matches(':focus-visible')) {
          e.target.style.outline = '2px solid var(--uv-gold)';
          e.target.style.outlineOffset = '2px';
        }
      }}
      onBlur={(e) => {
        e.target.style.outline = 'none';
        e.target.style.outlineOffset = '0';
      }}
    >
      {amount}
    </button>
  );
}

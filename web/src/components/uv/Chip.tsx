'use client';

import React, { useState } from 'react';

interface ChipProps {
  label: string;
  selected?: boolean;
  suggestion?: boolean;
  onClick: () => void;
}

export function Chip({ label, selected = false, suggestion = false, onClick }: ChipProps) {
  const [hovered, setHovered] = useState(false);

  const getStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      minHeight: 44,
      padding: '5px 10px',
      borderRadius: 'var(--uv-radius-lg)',
      fontSize: 11,
      fontWeight: 500,
      cursor: 'pointer',
      outline: 'none',
      background: 'transparent',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: '32px',
    };

    if (suggestion) {
      return {
        ...base,
        border: '1px dashed var(--uv-gold)',
        color: 'var(--uv-gold)',
        fontStyle: 'italic',
      };
    }

    if (selected) {
      return {
        ...base,
        border: '1px solid var(--uv-gold)',
        background: 'var(--uv-gold-bg)',
        color: 'var(--uv-gold)',
      };
    }

    if (hovered) {
      return {
        ...base,
        border: '1px solid var(--uv-border-gold-soft)',
        color: 'var(--uv-text)',
      };
    }

    return {
      ...base,
      border: '1px solid var(--uv-border-strong)',
      color: 'var(--uv-text-dim)',
    };
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={getStyles()}
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
      {label}
    </button>
  );
}

'use client';

import React from 'react';

interface RadioCardProps {
  label: string;
  sub?: string;
  selected?: boolean;
  onClick: () => void;
  special?: boolean;
}

export function RadioCard({ label, sub, selected, onClick, special }: RadioCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        background: selected ? 'var(--uv-gold-bg)' : 'var(--uv-bg-input)',
        border: `1px solid ${selected ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
        borderRadius: 'var(--uv-radius-xl, 12px)',
        padding: '12px 14px',
        cursor: 'pointer',
        outline: 'none',
        transition: 'border-color 120ms, background 120ms',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontSize: 14,
            fontFamily: 'var(--uv-font-sans)',
            color: selected || special ? 'var(--uv-gold)' : 'var(--uv-text)',
            fontWeight: selected ? 500 : 400,
          }}
        >
          {label}
        </span>
        {sub && (
          <span
            style={{
              fontSize: 12,
              color: 'var(--uv-text-muted)',
              fontFamily: 'var(--uv-font-sans)',
            }}
          >
            {sub}
          </span>
        )}
      </div>

      {special ? (
        <span
          style={{
            fontSize: 18,
            color: 'var(--uv-gold)',
            fontWeight: 300,
            lineHeight: 1,
          }}
        >
          ›
        </span>
      ) : (
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: `1.5px solid ${selected ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {selected && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--uv-gold)',
              }}
            />
          )}
        </span>
      )}

      <style>{`
        button[role="radio"]:focus-visible {
          outline: 2px solid var(--uv-gold);
          outline-offset: 2px;
        }
      `}</style>
    </button>
  );
}

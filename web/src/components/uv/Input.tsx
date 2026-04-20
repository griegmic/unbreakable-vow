'use client';

import React, { useId } from 'react';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  active?: boolean;
  error?: string;
  className?: string;
  type?: string;
  label?: string;
}

export function Input({
  value,
  onChange,
  placeholder,
  active,
  error,
  className,
  type = 'text',
  label,
}: InputProps) {
  const id = useId();

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label
        htmlFor={id}
        style={
          label
            ? { fontSize: 13, color: 'var(--uv-text-muted)', marginBottom: 2 }
            : {
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
                whiteSpace: 'nowrap',
                borderWidth: 0,
              }
        }
      >
        {label || placeholder || 'Input'}
      </label>
      <input
        id={id}
        data-uv-input={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: 'var(--uv-bg-input)',
          border: `1px solid ${error ? 'var(--uv-danger)' : active ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
          borderRadius: 'var(--uv-radius-xl, 18px)',
          padding: '13px 15px',
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 16,
          color: 'var(--uv-text)',
          outline: 'none',
          transition: 'border-color 120ms',
          width: '100%',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => {
          if (!error) e.currentTarget.style.borderColor = 'var(--uv-gold)';
        }}
        onBlur={(e) => {
          if (!error && !active) e.currentTarget.style.borderColor = 'var(--uv-border-strong)';
        }}
      />
      {error && (
        <span style={{ fontSize: 12, color: 'var(--uv-danger)', marginTop: 2 }}>{error}</span>
      )}
      <style>{`
        [data-uv-input="${id}"]::placeholder {
          color: var(--uv-text-invisible);
          font-style: italic;
        }
        [data-uv-input="${id}"]:focus-visible {
          outline: 2px solid var(--uv-gold);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

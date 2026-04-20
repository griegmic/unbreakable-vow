'use client';

import React from 'react';

interface PrimaryButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function PrimaryButton({
  onClick,
  children,
  className,
  disabled = false,
  loading = false,
  type = 'button',
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={{
        width: '100%',
        padding: '14px 20px',
        borderRadius: 'var(--uv-radius-md)',
        border: 'none',
        background: disabled ? 'var(--uv-bg-selected)' : 'var(--uv-gold)',
        color: disabled ? 'var(--uv-text-faint)' : 'var(--uv-text-on-gold)',
        fontSize: '14px',
        fontWeight: 500,
        lineHeight: 1.2,
        fontFamily: 'var(--uv-font-sans)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 120ms, box-shadow 120ms, transform 120ms',
        position: 'relative',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = 'var(--uv-gold-bright)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = 'var(--uv-gold)';
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = 'var(--uv-gold-deep)';
          e.currentTarget.style.boxShadow = 'var(--uv-shadow-gold-press)';
          e.currentTarget.style.transform = 'scale(0.985)';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = 'var(--uv-gold-bright)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'scale(1)';
        }
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
      {loading ? (
        <>
          <style>{`@keyframes uv-spin{to{transform:rotate(360deg)}}`}</style>
          <span
            style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid var(--uv-text-on-gold)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'uv-spin 600ms linear infinite',
            }}
          />
        </>
      ) : (
        children
      )}
    </button>
  );
}

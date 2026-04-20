'use client';

import React from 'react';

type CardVariant = 'default' | 'elevated' | 'warn';

interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ variant = 'default', children, className, onClick }: CardProps) {
  const baseStyles: React.CSSProperties = {
    padding: 20,
    borderRadius: 'var(--uv-radius-2xl)',
    border: '1px solid var(--uv-border-strong)',
    background: 'var(--uv-bg-card)',
  };

  if (variant === 'elevated') {
    baseStyles.background = 'var(--uv-bg-elev)';
    baseStyles.boxShadow = 'var(--uv-shadow-md)';
  } else if (variant === 'warn') {
    baseStyles.background = 'var(--uv-warn-bg)';
    baseStyles.borderColor = 'var(--uv-warn-border)';
  }

  if (onClick) {
    baseStyles.cursor = 'pointer';
  }

  return (
    <div
      style={baseStyles}
      className={className}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--uv-shadow-lg)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.boxShadow =
            variant === 'elevated' ? 'var(--uv-shadow-md)' : 'none';
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
}

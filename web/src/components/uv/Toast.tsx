'use client';

import React, { useEffect, useState } from 'react';

type ToastVariant = 'success' | 'error' | 'neutral';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onDismiss?: () => void;
}

const keyframes = `
@keyframes uv-toast-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

export function Toast({ message, variant = 'neutral', duration, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  const autoDuration = duration ?? 3000;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoDuration);
    return () => clearTimeout(timer);
  }, [autoDuration, onDismiss]);

  if (!visible) return null;

  return (
    <>
      <style>{keyframes}</style>
      <div
        role="status"
        aria-live={variant === 'error' ? 'assertive' : 'polite'}
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 'var(--uv-z-toast)' as any,
          background: 'var(--uv-bg-elevated)',
          border: '1px solid var(--uv-border-strong)',
          borderRadius: 'var(--uv-radius-md)',
          padding: '12px 16px',
          fontSize: 13,
          fontFamily: 'var(--uv-font-sans)',
          color: 'var(--uv-text-muted)',
          animation: 'uv-toast-in 240ms ease',
          whiteSpace: 'nowrap',
        }}
      >
        {message}
      </div>
    </>
  );
}

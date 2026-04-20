'use client';

import React, { useEffect } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const keyframes = `
@keyframes uv-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes uv-slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
`;

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <style>{keyframes}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 'var(--uv-z-backdrop)' as any,
          background: 'var(--uv-bg-overlay)',
          animation: 'uv-fadeIn 240ms ease',
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 'var(--uv-z-modal)' as any,
          background: 'var(--uv-bg-elev)',
          border: '1px solid var(--uv-border-strong)',
          borderRadius: '22px 22px 0 0',
          padding: '16px 16px 14px',
          boxShadow: 'var(--uv-shadow-sheet)',
          animation: 'uv-slideUp 240ms var(--uv-ease-out)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            width: 36,
            height: 3,
            background: 'var(--uv-border-strong)',
            borderRadius: 'var(--uv-radius-pill)',
            margin: '0 auto 14px',
          }}
        />
        {children}
      </div>
    </>
  );
}

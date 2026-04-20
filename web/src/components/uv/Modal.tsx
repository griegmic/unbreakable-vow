'use client';

import React, { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
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
@keyframes uv-scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
`;

export function Modal({ open, onClose, children, title }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <>
      <style>{keyframes}</style>
      {/* Backdrop */}
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
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed',
          zIndex: 'var(--uv-z-modal)' as any,
          background: 'var(--uv-bg-elev)',
          border: '1px solid var(--uv-border-strong)',
          boxShadow: 'var(--uv-shadow-lg)',
          // Mobile: bottom sheet style
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: '22px 22px 0 0',
          padding: '16px 16px 14px',
          animation: 'uv-slideUp 240ms var(--uv-ease-out)',
        }}
        className="uv-modal-dialog"
      >
        {/* Handle for mobile */}
        <div
          className="uv-modal-handle"
          style={{
            width: 36,
            height: 3,
            background: 'var(--uv-border-strong)',
            borderRadius: 'var(--uv-radius-pill)',
            margin: '0 auto 14px',
          }}
        />
        {title && (
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--uv-text-muted)',
              fontFamily: 'var(--uv-font-sans)',
              margin: '0 0 12px',
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
      <style>{`
        @media (min-width: 640px) {
          .uv-modal-dialog {
            bottom: auto !important;
            left: 50% !important;
            right: auto !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            max-width: 420px !important;
            width: calc(100% - 40px) !important;
            border-radius: var(--uv-radius-2xl) !important;
            padding: 20px !important;
            animation: uv-scaleIn 240ms var(--uv-ease-out) !important;
          }
          .uv-modal-handle {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

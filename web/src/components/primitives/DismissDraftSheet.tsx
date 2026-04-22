'use client';

interface DismissDraftSheetProps {
  onSaveAndExit: () => void;
  onStay: () => void;
}

export function DismissDraftSheet({ onSaveAndExit, onStay }: DismissDraftSheetProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div onClick={onStay} style={{ position: 'absolute', inset: 0, background: 'var(--uv-bg-overlay)' }} />
      <div
        className="animate-slide-up"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          borderRadius: '24px 24px 0 0',
          background: 'var(--uv-bg-card)',
          border: '1px solid var(--uv-border)',
          borderBottom: 'none',
          padding: '24px 22px 40px',
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 16,
          textAlign: 'center' as const,
        }}
      >
        <h2 style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 22, fontWeight: 500, fontStyle: 'italic', color: 'var(--uv-text)', margin: 0 }}>
          Leave this vow?
        </h2>
        <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 15, color: 'var(--uv-text-muted)', margin: 0 }}>
          Your draft will be saved.
        </p>
        <button
          onClick={onSaveAndExit}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(180deg, var(--uv-gold-bright) 0%, var(--uv-gold) 60%, var(--uv-gold-deep) 100%)',
            color: 'var(--uv-text-on-gold)',
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 16,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Save & exit
        </button>
        <button
          onClick={onStay}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--uv-text-dim)',
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            padding: '8px 0',
          }}
        >
          Stay
        </button>
      </div>
    </div>
  );
}

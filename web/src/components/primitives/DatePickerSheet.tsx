'use client';

interface DatePickerSheetProps {
  value: Date;
  min: Date;
  max: Date;
  onConfirm: (date: Date) => void;
  onDismiss: () => void;
}

export function DatePickerSheet({ value, min, max, onConfirm, onDismiss }: DatePickerSheetProps) {
  const toInputValue = (d: Date) => d.toISOString().split('T')[0];

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
      {/* Scrim */}
      <div
        onClick={onDismiss}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--uv-bg-overlay)',
        }}
      />
      {/* Sheet */}
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
          gap: 20,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 22,
            fontWeight: 500,
            fontStyle: 'italic',
            color: 'var(--uv-text)',
            margin: 0,
          }}
        >
          Verdict by when?
        </h2>
        <input
          type="date"
          defaultValue={toInputValue(value)}
          min={toInputValue(min)}
          max={toInputValue(max)}
          onChange={(e) => {
            if (e.target.value) onConfirm(new Date(e.target.value + 'T21:00:00'));
          }}
          style={{
            width: '100%',
            height: 48,
            padding: '0 16px',
            borderRadius: 14,
            border: '1px solid var(--uv-border)',
            background: 'var(--uv-bg-input)',
            color: 'var(--uv-text)',
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 16,
            colorScheme: 'dark',
          }}
        />
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--uv-text-dim)',
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 14,
            cursor: 'pointer',
            padding: '8px 0',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

'use client';

interface WaxSealProps {
  monogram?: string;
  size?: 'sm' | 'md' | 'lg';
  showHalo?: boolean;
  showCheck?: boolean;
}

const SIZES = { sm: 64, md: 96, lg: 112 } as const;

export function WaxSeal({ monogram = 'UV', size = 'lg', showHalo = true, showCheck = false }: WaxSealProps) {
  const px = SIZES[size];
  const checkSize = Math.round(px * 0.32);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: px, height: px }}>
      {showHalo && (
        <div
          className="absolute inset-0 rounded-full animate-halo"
          style={{
            boxShadow: '0 0 14px var(--uv-gold-glow)',
            background: 'transparent',
          }}
        />
      )}
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: px,
          height: px,
          background: 'linear-gradient(135deg, var(--uv-gold-bright), var(--uv-gold), var(--uv-gold-deep))',
          boxShadow: '0 0 14px rgba(200, 155, 60, 0.32)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontSize: px * 0.4,
            fontWeight: 600,
            color: 'var(--uv-text-on-gold)',
            letterSpacing: '0.06em',
          }}
        >
          {monogram}
        </span>
      </div>
      {showCheck && (
        <div
          className="absolute animate-check-bounce flex items-center justify-center rounded-full"
          style={{
            width: checkSize,
            height: checkSize,
            bottom: -2,
            right: -2,
            background: 'var(--uv-imessage)',
            border: '2px solid var(--uv-bg)',
          }}
        >
          <svg width={checkSize * 0.5} height={checkSize * 0.5} viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

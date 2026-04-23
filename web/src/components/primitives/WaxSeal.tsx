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
  const haloInset = -Math.round(px * 0.25);

  return (
    <div style={{ position: 'relative', width: px, height: px, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Breathing halo — radial gradient around seal */}
      {showHalo && (
        <div
          className="animate-halo"
          style={{
            position: 'absolute',
            inset: haloInset,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,182,86,0.22), transparent 62%)',
          }}
        />
      )}
      {/* Wax seal — matches mock's radial gradient + layered shadows */}
      <div
        style={{
          position: 'relative',
          width: px,
          height: px,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 22%, #F2C766 0%, #E8B656 30%, #C89B3C 62%, #8B6820 100%)',
          boxShadow: [
            '0 3px 0 rgba(255,228,150,0.35) inset',
            '0 -3px 12px rgba(139,104,32,0.65) inset',
            '0 14px 40px rgba(200,155,60,0.32)',
            '0 0 0 1px rgba(139,104,32,0.45)',
          ].join(', '),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Inner rim — reads as wax edge */}
        <div
          style={{
            position: 'absolute',
            inset: 6,
            borderRadius: '50%',
            border: '1px solid rgba(139,104,32,0.28)',
            pointerEvents: 'none',
          }}
        />
        {/* Monogram */}
        <span
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontVariationSettings: '"opsz" 144',
            fontSize: px * 0.39,
            fontWeight: 600,
            fontStyle: 'italic',
            color: '#1A1205',
            letterSpacing: '-0.03em',
            position: 'relative',
          }}
        >
          {monogram}
        </span>
      </div>
      {/* Green ✓ badge */}
      {showCheck && (
        <div
          className="animate-check-bounce"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: checkSize,
            height: checkSize,
            borderRadius: '50%',
            background: 'var(--uv-imessage)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: checkSize * 0.5,
            fontWeight: 700,
            border: '4px solid var(--uv-bg)',
            boxShadow: '0 4px 14px rgba(52,199,89,0.42)',
          }}
        >
          ✓
        </div>
      )}
    </div>
  );
}

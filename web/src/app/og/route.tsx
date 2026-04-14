import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0A0F',
          padding: '60px 80px',
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            color: '#C8A84E',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textAlign: 'center',
            marginBottom: 40,
            display: 'flex',
          }}
        >
          UNBREAKABLE VOW
        </div>

        {/* Headline line 1 */}
        <div
          style={{
            color: '#FFFFFF',
            fontSize: 52,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.1,
            display: 'flex',
          }}
        >
          Make a vow.
        </div>

        {/* Headline line 2 — gold */}
        <div
          style={{
            color: '#C8A84E',
            fontSize: 52,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.1,
            marginBottom: 28,
            display: 'flex',
          }}
        >
          Mean it.
        </div>

        {/* Subline */}
        <div
          style={{
            color: '#999999',
            fontSize: 22,
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.4,
            display: 'flex',
          }}
        >
          Put money on it. Break it, it goes to charity.
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=604800',
      },
    }
  );
}

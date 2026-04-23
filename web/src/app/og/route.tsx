import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * Generic OG card — used for site-level sharing (homepage, etc.)
 * V6 tokens applied.
 */
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
          backgroundColor: '#0F0D0A',
          backgroundImage: 'radial-gradient(ellipse at center, #1F1B16 0%, #0F0D0A 70%)',
          padding: '60px 80px',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            color: '#C89B3C',
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
            color: '#F0E9DB',
            fontSize: 52,
            fontWeight: 700,
            fontStyle: 'italic',
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
            color: '#C89B3C',
            fontSize: 52,
            fontWeight: 700,
            fontStyle: 'italic',
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
            color: '#A49A85',
            fontSize: 22,
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.4,
            display: 'flex',
          }}
        >
          One sentence. One witness. One stake. One verdict.
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

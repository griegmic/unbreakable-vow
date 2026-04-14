import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '\u2026';
}

function renderImage(
  makerName: string,
  vowText: string | null,
  verdict: 'kept' | 'broken' | null,
  stakeAmount: number,
  witnessName: string,
) {
  const isResolved = verdict !== null;
  const isKept = verdict === 'kept';
  const headline = !isResolved
    ? `${makerName} made a vow.`
    : isKept
      ? `${makerName} kept their word.`
      : `${makerName} broke their vow.`;
  const stampText = !isResolved ? 'SEALED' : isKept ? 'VOW KEPT' : 'VOW BROKEN';
  const stampColor = !isResolved ? '#C8A84E' : isKept ? '#C8A84E' : '#C85050';
  const stakeLabel = stakeAmount > 0
    ? isKept
      ? `$${Math.round(stakeAmount / 100)} protected`
      : `$${Math.round(stakeAmount / 100)} forfeited`
    : null;

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
          padding: '44px 80px',
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
            marginBottom: 24,
            display: 'flex',
          }}
        >
          UNBREAKABLE VOW
        </div>

        {/* Certificate container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1.5px solid rgba(200,168,78,0.25)',
            borderRadius: 16,
            padding: '32px 48px',
            maxWidth: 960,
            width: '100%',
          }}
        >
          {/* Stamp */}
          <div
            style={{
              color: stampColor,
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textAlign: 'center',
              marginBottom: 8,
              display: 'flex',
            }}
          >
            {stampText}
          </div>

          {/* Headline */}
          <div
            style={{
              color: '#FFFFFF',
              fontSize: 26,
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: 16,
              display: 'flex',
            }}
          >
            {headline}
          </div>

          {/* Vow text */}
          {vowText && (
            <div
              style={{
                color: '#AAAAAA',
                fontSize: 20,
                textAlign: 'center',
                maxWidth: 800,
                lineHeight: 1.4,
                marginBottom: 16,
                display: 'flex',
              }}
            >
              {`\u201C${vowText}\u201D`}
            </div>
          )}

          {/* Witness + stake line */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                color: '#888888',
                fontSize: 16,
                display: 'flex',
              }}
            >
              Witnessed by {witnessName}
            </div>
            {stakeLabel && (
              <>
                <div style={{ color: '#444444', fontSize: 16, display: 'flex' }}>{'\u00B7'}</div>
                <div
                  style={{
                    color: '#888888',
                    fontSize: 16,
                    display: 'flex',
                  }}
                >
                  {stakeLabel}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
    }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vowId: string }> }
) {
  const { vowId } = await params;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return renderImage('Someone', null, null, 0, 'a friend');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: vow } = await supabase
      .from('vows')
      .select('refined_text, verdict, stake_amount, witness_name, user_id, status')
      .eq('id', vowId)
      .single();

    if (!vow) {
      return renderImage('Someone', null, null, 0, 'a friend');
    }

    // Fetch maker name
    let makerName = 'Someone';
    if (vow.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', vow.user_id)
        .single();
      if (user?.display_name) {
        makerName = user.display_name.split(' ')[0];
      }
    }

    const verdict = ['kept', 'broken'].includes(vow.status)
      ? (vow.verdict as 'kept' | 'broken')
      : null;

    return renderImage(
      makerName,
      truncate(vow.refined_text || '', 80),
      verdict,
      vow.stake_amount || 0,
      vow.witness_name || 'a friend',
    );
  } catch {
    return renderImage('Someone', null, null, 0, 'a friend');
  }
}

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
  verdict: 'kept' | 'broken',
  stakeAmount: number,
  destination: string,
) {
  const isKept = verdict === 'kept';
  const headline = isKept
    ? `${makerName} kept their word.`
    : `${makerName} broke their vow.`;
  const stakeLine = stakeAmount > 0
    ? isKept
      ? `$${Math.round(stakeAmount / 100)} protected.`
      : `$${Math.round(stakeAmount / 100)} to ${destination}.`
    : null;

  const accentColor = isKept ? '#52D69A' : '#C85050';
  const stampColor = isKept ? '#C8A84E' : '#C85050';

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
          padding: '50px 80px',
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
            marginBottom: 28,
            display: 'flex',
          }}
        >
          UNBREAKABLE VOW
        </div>

        {/* Verdict stamp */}
        <div
          style={{
            color: stampColor,
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textAlign: 'center',
            marginBottom: 12,
            display: 'flex',
          }}
        >
          {isKept ? 'VOW KEPT' : 'VOW BROKEN'}
        </div>

        {/* Headline — personalized */}
        <div
          style={{
            color: '#FFFFFF',
            fontSize: 28,
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: 20,
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
              fontSize: 22,
              textAlign: 'center',
              maxWidth: 900,
              lineHeight: 1.4,
              marginBottom: stakeLine ? 20 : 0,
              display: 'flex',
            }}
          >
            {`\u201C${vowText}\u201D`}
          </div>
        )}

        {/* Stake line */}
        {stakeLine && (
          <div
            style={{
              color: accentColor,
              fontSize: 20,
              fontWeight: 600,
              textAlign: 'center',
              display: 'flex',
            }}
          >
            {stakeLine}
          </div>
        )}
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
      return renderImage('Someone', null, 'kept', 0, '');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: vow } = await supabase
      .from('vows')
      .select('refined_text, verdict, stake_amount, destination, user_id')
      .eq('id', vowId)
      .single();

    if (!vow || !vow.verdict) {
      return renderImage('Someone', null, 'kept', 0, '');
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

    return renderImage(
      makerName,
      truncate(vow.refined_text || '', 80),
      vow.verdict as 'kept' | 'broken',
      vow.stake_amount || 0,
      vow.destination || 'charity',
    );
  } catch {
    return renderImage('Someone', null, 'kept', 0, '');
  }
}

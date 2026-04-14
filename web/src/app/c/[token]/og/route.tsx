import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '\u2026';
}

function renderImage(
  makerName: string | null,
  vowText: string | null,
  stakeAmount: number,
) {
  const dareLine = makerName
    ? `${makerName} doesn\u2019t think you can`
    : 'You\u2019ve been challenged';

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
        {/* Brand mark — small, stays out of the way */}
        <div
          style={{
            color: '#C8A84E',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textAlign: 'center',
            marginBottom: 32,
            display: 'flex',
          }}
        >
          UNBREAKABLE VOW
        </div>

        {/* HERO: The dare line — biggest text on the image */}
        <div
          style={{
            color: '#FFFFFF',
            fontSize: 38,
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: 20,
            display: 'flex',
          }}
        >
          {dareLine}
        </div>

        {/* Vow text — prominent */}
        {vowText && (
          <div
            style={{
              color: '#FFFFFF',
              fontSize: 26,
              textAlign: 'center',
              maxWidth: 900,
              lineHeight: 1.4,
              marginBottom: 24,
              display: 'flex',
            }}
          >
            {`\u201C${vowText}\u201D`}
          </div>
        )}

        {/* Stake amount — gold, adds weight */}
        {stakeAmount > 0 && (
          <div
            style={{
              color: '#C8A84E',
              fontSize: 22,
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: 16,
              display: 'flex',
            }}
          >
            {`$${Math.round(stakeAmount / 100)} on the line`}
          </div>
        )}

        {/* CTA — readable */}
        <div
          style={{
            color: '#888888',
            fontSize: 22,
            textAlign: 'center',
            display: 'flex',
          }}
        >
          Accept or back down.
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
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return renderImage(null, null, 0);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: vow } = await supabase
      .from('vows')
      .select('refined_text, stake_amount, user_id')
      .eq('challenge_invite_token', token)
      .single();

    if (!vow) {
      return renderImage(null, null, 0);
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
      vow.stake_amount || 0,
    );
  } catch {
    return renderImage(null, null, 0);
  }
}

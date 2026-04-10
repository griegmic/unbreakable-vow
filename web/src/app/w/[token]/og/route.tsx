import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '\u2026';
}

function renderImage(
  witnessName: string | null,
  makerName: string | null,
  vowText: string | null,
  stakeAmount: number,
) {
  const stakeLabel = stakeAmount > 0
    ? `$${Math.round(stakeAmount / 100)} is on the line.`
    : 'Their word is on the line.';

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
        {/* Title */}
        <div
          style={{
            color: '#C8A84E',
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textAlign: 'center',
            display: 'flex',
          }}
        >
          AN UNBREAKABLE VOW
        </div>

        {/* Gold separator line */}
        <div
          style={{
            width: 120,
            height: 2,
            backgroundColor: '#C8A84E',
            marginTop: 24,
            marginBottom: 32,
            display: 'flex',
          }}
        />

        {/* Witness callout */}
        <div
          style={{
            color: '#FFFFFF',
            fontSize: 24,
            textAlign: 'center',
            marginBottom: 16,
            display: 'flex',
          }}
        >
          {witnessName
            ? `${witnessName}, you've been named as a witness`
            : 'You\'ve been named as a witness'}
        </div>

        {/* Vow text */}
        {vowText && (
          <div
            style={{
              color: '#FFFFFF',
              fontSize: 28,
              textAlign: 'center',
              maxWidth: 900,
              lineHeight: 1.4,
              marginBottom: 16,
              display: 'flex',
            }}
          >
            {`\u201C${vowText}\u201D`}
          </div>
        )}

        {/* Maker + stakes */}
        <div
          style={{
            color: '#888888',
            fontSize: 18,
            textAlign: 'center',
            display: 'flex',
          }}
        >
          {makerName ? `${makerName} needs you. ${stakeLabel}` : stakeLabel}
        </div>

        {/* Domain */}
        <div
          style={{
            color: '#666666',
            fontSize: 12,
            position: 'absolute',
            bottom: 24,
            display: 'flex',
          }}
        >
          unbreakablevow.app
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
      return renderImage(null, null, null, 0);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: vow } = await supabase
      .from('vows')
      .select('refined_text, witness_name, stake_amount, user_id')
      .eq('witness_invite_token', token)
      .single();

    if (!vow) {
      return renderImage(null, null, null, 0);
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
        makerName = user.display_name.split(' ')[0]; // first name
      }
    }

    const vowText = truncate(vow.refined_text || '', 80);

    return renderImage(
      vow.witness_name || null,
      makerName,
      vowText,
      vow.stake_amount || 0,
    );
  } catch {
    return renderImage(null, null, null, 0);
  }
}

import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const frauncesFont = fetch(
  'https://fonts.gstatic.com/s/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58njr1603gg7S2nfgRYIctxujDg.ttf'
).then(res => res.arrayBuffer()).catch(() => null);

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '\u2026';
}

async function renderImage(
  makerName: string,
  vowText: string | null,
  verdict: 'kept' | 'broken' | null,
  stakeAmount: number,
  witnessName: string,
) {
  const fraunces = await frauncesFont;
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
          justifyContent: 'space-between',
          backgroundColor: '#0D0B08',
          backgroundImage: 'radial-gradient(circle at 18% 12%, rgba(218,174,78,0.18), transparent 30%), linear-gradient(180deg, #15110D 0%, #080706 100%)',
          padding: '56px 68px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #F0C85B, #C79A34)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#090806', fontSize: 14, fontWeight: 900 }}>
              UV
            </div>
            <div style={{ color: '#B8AD98', fontSize: 20, fontWeight: 650, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'flex' }}>
              Unbreakable Vow
            </div>
          </div>
          <div style={{ color: stampColor, border: `1px solid ${isKept ? 'rgba(218,174,78,0.42)' : 'rgba(200,80,80,0.46)'}`, borderRadius: 999, padding: '10px 18px', fontSize: 18, fontWeight: 850, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex' }}>
            {stampText}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 980,
            width: '100%',
          }}
        >
          <div
            style={{
              color: '#F3EEE3',
              fontFamily: 'Fraunces',
              fontSize: 66,
              fontWeight: 400,
              lineHeight: 0.96,
              marginBottom: 22,
              display: 'flex',
            }}
          >
            {headline}
          </div>

          {/* Vow text */}
          {vowText && (
            <div
              style={{
                color: '#D9CDB8',
                fontFamily: 'Fraunces',
                fontSize: 35,
                lineHeight: 1.18,
                marginBottom: 18,
                display: 'flex',
              }}
            >
              {`\u201C${vowText}\u201D`}
            </div>
          )}

          <div style={{ color: '#B8AD98', fontSize: 24, fontWeight: 700, lineHeight: 1.2, display: 'flex' }}>
            Witnessed by {witnessName}{stakeLabel ? ` \u00B7 ${stakeLabel}` : ''}
          </div>
        </div>

        <div style={{ width: '100%', borderTop: '1px solid rgba(218,174,78,0.24)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#9D927F', fontSize: 22, fontWeight: 650, display: 'flex' }}>The receipt of a word kept in public.</div>
          <div style={{ background: 'linear-gradient(180deg, #EAC157, #C79631)', color: '#090806', borderRadius: 999, padding: '18px 28px', fontSize: 25, fontWeight: 900, display: 'flex' }}>View certificate →</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fraunces
        ? [{ name: 'Fraunces', data: fraunces, style: 'normal', weight: 400 }]
        : undefined,
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

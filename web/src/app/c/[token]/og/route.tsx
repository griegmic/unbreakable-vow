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

function firstName(value: string | null | undefined, fallback = 'Someone'): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0] || fallback;
}

function formatDeadline(value: string | null | undefined): string {
  if (!value) return 'You choose the verdict day';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'You choose the verdict day';
  return `Verdict ${date.toLocaleDateString('en-US', { weekday: 'short' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

async function renderImage(
  makerName: string | null,
  vowText: string | null,
  stakeAmount: number,
  destination?: string | null,
  endsAt?: string | null,
) {
  const fraunces = await frauncesFont;
  const maker = firstName(makerName, 'Someone');
  const stake = stakeAmount > 0 ? `$${Math.round(stakeAmount / 100)}` : '$0';
  const consequence = stakeAmount > 0 && destination
    ? `${stake} \u2192 ${destination} if you miss`
    : stakeAmount > 0
      ? `${stake} on you keeping it`
      : 'Your reputation is on it';

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
          backgroundImage: 'radial-gradient(circle at 85% 20%, rgba(255,136,55,0.16), transparent 28%), linear-gradient(180deg, #15110D 0%, #080706 100%)',
          padding: '58px 68px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #F0C85B, #C79A34)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#090806',
              fontSize: 14,
              fontWeight: 900,
            }}>
              UV
            </div>
            <div style={{
              color: '#B8AD98',
              fontSize: 20,
              fontWeight: 650,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              display: 'flex',
            }}>
              Unbreakable Vow
            </div>
          </div>

          <div style={{
            border: '1px solid rgba(255,136,55,0.48)',
            borderRadius: 999,
            padding: '10px 18px',
            color: '#FF9448',
            fontSize: 18,
            fontWeight: 850,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            display: 'flex',
          }}>
            Dare sent
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 960 }}>
          <div style={{
            color: '#F3EEE3',
            fontFamily: 'Fraunces',
            fontSize: 66,
            fontWeight: 400,
            lineHeight: 0.96,
            letterSpacing: 0,
            display: 'flex',
            marginBottom: 22,
          }}>
            {maker} dared you.
          </div>
          <div style={{
            color: '#D9CDB8',
            fontFamily: 'Fraunces',
            fontSize: 35,
            fontWeight: 400,
            lineHeight: 1.18,
            display: 'flex',
            maxWidth: 980,
            marginBottom: 18,
          }}>
            {vowText ? `\u201C${truncate(vowText, 94)}\u201D` : 'Take the vow or pass.'}
          </div>
          <div style={{
            color: '#B8AD98',
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.2,
            display: 'flex',
          }}>
            Accept it. Stake your word. Follow through or pay.
          </div>
        </div>

        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(218,174,78,0.24)',
          paddingTop: 28,
          gap: 28,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: '#E6B94C', fontSize: 34, fontWeight: 850, display: 'flex' }}>{consequence}</div>
            <div style={{ color: '#9D927F', fontSize: 24, fontWeight: 600, display: 'flex' }}>{formatDeadline(endsAt)}</div>
          </div>
          <div style={{
            background: 'linear-gradient(180deg, #EAC157, #C79631)',
            color: '#090806',
            borderRadius: 999,
            padding: '20px 30px',
            fontSize: 28,
            fontWeight: 900,
            display: 'flex',
            whiteSpace: 'nowrap',
          }}>
            Accept the dare →
          </div>
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
      .select('refined_text, stake_amount, destination, ends_at, user_id')
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
      vow.destination,
      vow.ends_at,
    );
  } catch {
    return renderImage(null, null, 0);
  }
}

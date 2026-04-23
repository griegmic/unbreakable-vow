import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * V6 OG Card Route — per-vow server-rendered Open Graph images
 *
 * Endpoint: GET /api/og/[token]
 * Returns: 1200×630 PNG
 * Used by: /w/[token] (witness invite), /c/[token] (challenge), /outcome/[vowId], /certificate/[vowId]
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in the environment to render personalized
 * vow content. Without it, renders a generic fallback card. This is a compromise —
 * the personalized render is the real product experience; the fallback prevents 500s
 * in environments where the key isn't configured (local dev without service role).
 *
 * Canonical source: IMPLEMENTATION-V6.md §4.2
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Attempt personalized render; fall back to generic if Supabase is unavailable
  let vowText = 'Make an unbreakable vow.';
  let makerName = 'Someone';
  let stake = 0;
  let eyebrow = 'UNBREAKABLE VOW';
  let metaLine = 'One sentence. One witness. One stake. One verdict.';

  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: vow } = await supabase
        .from('vows')
        .select('refined_text, stake_amount, ends_at, witness_name, user_id, verdict, status, consequence, destination')
        .or(`witness_invite_token.eq.${token},challenge_invite_token.eq.${token}`)
        .single();

      if (vow) {
        vowText = vow.refined_text || vowText;
        stake = vow.stake_amount ? Math.round(vow.stake_amount / 100) : 0;

        // Fetch maker display name
        if (vow.user_id) {
          const { data: user } = await supabase
            .from('users')
            .select('display_name')
            .eq('id', vow.user_id)
            .single();
          if (user?.display_name) makerName = user.display_name;
        }

        // Select copy based on state
        eyebrow = `${makerName.toUpperCase()} · UNBREAKABLE VOW`;
        metaLine = stake > 0 ? `$${stake} on it · Be the witness` : 'Be the witness';

        if (vow.verdict != null) {
          const isKept = vow.verdict === 'kept';
          eyebrow = isKept ? 'VOW KEPT' : 'VOW BROKEN';
          metaLine = isKept
            ? `${makerName} kept the vow.`
            : `${makerName} broke the vow. $${stake} → ${vow.destination || 'charity'}`;
        }
      }
    } catch {
      // Supabase query failed — render generic fallback
    }
  }

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
        {/* Wax seal monogram */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E8B656, #C89B3C, #8B6820)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            boxShadow: '0 0 40px rgba(200, 155, 60, 0.28)',
          }}
        >
          <div
            style={{
              color: '#1A1205',
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: '0.08em',
              display: 'flex',
            }}
          >
            UV
          </div>
        </div>

        {/* Eyebrow */}
        <div
          style={{
            color: '#C89B3C',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textAlign: 'center',
            marginBottom: 24,
            display: 'flex',
          }}
        >
          {eyebrow}
        </div>

        {/* Vow text */}
        <div
          style={{
            color: '#F0E9DB',
            fontSize: 40,
            fontWeight: 500,
            fontStyle: 'italic',
            textAlign: 'center',
            lineHeight: 1.3,
            maxWidth: 900,
            marginBottom: 24,
            display: 'flex',
          }}
        >
          {vowText.length > 120 ? vowText.slice(0, 117) + '...' : vowText}
        </div>

        {/* Meta line */}
        <div
          style={{
            color: '#A49A85',
            fontSize: 20,
            textAlign: 'center',
            lineHeight: 1.4,
            display: 'flex',
          }}
        >
          {metaLine}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}

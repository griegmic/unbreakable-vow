import { createClient } from '@supabase/supabase-js';
import VerdictClient from './client';
import VerdictNotFound from './not-found-client';

interface Props {
  params: Promise<{ token: string }>;
}

function isPhoneLikeName(value: string | null | undefined): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length >= value.replace(/\s/g, '').length - 2;
}

function cleanPersonName(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed || isPhoneLikeName(trimmed)) return fallback;
  return trimmed;
}

export default async function VerdictPage({ params }: Props) {
  const { token } = await params;
  // Use service role key — RLS witness policies were removed for security.
  // This runs server-side only; SUPABASE_SERVICE_ROLE_KEY is never exposed to browser.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: vow, error: vowError } = await supabase
    .from('vows')
    .select('id, refined_text, stake_amount, destination, witness_name, status, verdict, user_id, vow_type, target_user_id, ends_at')
    .eq('witness_invite_token', token)
    .single();

  if (vowError || !vow) {
    console.error('[VerdictPage] vow lookup failed:', vowError?.message, 'token:', token);
    return <VerdictNotFound token={token} />;
  }

  // Block verdict UI for vows that aren't ready for judgment yet
  if (['draft', 'sealed'].includes(vow.status)) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--uv-bg)' }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <h1 style={{ fontSize: 24, fontFamily: 'var(--uv-font-serif)', fontWeight: 700, marginBottom: 8, color: 'var(--uv-text)' }}>Not ready yet</h1>
          <p style={{ fontSize: 15, color: 'var(--uv-text-muted)' }}>
            This vow hasn&apos;t reached its verdict date yet. You&apos;ll get a notification when it&apos;s time to judge.
          </p>
        </div>
      </div>
    );
  }

  // Get the vow maker's name for the reciprocity CTA
  let makerName = 'Your friend';
  if (vow.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', vow.user_id)
      .single();
    makerName = cleanPersonName(user?.display_name, 'Your friend');
  }

  // For challenge vows, get the target's name (the person being judged)
  let targetName = 'them';
  if (vow.vow_type === 'challenge' && vow.target_user_id) {
    const { data: targetUser } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', vow.target_user_id)
      .single();
    targetName = cleanPersonName(targetUser?.display_name, 'them');
  }

  if (vow.verdict) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--uv-bg)' }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <h1 style={{ fontSize: 24, fontFamily: 'var(--uv-font-serif)', fontWeight: 700, marginBottom: 8, color: 'var(--uv-text)' }}>Already decided</h1>
          <p style={{ fontSize: 15, color: 'var(--uv-text-muted)' }}>
            This vow has already been judged: <span style={{ fontWeight: 600, color: vow.verdict === 'kept' ? 'var(--uv-success)' : 'var(--uv-danger)' }}>{vow.verdict}</span>.
          </p>
        </div>
      </div>
    );
  }

  return <VerdictClient vow={vow} token={token} makerName={makerName} targetName={vow.vow_type === 'challenge' ? targetName : undefined} />;
}

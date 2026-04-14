import { createClient } from '@supabase/supabase-js';
import VerdictClient from './client';
import VerdictNotFound from './not-found-client';

interface Props {
  params: Promise<{ token: string }>;
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
    .select('id, refined_text, stake_amount, destination, witness_name, status, verdict, user_id, vow_type, target_user_id')
    .eq('witness_invite_token', token)
    .single();

  if (vowError || !vow) {
    console.error('[VerdictPage] vow lookup failed:', vowError?.message, 'token:', token);
    return <VerdictNotFound token={token} />;
  }

  // Block verdict UI for vows that aren't ready for judgment yet
  if (['draft', 'sealed'].includes(vow.status)) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center px-6">
          <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: 'var(--text)' }}>Not ready yet</h1>
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
            This vow hasn&apos;t reached its verdict date yet. You&apos;ll get a notification when it&apos;s time to judge.
          </p>
        </div>
      </div>
    );
  }

  // Get the vow maker's name for the reciprocity CTA
  let makerName = 'your friend';
  if (vow.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', vow.user_id)
      .single();
    if (user?.display_name) makerName = user.display_name;
  }

  // For challenge vows, get the target's name (the person being judged)
  let targetName = 'them';
  if (vow.vow_type === 'challenge' && vow.target_user_id) {
    const { data: targetUser } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', vow.target_user_id)
      .single();
    if (targetUser?.display_name) targetName = targetUser.display_name;
  }

  if (vow.verdict) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center px-6">
          <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: 'var(--text)' }}>Already decided</h1>
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
            This vow has already been judged: <span className="font-semibold" style={{ color: vow.verdict === 'kept' ? 'var(--success)' : 'var(--danger)' }}>{vow.verdict}</span>.
          </p>
        </div>
      </div>
    );
  }

  return <VerdictClient vow={vow} token={token} makerName={makerName} targetName={vow.vow_type === 'challenge' ? targetName : undefined} />;
}

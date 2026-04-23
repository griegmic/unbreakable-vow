import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import WitnessInviteClient from './client';
import WitnessTerminalClient from './terminal-client';
import WitnessNotFound from './not-found-client';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  // Use service role key — RLS witness policies were removed for security.
  // This runs server-side only; SUPABASE_SERVICE_ROLE_KEY is never exposed to browser.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: vow } = await supabase
    .from('vows')
    .select('refined_text, witness_name, stake_amount, user_id')
    .eq('witness_invite_token', token)
    .single();

  if (!vow) return { title: 'Unbreakable Vow' };

  // Fetch maker's first name for the preview
  let makerFirst = 'Someone';
  if (vow.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', vow.user_id)
      .single();
    if (user?.display_name) makerFirst = user.display_name.split(' ')[0];
  }

  const title = vow.stake_amount > 0
    ? `${makerFirst} put $${Math.round(vow.stake_amount / 100)} on the line. Will you hold them to it?`
    : `${makerFirst} made a vow. Will you hold them to it?`;
  const description = `"${vow.refined_text}"`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/w/${token}/og`, width: 1200, height: 630 }],
      type: 'website',
      siteName: 'Unbreakable Vow',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/w/${token}/og`],
    },
  };
}

export default async function WitnessInvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: vow, error: vowError } = await supabase
    .from('vows')
    .select('id, refined_text, stake_amount, destination, witness_name, witness_phone, witness_accepted_at, witness_declined, starts_at, ends_at, status, verdict, verdict_at, user_id')
    .eq('witness_invite_token', token)
    .single();

  if (vowError || !vow) {
    console.error('[WitnessInvitePage] vow lookup failed:', vowError?.message, 'token:', token);
    return <WitnessNotFound token={token} />;
  }

  // Draft vows now show full witness page — witnesses can accept even before
  // the maker finishes sealing. This converts witnesses while warm and creates
  // social pressure for the maker to complete.

  // Try to get the vow maker's display name and phone
  let makerName = 'Your friend';
  let makerPhone: string | null = null;
  if (vow.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('display_name, phone')
      .eq('id', vow.user_id)
      .single();
    if (user?.display_name) {
      makerName = user.display_name;
    }
    if (user?.phone) {
      makerPhone = user.phone;
    }
  }

  const stakeDollars = Math.round(vow.stake_amount / 100);

  // ── S19 Status-aware router — priority order (§3.2): ──
  // 1. witness_declined first: if the witness passed, that's their terminal state
  //    regardless of what happened to the vow afterward (voided, verdict by someone else).
  //    The witness's POV is "you sat this one out" — not the vow's outcome.
  //    Declined wins over voided: witness's action is their terminal state.
  //    Declined wins over verdict: witness didn't participate, so don't show an outcome they didn't author.
  // 2. verdict: if a verdict was recorded (by another witness, self-resolve, or auto-resolve),
  //    show the outcome. The witness arriving late should see what happened, not "expired."
  // 3. voided: maker pulled the vow. Nothing left to judge.
  // 4. active states: the witness can still act (accept or verdict).
  // 5. else: data inconsistency — show expired as a safe fallback.

  if (vow.witness_declined) {
    return <WitnessTerminalClient variant="declined" makerName={makerName} makerPhone={makerPhone} vow={vow} stakeDollars={stakeDollars} />;
  }

  if (vow.verdict != null) {
    return <WitnessTerminalClient variant="outcome-resolved" makerName={makerName} makerPhone={makerPhone} vow={vow} stakeDollars={stakeDollars} />;
  }

  if (vow.status === 'voided') {
    return <WitnessTerminalClient variant="voided" makerName={makerName} makerPhone={makerPhone} vow={vow} stakeDollars={stakeDollars} />;
  }

  if (['draft', 'sealed', 'active', 'awaiting_verdict'].includes(vow.status)) {
    return <WitnessInviteClient vow={vow} token={token} makerName={makerName} makerPhone={makerPhone} />;
  }

  // Data inconsistency / orphaned token — safe fallback
  return <WitnessTerminalClient variant="expired" makerName={makerName} makerPhone={makerPhone} vow={vow} stakeDollars={stakeDollars} />;
}

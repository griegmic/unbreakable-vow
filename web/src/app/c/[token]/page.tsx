import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import ChallengeInviteClient from './client';
import ChallengeNotFound from './not-found-client';

interface Props {
  params: Promise<{ token: string }>;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '...';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: vow } = await supabase
    .from('vows')
    .select('refined_text, stake_amount, user_id')
    .eq('challenge_invite_token', token)
    .single();

  if (!vow) return { title: 'Unbreakable Vow' };

  let makerName = 'Someone';
  if (vow.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', vow.user_id)
      .single();
    if (user?.display_name) {
      makerName = user.display_name;
    }
  }

  const description = `${makerName} doesn't think you can ${truncate(vow.refined_text, 60)}. Accept or back down.`;

  return {
    title: 'AN UNBREAKABLE VOW',
    description,
    openGraph: {
      title: 'AN UNBREAKABLE VOW',
      description,
      images: [{ url: `/c/${token}/og`, width: 1200, height: 630 }],
      type: 'website',
      siteName: 'Unbreakable Vow',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'AN UNBREAKABLE VOW',
      description,
      images: [`/c/${token}/og`],
    },
  };
}

export default async function ChallengeInvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: vow, error: vowError } = await supabase
    .from('vows')
    .select('id, refined_text, stake_amount, suggested_stake_amount, destination, witness_name, ends_at, sealed_at, status, user_id, challenge_status')
    .eq('challenge_invite_token', token)
    .single();

  if (vowError || !vow) {
    console.error('[ChallengeInvitePage] vow lookup failed:', vowError?.message, 'token:', token);
    return <ChallengeNotFound token={token} />;
  }

  // Get the vow maker's display name and phone
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

  return <ChallengeInviteClient vow={vow} token={token} makerName={makerName} makerPhone={makerPhone} />;
}

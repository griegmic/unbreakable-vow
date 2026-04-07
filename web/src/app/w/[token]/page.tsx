import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import WitnessInviteClient from './client';
import WitnessNotFound from './not-found-client';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: vow } = await supabase
    .from('vows')
    .select('refined_text, witness_name, stake_amount')
    .eq('witness_invite_token', token)
    .single();

  if (!vow) return { title: 'Unbreakable Vow' };

  return {
    title: `${vow.witness_name}, you've been named as a witness`,
    description: `"${vow.refined_text}" — $${vow.stake_amount / 100} is on the line. Accept your role as witness.`,
    openGraph: {
      title: `${vow.witness_name}, you've been named as a witness`,
      description: `"${vow.refined_text}" — $${vow.stake_amount / 100} is on the line.`,
    },
  };
}

export default async function WitnessInvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: vow, error: vowError } = await supabase
    .from('vows')
    .select('*')
    .eq('witness_invite_token', token)
    .single();

  if (vowError || !vow) {
    console.error('[WitnessInvitePage] vow lookup failed:', vowError?.message, 'token:', token);
    return <WitnessNotFound token={token} />;
  }

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

  return <WitnessInviteClient vow={vow} token={token} makerName={makerName} makerPhone={makerPhone} />;
}

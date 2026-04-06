import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import WitnessInviteClient from './client';

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

  if (!vow) return { title: 'Vow Not Found' };

  return {
    title: "You've been chosen as a witness",
    description: `"${vow.refined_text}" — $${vow.stake_amount / 100} is on the line. Accept your role as witness.`,
    openGraph: {
      title: "You've been chosen as a witness",
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

  const { data: vow } = await supabase
    .from('vows')
    .select('*')
    .eq('witness_invite_token', token)
    .single();

  if (!vow) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center px-6">
          <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: 'var(--text)' }}>Vow not found</h1>
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  return <WitnessInviteClient vow={vow} token={token} />;
}

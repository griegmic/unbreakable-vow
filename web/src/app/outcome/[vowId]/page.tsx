import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import OutcomeClient from './client';

interface Props {
  params: Promise<{ vowId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vowId } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: vow } = await supabase
    .from('vows')
    .select('refined_text, verdict, stake_amount, destination, witness_name')
    .eq('id', vowId)
    .single();

  if (!vow || !vow.verdict) {
    return { title: 'Unbreakable Vow' };
  }

  const isKept = vow.verdict === 'kept';
  const amount = Math.round(vow.stake_amount / 100);

  return {
    title: isKept ? 'Vow Kept' : 'Vow Broken',
    description: isKept
      ? `"${vow.refined_text}" — $${amount} protected. The vow was honored.`
      : `"${vow.refined_text}" — $${amount} to ${vow.destination}. The vow was broken.`,
    openGraph: {
      title: isKept ? 'Vow Kept' : 'Vow Broken',
      description: isKept
        ? `"${vow.refined_text}" — $${amount} protected.`
        : `"${vow.refined_text}" — $${amount} to ${vow.destination}.`,
      siteName: 'Unbreakable Vow',
    },
  };
}

export default async function OutcomePage({ params }: Props) {
  const { vowId } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: vow, error: vowError } = await supabase
    .from('vows')
    .select('id, refined_text, verdict, stake_amount, destination, witness_name')
    .eq('id', vowId)
    .single();

  if (vowError || !vow) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center px-6">
          <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: 'var(--text)' }}>Vow not found</h1>
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
            This vow doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  if (!vow.verdict) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center px-6">
          <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: 'var(--text)' }}>Verdict pending</h1>
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
            This vow hasn't been judged yet. Check back later.
          </p>
        </div>
      </div>
    );
  }

  return <OutcomeClient vow={vow} />;
}

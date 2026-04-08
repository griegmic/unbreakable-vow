import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import CertificateClient from './client';

interface Props {
  params: Promise<{ vowId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vowId } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: vow } = await supabase
    .from('vows')
    .select('refined_text, verdict, stake_amount, witness_name, status')
    .eq('id', vowId)
    .single();

  if (!vow) {
    return { title: 'Unbreakable Vow' };
  }

  const isResolved = ['kept', 'broken'].includes(vow.status);
  const title = isResolved
    ? `${vow.verdict === 'kept' ? 'Kept' : 'Broken'}: "${vow.refined_text}"`
    : `Unbreakable Vow: "${vow.refined_text}"`;
  const description = `Witnessed by ${vow.witness_name}. ${vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)} on the line.` : 'Accountability vow.'}`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  };
}

export default async function CertificatePage({ params }: Props) {
  const { vowId } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: vow, error } = await supabase
    .from('vows')
    .select('id, refined_text, verdict, stake_amount, destination, witness_name, status, sealed_at, verdict_at')
    .eq('id', vowId)
    .single();

  if (error || !vow) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#030508' }}>
        <div className="text-center px-6">
          <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: '#F5F5F5' }}>Vow not found</h1>
          <p className="text-[15px]" style={{ color: '#8B8B9E' }}>This vow doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return <CertificateClient vow={vow} />;
}

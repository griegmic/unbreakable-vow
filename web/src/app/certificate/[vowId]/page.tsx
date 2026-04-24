import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import CertificateClient from './client';

/**
 * Certificate page — §5.7
 *
 * Public shareable page for KEPT vows only.
 * Broken/non-kept vows redirect to /outcome/[vowId].
 *
 * TODO: We may revisit a "broken vow receipt" later if product asks.
 */

interface Props {
  params: Promise<{ vowId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vowId } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return { title: 'Unbreakable Vow — Certificate' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: vow } = await supabase
    .from('vows')
    .select('refined_text, verdict, stake_amount, witness_name, status')
    .eq('id', vowId)
    .single();

  if (!vow || vow.verdict !== 'kept') {
    return { title: 'Unbreakable Vow' };
  }

  const title = `Kept: "${vow.refined_text}"`;
  const description = `Witnessed by ${vow.witness_name}. ${vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)} protected.` : 'Accountability vow.'}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: `/certificate/${vowId}/og`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      images: [`/certificate/${vowId}/og`],
    },
  };
}

export default async function CertificatePage({ params }: Props) {
  const { vowId } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--uv-bg)' }}>
        <p style={{ color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', fontSize: 15 }}>
          Certificate unavailable.
        </p>
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch vow
  const { data: vow, error } = await supabase
    .from('vows')
    .select('id, refined_text, verdict, stake_amount, destination, witness_name, user_id, status, sealed_at, verdict_at')
    .eq('id', vowId)
    .single();

  if (error || !vow) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--uv-bg)' }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <h1 style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 24, fontWeight: 500, color: 'var(--uv-text)', margin: '0 0 8px' }}>
            Vow not found
          </h1>
          <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 15, color: 'var(--uv-text-muted)', margin: 0 }}>
            This vow doesn&apos;t exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  // Certificate is only for kept vows — redirect others to outcome
  if (vow.verdict !== 'kept') {
    redirect(`/outcome/${vowId}`);
  }

  // Fetch maker display name
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

  return (
    <CertificateClient
      vow={{
        id: vow.id,
        refined_text: vow.refined_text,
        stake_amount: vow.stake_amount,
        destination: vow.destination,
        witness_name: vow.witness_name,
        sealed_at: vow.sealed_at,
        verdict_at: vow.verdict_at,
      }}
      makerName={makerName}
    />
  );
}

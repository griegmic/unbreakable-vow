import { createClient } from '@supabase/supabase-js';
import VerdictClient from './client';
import VerdictNotFound from './not-found-client';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function VerdictPage({ params }: Props) {
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
    return <VerdictNotFound token={token} />;
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

  return <VerdictClient vow={vow} token={token} />;
}

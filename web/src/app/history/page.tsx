'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { RitualScreen, HeaderBadge, TitleBlock, RitualCard, StatPill, PrimaryButton, FadeUp } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';

type HistoryVow = Pick<Database['public']['Tables']['vows']['Row'], 'id' | 'refined_text' | 'status' | 'witness_name' | 'stake_amount' | 'verdict' | 'created_at'>;

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [vows, setVows] = useState<HistoryVow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('vows')
        .select('id, refined_text, status, witness_name, stake_amount, verdict, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setVows(data ?? []);
      setLoading(false);
    };
    fetch();
  }, [isAuthenticated, authLoading, router]);

  const keptCount = vows.filter(v => v.verdict === 'kept').length;
  const brokenCount = vows.filter(v => v.verdict === 'broken').length;

  if (loading || authLoading) {
    return (
      <RitualScreen>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
        </div>
      </RitualScreen>
    );
  }

  return (
    <RitualScreen
      footer={<PrimaryButton label="Make a new vow" onPress={() => router.push('/')} />}
    >
      <FadeUp><HeaderBadge /></FadeUp>

      <FadeUp delay={0.05}>
        <TitleBlock title="Your vows" subtitle={`${vows.length} total vows`} />
      </FadeUp>

      {vows.length > 0 && (
        <FadeUp delay={0.1}>
          <div className="flex gap-3">
            <StatPill value={String(vows.length)} label="Total" />
            <StatPill value={String(keptCount)} label="Kept" tone="success" />
            <StatPill value={String(brokenCount)} label="Broken" tone="danger" />
          </div>
        </FadeUp>
      )}

      <div className="flex flex-col gap-3">
        {vows.map((v, i) => {
          const isKept = v.verdict === 'kept';
          const isBroken = v.verdict === 'broken';
          const isActive = ['sealed', 'active', 'awaiting_verdict'].includes(v.status);

          return (
            <FadeUp key={v.id} delay={0.15 + i * 0.05}>
              <RitualCard>
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-3">
                    <p className="text-[15px] font-serif font-medium" style={{ color: 'var(--text)' }}>{v.refined_text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {v.witness_name} · ${v.stake_amount / 100}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isKept && <CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} />}
                    {isBroken && <XCircle className="w-5 h-5" style={{ color: 'var(--danger)' }} />}
                    {isActive && <Clock className="w-5 h-5" style={{ color: 'var(--gold)' }} />}
                  </div>
                </div>
                {isActive && (
                  <button
                    onClick={() => router.push('/live')}
                    className="text-[13px] font-semibold mt-1"
                    style={{ color: 'var(--gold)' }}
                  >
                    View active vow →
                  </button>
                )}
              </RitualCard>
            </FadeUp>
          );
        })}

        {vows.length === 0 && (
          <FadeUp delay={0.15}>
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-[15px]" style={{ color: 'var(--text-muted)' }}>No vows yet</p>
            </div>
          </FadeUp>
        )}
      </div>
    </RitualScreen>
  );
}

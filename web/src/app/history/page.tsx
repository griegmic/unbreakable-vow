'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { Card } from '@/components/uv/Card';
import { Chip } from '@/components/uv/Chip';
import { StatusPill } from '@/components/uv/StatusPill';
import { SkeletonRow } from '@/components/uv/SkeletonRow';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';

type HistoryVow = Pick<Database['public']['Tables']['vows']['Row'], 'id' | 'refined_text' | 'status' | 'witness_name' | 'stake_amount' | 'verdict' | 'created_at'>;
type Filter = 'all' | 'kept' | 'broken' | 'voided';

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [vows, setVows] = useState<HistoryVow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    const fetchVows = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('vows')
        .select('id, refined_text, status, witness_name, stake_amount, verdict, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setVows(data ?? []);
      setLoading(false);
    };
    fetchVows();
  }, [isAuthenticated, authLoading, router]);

  const keptCount = vows.filter(v => v.verdict === 'kept').length;
  const brokenCount = vows.filter(v => v.verdict === 'broken').length;
  const voidedCount = vows.filter(v => v.status === 'voided').length;

  const filtered = vows.filter(v => {
    if (filter === 'all') return true;
    if (filter === 'kept') return v.verdict === 'kept';
    if (filter === 'broken') return v.verdict === 'broken';
    if (filter === 'voided') return v.status === 'voided';
    return true;
  });

  if (loading || authLoading) {
    return (
      <RitualScreen>
        <div style={{ paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonRow count={4} />
        </div>
      </RitualScreen>
    );
  }

  return (
    <RitualScreen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 16 }}>
        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--uv-text-muted)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--uv-font-sans)',
            textAlign: 'left',
            padding: '4px 0',
          }}
        >
          &larr; Dashboard
        </button>

        {/* Hero */}
        <h1
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 32,
            fontWeight: 500,
            color: 'var(--uv-text)',
            lineHeight: 1.2,
          }}
        >
          Past vows
        </h1>

        {/* Counts */}
        <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--uv-font-sans)', fontSize: 13 }}>
          <span style={{ color: 'var(--uv-text-muted)' }}>{vows.length} total</span>
          <span style={{ color: 'var(--uv-status-active)' }}>{keptCount} kept</span>
          <span style={{ color: 'var(--uv-danger)' }}>{brokenCount} broken</span>
          <span style={{ color: 'var(--uv-text-muted)' }}>{voidedCount} voided</span>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip label="All" selected={filter === 'all'} onClick={() => setFilter('all')} />
          <Chip label="Kept" selected={filter === 'kept'} onClick={() => setFilter('kept')} />
          <Chip label="Broken" selected={filter === 'broken'} onClick={() => setFilter('broken')} />
          <Chip label="Voided" selected={filter === 'voided'} onClick={() => setFilter('voided')} />
        </div>

        {/* Vow list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((v) => {
            const isKept = v.verdict === 'kept';
            const isBroken = v.verdict === 'broken';
            const isActive = ['sealed', 'active', 'awaiting_verdict'].includes(v.status);
            const isVoided = v.status === 'voided';

            const pillVariant = isKept ? 'kept' : isBroken ? 'broken' : isActive ? 'active' : isVoided ? 'voided' : 'pending';
            const pillLabel = isKept ? 'Kept' : isBroken ? 'Broken' : isActive ? 'Active' : isVoided ? 'Voided' : 'Draft';

            return (
              <Card key={v.id} onClick={() => router.push(`/vow/${v.id}`)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 15,
                        fontFamily: 'var(--uv-font-serif)',
                        fontWeight: 500,
                        color: 'var(--uv-text)',
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {v.refined_text}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
                        {v.witness_name} &middot; ${v.stake_amount / 100}
                      </span>
                    </div>
                  </div>
                  <StatusPill variant={pillVariant}>{pillLabel}</StatusPill>
                </div>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12 }}>
              <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', margin: 0 }}>
                {filter === 'all' ? 'No vows yet' : `No ${filter} vows`}
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <PrimaryButton onClick={() => router.push('/create')}>Make a new vow</PrimaryButton>
      </div>
    </RitualScreen>
  );
}

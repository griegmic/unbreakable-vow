'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen, RitualCard, FrauncesH1, FrauncesSub, Stamp, WaxSeal, ChoicePill } from '@/components/primitives';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

/**
 * History — §6.2
 *
 * Filters: All / Kept / Broken / Voided (segmented control)
 * Stats summary at top. Vow rows with verdict stamps. Tappable → /vow/[id].
 * Empty state: faded WaxSeal + "No verdicts yet." (matches S20-EMPTY pattern).
 */

type Filter = 'all' | 'kept' | 'broken' | 'voided';

interface HistoryVow {
  id: string;
  refined_text: string;
  status: string;
  witness_name: string;
  stake_amount: number;
  destination: string;
  verdict: string | null;
  created_at: string;
}

// ── Relative date ──
function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}


// ── Mini stamp for row verdict ──
function MiniStamp({ verdict }: { verdict: 'kept' | 'broken' | 'voided' }) {
  const config = {
    kept: { text: 'KEPT' as const, color: 'var(--uv-gold)' },
    broken: { text: 'BROKEN' as const, color: 'var(--uv-danger)' },
    voided: { text: 'VOIDED' as const, color: 'var(--uv-text-dim)' },
  }[verdict];

  return (
    <span style={{
      fontFamily: 'var(--uv-font-sans)', fontSize: 9, fontWeight: 700,
      letterSpacing: '0.15em', textTransform: 'uppercase' as const,
      color: config.color,
      border: `1.5px solid ${config.color}`,
      padding: '2px 6px', borderRadius: 4,
      transform: 'rotate(-2deg)', display: 'inline-block',
      whiteSpace: 'nowrap',
    }}>
      {config.text}
    </span>
  );
}

// ── Loading skeleton ──
function SkeletonRows() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          height: 72, borderRadius: 18,
          background: 'var(--uv-bg-card)', border: '1px solid var(--uv-border)',
          animation: 'uv-shimmer 1.5s ease infinite',
        }} />
      ))}
    </div>
  );
}

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
        .select('id, refined_text, status, witness_name, stake_amount, destination, verdict, created_at')
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
  const keptRate = vows.length > 0
    ? Math.round((keptCount / (keptCount + brokenCount || 1)) * 100)
    : 0;

  const filtered = vows.filter(v => {
    if (filter === 'all') return true;
    if (filter === 'kept') return v.verdict === 'kept';
    if (filter === 'broken') return v.verdict === 'broken';
    if (filter === 'voided') return v.status === 'voided';
    return true;
  });

  if (loading || authLoading) {
    return (
      <RitualScreen variant="utility">
        <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Header skeleton */}
          <div style={{ height: 20 }} />
          <div style={{ height: 40 }} />
          <SkeletonRows />
        </div>
      </RitualScreen>
    );
  }

  return (
    <RitualScreen variant="utility">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 16, paddingBottom: 40 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => router.push('/dashboard')}
            aria-label="Back to dashboard"
            style={{
              background: 'none', border: 'none',
              color: 'var(--uv-text-muted)', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--uv-font-sans)',
              padding: '4px 0',
            }}
          >
            &larr; Dashboard
          </button>
          <span style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 13, fontStyle: 'italic',
            fontVariationSettings: '"opsz" 144', color: 'var(--uv-gold)',
          }}>
            Unbreakable Vow
          </span>
        </div>

        {/* H1 */}
        <FrauncesH1 italic size="page">Your record.</FrauncesH1>

        {vows.length === 0 ? (
          /* ── Empty state — matches S20-EMPTY ── */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '64px 0', gap: 20,
          }}>
            <div style={{ opacity: 0.6 }}>
              <WaxSeal size="lg" showHalo={false} />
            </div>
            <FrauncesH1 italic size="page">No verdicts yet.</FrauncesH1>
            <FrauncesSub>Your record will live here.</FrauncesSub>
          </div>
        ) : (
          <>
            {/* Stats summary */}
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 13,
              color: 'var(--uv-text-muted)', margin: 0, lineHeight: 1.6,
            }}>
              {vows.length} vow{vows.length !== 1 ? 's' : ''} &middot;{' '}
              <span style={{ color: 'var(--uv-gold)' }}>{keptCount} kept</span> &middot;{' '}
              <span style={{ color: 'var(--uv-danger)' }}>{brokenCount} broken</span> &middot;{' '}
              {voidedCount} voided &middot;{' '}
              <span style={{ color: 'var(--uv-gold)', fontWeight: 600 }}>{keptRate}% kept rate</span>
            </p>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Filter vows">
              <ChoicePill label="All" active={filter === 'all'} onPress={() => setFilter('all')} size="sm" />
              <ChoicePill label="Kept" active={filter === 'kept'} onPress={() => setFilter('kept')} size="sm" />
              <ChoicePill label="Broken" active={filter === 'broken'} onPress={() => setFilter('broken')} size="sm" />
              <ChoicePill label="Voided" active={filter === 'voided'} onPress={() => setFilter('voided')} size="sm" />
            </div>

            {/* Vow list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((v) => {
                const stakeDollars = Math.round(v.stake_amount / 100);
                const isKept = v.verdict === 'kept';
                const isBroken = v.verdict === 'broken';
                const isVoided = v.status === 'voided';
                const stampVerdict = isKept ? 'kept' : isBroken ? 'broken' : isVoided ? 'voided' : null;

                return (
                  <button
                    key={v.id}
                    onClick={() => router.push(`/vow/${v.id}`)}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <RitualCard variant="dashboard">
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontFamily: 'var(--uv-font-serif)', fontSize: 15, fontWeight: 500,
                            fontStyle: 'italic', color: 'var(--uv-text)', margin: 0,
                            lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {v.refined_text}
                          </p>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
                            fontFamily: 'var(--uv-font-sans)', fontSize: 12, color: 'var(--uv-text-dim)',
                          }}>
                            <span>{v.witness_name}</span>
                            {stakeDollars > 0 && (
                              <>
                                <span>&middot;</span>
                                <span>${stakeDollars} → {v.destination}</span>
                              </>
                            )}
                            <span>&middot;</span>
                            <span>{relativeDate(v.created_at)}</span>
                          </div>
                        </div>
                        {stampVerdict && <MiniStamp verdict={stampVerdict} />}
                      </div>
                    </RitualCard>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '48px 0', gap: 8,
                }}>
                  <FrauncesSub dim>No {filter} vows</FrauncesSub>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </RitualScreen>
  );
}

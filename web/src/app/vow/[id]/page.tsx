'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Share2, MessageCircle, Ban, Check, X, Clock, AlertCircle, Eye, User } from 'lucide-react';
import { RitualScreen, RitualCard, SectionLabel, FadeUp } from '@/components/ui';
import { ShareButton } from '@/components/share-button';
import Timeline from '@/components/timeline';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';

type VowRow = Database['public']['Tables']['vows']['Row'];

function getCountdownText(endsAt: string | null | undefined) {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) {
    const ago = Math.abs(diff);
    const hoursAgo = Math.floor(ago / (1000 * 60 * 60));
    if (hoursAgo < 1) return `Ended ${Math.floor(ago / (1000 * 60))}m ago`;
    if (hoursAgo < 24) return `Ended ${hoursAgo}h ago`;
    return `Ended ${Math.floor(hoursAgo / 24)}d ago`;
  }

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 7) return `${days} days left`;
  if (days >= 1) return `${days} days, ${hours - days * 24} hours left`;
  if (hours >= 1) return `${hours} hours, ${minutes - hours * 60} minutes left`;
  return `${minutes} minutes left`;
}

function getProgressInfo(startsAt: string | null | undefined, endsAt: string | null | undefined) {
  if (!startsAt || !endsAt) return { pct: 0, color: '#D4A24F' };
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const total = end - start;
  if (total <= 0) return { pct: 100, color: '#EF4444' };
  const pct = Math.min(100, Math.max(0, ((now - start) / total) * 100));
  const color = pct < 50 ? '#D4A24F' : pct < 80 ? '#F59E0B' : '#EF4444';
  return { pct, color };
}

function getStatusDisplay(vow: VowRow) {
  if (vow.status === 'active' && !vow.witness_accepted_at && vow.witness_name !== 'Just me') {
    return { label: 'Witness pending', color: '#60A5FA' };
  }
  if (vow.status === 'active' || vow.status === 'sealed') {
    return { label: 'Active', color: 'var(--success)' };
  }
  if (vow.status === 'awaiting_verdict') {
    return { label: 'Verdict due', color: '#F59E0B' };
  }
  if (vow.status === 'kept') return { label: 'Kept', color: 'var(--success)' };
  if (vow.status === 'broken') return { label: 'Broken', color: 'var(--danger)' };
  if (vow.status === 'voided') return { label: 'Withdrawn', color: 'var(--text-muted)' };
  return { label: vow.status, color: 'var(--text-muted)' };
}

export default function VowDetailPage() {
  const router = useRouter();
  const params = useParams();
  const vowId = params.id as string;
  const { isAuthenticated, loading: authLoading, session } = useAuth();
  const [vow, setVow] = useState<VowRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState('');
  const [checkInCooldown, setCheckInCooldown] = useState(false);
  const [lastCheckInTime, setLastCheckInTime] = useState<Date | null>(null);
  const [timelineKey, setTimelineKey] = useState(0);

  const fetchVow = useCallback(async () => {
    const { data, error } = await supabase
      .from('vows')
      .select('*')
      .eq('id', vowId)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }
    setVow(data);
    setLoading(false);
  }, [vowId]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace('/'); return; }
    fetchVow();
  }, [isAuthenticated, authLoading, router, fetchVow]);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  if (loading || authLoading) {
    return (
      <RitualScreen>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
        </div>
      </RitualScreen>
    );
  }

  if (!vow) {
    return (
      <RitualScreen>
        <FadeUp>
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 py-2">
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Dashboard</span>
          </button>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="text-center text-[15px] mt-20" style={{ color: 'var(--text-muted)' }}>Vow not found.</p>
        </FadeUp>
      </RitualScreen>
    );
  }

  const userId = session?.user?.id;
  const isMaker = vow.user_id === userId;
  const isWitness = vow.witness_user_id === userId;
  const isTarget = vow.target_user_id === userId;
  const status = getStatusDisplay(vow);
  const countdown = getCountdownText(vow.ends_at);
  const progress = getProgressInfo(vow.starts_at, vow.ends_at);
  const isTerminal = ['kept', 'broken', 'voided'].includes(vow.status);

  const startFormatted = vow.starts_at
    ? new Date(vow.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const endFormatted = vow.ends_at
    ? new Date(vow.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  const witnessStatus = vow.witness_declined
    ? 'Declined'
    : vow.witness_accepted_at
    ? 'Accepted'
    : 'Pending';

  const witnessUrl = vow.witness_invite_token && origin ? `${origin}/w/${vow.witness_invite_token}` : '';
  const shareUrl = origin ? `${origin}/outcome/${vow.id}` : '';

  const handleTextWitness = () => {
    if (!vow.witness_phone) return;
    const body = encodeURIComponent(
      `Checking in on my vow: "${vow.refined_text}"${vow.stake_amount > 0 ? ` — $${vow.stake_amount / 100} on the line` : ''}`
    );
    const cleanPhone = vow.witness_phone.replace(/[^\d+\-]/g, '');
    window.location.href = `sms:${cleanPhone}?&body=${body}`;
  };

  return (
    <RitualScreen>
      {/* Back button */}
      <FadeUp>
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 py-2">
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Dashboard</span>
        </button>
      </FadeUp>

      {/* Vow text */}
      <FadeUp delay={0.05}>
        <h1 className="text-[28px] leading-[34px] font-bold font-serif tracking-[-0.5px]" style={{ color: 'var(--text)' }}>
          {vow.refined_text}
        </h1>
      </FadeUp>

      {/* Status block */}
      <FadeUp delay={0.1}>
        <RitualCard>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
            <span className="text-[13px] font-bold uppercase tracking-[0.5px]" style={{ color: status.color }}>
              {status.label}
            </span>
          </div>

          {!isTerminal && vow.starts_at && vow.ends_at && (
            <div className="w-full h-[4px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress.pct}%`, backgroundColor: progress.color }}
              />
            </div>
          )}

          {countdown && (
            <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
              {countdown}
            </span>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{startFormatted}</span>
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{endFormatted}</span>
          </div>
        </RitualCard>
      </FadeUp>

      {/* People block */}
      <FadeUp delay={0.15}>
        <RitualCard>
          <SectionLabel>People</SectionLabel>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Maker</span>
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {isMaker ? 'You' : 'Someone'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Witness</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {isWitness ? 'You' : vow.witness_name}
                </span>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: witnessStatus === 'Accepted' ? 'rgba(82,214,154,0.12)' : witnessStatus === 'Declined' ? 'rgba(239,68,68,0.12)' : 'rgba(96,165,250,0.12)',
                    color: witnessStatus === 'Accepted' ? 'var(--success)' : witnessStatus === 'Declined' ? 'var(--danger)' : '#60A5FA',
                  }}
                >
                  {witnessStatus}
                </span>
              </div>
            </div>
            {vow.vow_type === 'challenge' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Target</span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {isTarget ? 'You' : (vow.target_phone || 'Unknown')}
                </span>
              </div>
            )}
            <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Stake</span>
              <span className="text-sm font-bold" style={{ color: vow.stake_amount > 0 ? 'var(--gold)' : 'var(--text-muted)' }}>
                {vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)} → ${vow.destination}` : 'No stake'}
              </span>
            </div>
          </div>
        </RitualCard>
      </FadeUp>

      {/* Check-in block */}
      {!isTerminal && isMaker && vow.status === 'active' && (
        <FadeUp delay={0.2}>
          <RitualCard>
            <SectionLabel>Check In</SectionLabel>
            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>How&apos;s it going?</p>
            <div className="flex gap-2">
              {([['On track', 'on_track'], ['Struggling', 'struggling'], ['Done early', 'done_early']] as const).map(([label, type]) => {
                const cooldownRemaining = lastCheckInTime
                  ? Math.max(0, 4 * 60 * 60 * 1000 - (Date.now() - lastCheckInTime.getTime()))
                  : 0;
                const disabled = checkInCooldown && cooldownRemaining > 0;
                const hoursLeft = Math.ceil(cooldownRemaining / (1000 * 60 * 60));
                return (
                  <button
                    key={type}
                    disabled={disabled}
                    onClick={async () => {
                      const { error } = await supabase.from('audit_events').insert({
                        vow_id: vowId,
                        event_type: 'check_in',
                        actor_type: 'maker' as const,
                        actor_id: userId!,
                        metadata: { type },
                      });
                      if (!error) {
                        setLastCheckInTime(new Date());
                        setCheckInCooldown(true);
                        setTimelineKey(k => k + 1);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-[12px] text-[13px] font-medium transition-colors disabled:opacity-40"
                    style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {disabled ? `${hoursLeft}h` : label}
                  </button>
                );
              })}
            </div>
          </RitualCard>
        </FadeUp>
      )}

      {/* Timeline */}
      <FadeUp delay={0.25}>
        <RitualCard>
          <SectionLabel>Timeline</SectionLabel>
          <Timeline key={timelineKey} vowId={vowId} endsAt={vow.ends_at} />
        </RitualCard>
      </FadeUp>

      {/* Actions */}
      <FadeUp delay={0.3}>
        <div className="flex flex-col gap-2">
          {shareUrl && (
            <ShareButton
              url={shareUrl}
              text={`My vow: "${vow.refined_text}"`}
              buttonText="Share vow"
            />
          )}
          {vow.witness_phone && isMaker && !isTerminal && (
            <button
              onClick={handleTextWitness}
              className="w-full min-h-[46px] rounded-[14px] flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <MessageCircle className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Text witness</span>
            </button>
          )}
          {isMaker && !isTerminal && (
            <div className="flex flex-col gap-2">
              <button
                disabled={voiding}
                onClick={async () => {
                  if (!confirm('This will cancel your vow' + (vow.stake_amount > 0 ? ' and refund your stake' : '') + '. Continue?')) return;
                  setVoiding(true);
                  setVoidError('');
                  try {
                    // Refresh session for fresh JWT
                    const { data: { session: freshSession } } = await supabase.auth.refreshSession();
                    if (!freshSession) {
                      setVoidError('Session expired. Please sign in again.');
                      setVoiding(false);
                      return;
                    }
                    const res = await fetch(
                      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/void-vow`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${freshSession.access_token}`,
                          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                        },
                        body: JSON.stringify({ vow_id: vow.id }),
                      }
                    );
                    if (!res.ok) {
                      const body = await res.json().catch(() => null);
                      console.error('Withdraw failed:', res.status, body);
                      setVoidError(body?.message || body?.error || `Error ${res.status}`);
                      setVoiding(false);
                      return;
                    }
                    router.push('/dashboard');
                  } catch (err) {
                    console.error('Withdraw error:', err);
                    setVoidError(err instanceof Error ? err.message : 'Network error');
                    setVoiding(false);
                  }
                }}
                className="w-full min-h-[46px] rounded-[14px] flex items-center justify-center gap-2 transition-opacity"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', opacity: voiding ? 0.5 : 1 }}
              >
                <Ban className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {voiding ? 'Withdrawing...' : 'Withdraw vow'}
                </span>
              </button>
              {voidError && (
                <p className="text-[13px] text-center" style={{ color: 'var(--danger)' }}>{voidError}</p>
              )}
            </div>
          )}
        </div>
      </FadeUp>
    </RitualScreen>
  );
}

'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Clock, Shield, MessageCircle, Ban, ChevronDown, ChevronUp, Share2, Eye, Trophy, XCircle } from 'lucide-react';
import { RitualScreen, RitualCard, GoldCTA, OutlinedGoldCTA, MutedSecondary } from '@/components/primitives';

// ── Screen-local components (inlined from uv/ to eliminate pre-V6 imports) ──
// TODO #28: StatusPill promotion candidate — promote to /components/primitives if used elsewhere
type StatusVariant = 'active' | 'pending' | 'verdict' | 'kept' | 'broken' | 'voided';
function StatusPill({ variant, children }: { variant: StatusVariant; children: React.ReactNode }) {
  const styles: Record<StatusVariant, { background: string; color: string }> = {
    active: { background: 'var(--uv-success-bg)', color: 'var(--uv-success)' },
    pending: { background: 'var(--uv-warn-bg)', color: 'var(--uv-warn)' },
    verdict: { background: 'var(--uv-info-bg)', color: 'var(--uv-info)' },
    kept: { background: 'var(--uv-success-bg)', color: 'var(--uv-success)' },
    broken: { background: 'var(--uv-danger-bg)', color: 'var(--uv-danger)' },
    voided: { background: 'var(--uv-bg-elevated)', color: 'var(--uv-text-dim)' },
  };
  const s = styles[variant];
  return (
    <span style={{
      display: 'inline-block', padding: '4px 10px', borderRadius: 9999,
      background: s.background, color: s.color,
      fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 500,
      letterSpacing: '0.5px', textTransform: 'uppercase' as const,
    }}>
      {children}
    </span>
  );
}

// TODO #29: Countdown promotion candidate — promote to /components/primitives if used elsewhere
function Countdown({ endsAt, startsAt }: { endsAt: string; startsAt?: string }) {
  const [time, setTime] = React.useState(() => getTimeRemaining(endsAt));
  React.useEffect(() => {
    const tick = () => setTime(getTimeRemaining(endsAt));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);
  const showDayFormat = startsAt && time.totalMs > 24 * 60 * 60 * 1000;
  const color = time.totalMs < 6 * 3600000 ? 'var(--uv-danger)' : time.totalMs < 86400000 ? 'var(--uv-warn)' : 'var(--uv-gold)';
  let display: string;
  if (time.totalMs <= 0) display = '00:00:00';
  else if (showDayFormat) {
    const start = new Date(startsAt!).getTime(), end = new Date(endsAt).getTime();
    const total = Math.ceil((end - start) / 86400000), elapsed = Math.ceil((Date.now() - start) / 86400000);
    display = `Day ${Math.min(elapsed, total)} of ${total}`;
  } else display = `${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`;
  return (
    <div style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 'clamp(36px, 8vw, 56px)', fontWeight: 400, color, lineHeight: 1.1, textAlign: 'center' }}>
      {display}
    </div>
  );
}
function getTimeRemaining(endsAt: string) {
  const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
  return { hours: Math.floor(diff / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000), totalMs: diff };
}
function pad(n: number) { return n.toString().padStart(2, '0'); }

// Screen-local Modal (inlined from uv/Modal)
function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  React.useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--uv-bg-overlay)' }} />
      <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, background: 'var(--uv-bg-elevated)', border: '1px solid var(--uv-border-strong)', borderRadius: '22px 22px 0 0', padding: '16px 16px 14px', boxShadow: '0 -8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ width: 36, height: 3, background: 'var(--uv-border-strong)', borderRadius: 9999, margin: '0 auto 14px' }} />
        {title && <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', margin: '0 0 12px' }}>{title}</h2>}
        {children}
      </div>
    </>
  );
}

// Screen-local SkeletonRow
function SkeletonRow({ count = 1 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" style={{ height: 80, borderRadius: 22, background: 'var(--uv-bg-card)', animation: 'uv-shimmer 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );
}
import { ShareButton, CopyLinkButton } from '@/components/share-button';
import { HamburgerMenu } from '@/components/hamburger-menu';
import Timeline from '@/components/timeline';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';

type VowRow = Database['public']['Tables']['vows']['Row'];

type Phase =
  | 'witness_pending'
  | 'active'
  | 'verdict_waiting'
  | 'challenge_pending'
  | 'challenge_watching'
  | 'challenge_verdict'
  | 'witness_watching'
  | 'kept'
  | 'broken'
  | 'voided';

function getPhase(vow: VowRow, isMaker: boolean, isWitness: boolean, isTarget: boolean): Phase {
  // Terminal states
  if (vow.status === 'kept') return 'kept';
  if (vow.status === 'broken') return 'broken';
  if (vow.status === 'voided') return 'voided';

  // Witness role
  if (isWitness && !isMaker) {
    if (vow.status === 'awaiting_verdict') return 'verdict_waiting';
    return 'witness_watching';
  }

  // Target role (accepted challenge)
  if (isTarget && !isMaker) {
    if (vow.status === 'awaiting_verdict') return 'verdict_waiting';
    return 'active';
  }

  // Challenge vows (maker is witness)
  if (vow.vow_type === 'challenge') {
    if (vow.challenge_status === 'pending') return 'challenge_pending';
    if (vow.status === 'awaiting_verdict') return 'challenge_verdict';
    return 'challenge_watching';
  }

  // Maker: awaiting verdict
  if (vow.status === 'awaiting_verdict') {
    return 'verdict_waiting';
  }

  // Maker: active/sealed
  if (vow.status === 'active' || vow.status === 'sealed') {
    const isSolo = vow.witness_name === 'Just me';
    const witnessPending = !isSolo && !vow.witness_accepted_at;
    if (witnessPending) return 'witness_pending';
    return 'active';
  }

  return 'active';
}

export default function VowDetailPage() {
  const router = useRouter();
  const params = useParams();
  const vowId = params.id as string;
  const { isAuthenticated, loading: authLoading, session } = useAuth();
  const [vow, setVow] = useState<VowRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [timelineKey, setTimelineKey] = useState(0);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [verdictBusy, setVerdictBusy] = useState(false);
  const [verdictError, setVerdictError] = useState('');
  const [voidModalOpen, setVoidModalOpen] = useState(false);

  // Active-phase countdown grid (must be top-level for hooks rules)
  const [cdTime, setCdTime] = useState(() => ({ hours: 0, minutes: 0, seconds: 0, totalMs: 0 }));

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
    const interval = setInterval(fetchVow, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, authLoading, router, fetchVow]);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  // Countdown tick for active phase D/H/M/S grid
  useEffect(() => {
    if (!vow?.ends_at) return;
    const tick = () => setCdTime(getTimeRemaining(vow.ends_at!));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [vow?.ends_at]);

  if (loading || authLoading) {
    return (
      <RitualScreen>
        <div style={{ paddingTop: 40 }}>
          <SkeletonRow count={3} />
        </div>
      </RitualScreen>
    );
  }

  if (!vow) {
    return (
      <RitualScreen>
        <BackNavSimple />
        <p style={{ textAlign: 'center', fontSize: 15, marginTop: 80, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>
          Vow not found.
        </p>
      </RitualScreen>
    );
  }

  const userId = session?.user?.id;
  const isMaker = vow.user_id === userId;
  const isWitness = vow.witness_user_id === userId;
  const isTarget = vow.target_user_id === userId;
  const phase = getPhase(vow, isMaker, isWitness, isTarget);

  const endsAt = vow.ends_at ? new Date(vow.ends_at) : null;
  const now = new Date();
  const daysLeft = endsAt ? Math.ceil((endsAt.getTime() - now.getTime()) / 86400000) : null;
  const hoursLeft = endsAt ? Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60))) : 0;
  const endDateFormatted = endsAt?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) || '';
  const isSolo = vow.witness_name === 'Just me' && !vow.witness_accepted_at;
  const witnessUrl = vow.witness_invite_token && origin ? `${origin}/w/${vow.witness_invite_token}` : '';
  const shareUrl = origin ? `${origin}/outcome/${vow.id}` : '';
  const certificateUrl = origin ? `${origin}/certificate/${vow.id}` : '';
  const stakeLabel = vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)}` : null;
  const isTerminal = ['kept', 'broken', 'voided'].includes(vow.status);

  const witnessLabel = isSolo
    ? "You're the judge"
    : vow.witness_accepted_at
    ? `${vow.witness_name} is watching`
    : vow.witness_name
    ? `Waiting for ${vow.witness_name}`
    : 'Your witness is watching';

  const stakeSubtitle = vow.stake_amount > 0
    ? `${stakeLabel} at stake \u00b7 ${vow.destination} if broken`
    : 'Accountability only';

  // --- Handlers ---

  const handleGoSolo = async () => {
    if (actionBusy) return;
    if (!confirm(`Switch to self-judgment? You'll decide the verdict yourself on the end date. This can't be undone.`)) return;
    setActionBusy(true);
    setActionMsg('');
    try {
      const { error } = await supabase.from('vows').update({
        witness_name: 'Just me',
        witness_phone: null,
        witness_accepted_at: null,
        witness_declined: false,
      }).eq('id', vow.id);
      if (error) throw error;
      setActionMsg('Switched to self-judgment.');
      await fetchVow();
    } catch {
      setActionMsg('Failed to switch. Try again.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleTextWitness = () => {
    const phone = vow.witness_phone;
    const body = encodeURIComponent(
      `Still holding my vow: "${vow.refined_text}"${stakeLabel ? ` \u2014 ${stakeLabel} on the line` : ''}. Just checking in`
    );
    if (phone) {
      const cleanPhone = phone.replace(/[^\d+\-]/g, '');
      window.location.href = `sms:${cleanPhone}?body=${body}`;
    } else if (navigator.share) {
      navigator.share({ text: decodeURIComponent(body) }).catch(() => {});
    }
  };

  const handleWithdraw = async () => {
    setVoidModalOpen(false);
    if (actionBusy) return;
    setActionBusy(true);
    setActionMsg('');
    try {
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      const freshSession = refreshErr ? null : refreshData.session;
      const sess = freshSession || (await supabase.auth.getSession()).data.session;
      if (!sess) {
        setActionMsg('Session expired. Please sign in again.');
        setActionBusy(false);
        return;
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/void-vow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sess.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ vow_id: vow.id }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setActionMsg(body?.message || body?.error || `Error ${res.status}`);
        setActionBusy(false);
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Network error');
      setActionBusy(false);
    }
  };

  const handleTestVerdict = async (verdict: 'kept' | 'broken') => {
    if (verdictBusy || !vow.witness_invite_token) return;
    setVerdictBusy(true);
    setVerdictError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-verdict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token: vow.witness_invite_token, verdict }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        setVerdictError(data?.error || `Error ${res.status}`);
        setVerdictBusy(false);
        return;
      }
      const amountDollars = Math.round((vow.stake_amount || 0) / 100);
      const outText = encodeURIComponent(vow.refined_text || '');
      const outDest = encodeURIComponent(vow.destination || '');
      const outWitness = encodeURIComponent(vow.witness_name || '');
      const isSelfVerdict = vow.witness_user_id === userId ? '&self=1' : '';
      const base = verdict === 'kept' ? '/vow-kept' : '/vow-broken';
      window.location.href = `${base}?amount=${amountDollars}&text=${outText}&destination=${outDest}&witness=${outWitness}${isSelfVerdict}`;
    } catch {
      setVerdictError('Network error');
      setVerdictBusy(false);
    }
  };

  // --- Shared components ---

  const BackNav = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <button
        onClick={() => router.push('/dashboard')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--uv-text-faint)' }} />
        <span style={{ fontSize: 14, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>Dashboard</span>
      </button>
      {isAuthenticated && <HamburgerMenu />}
    </div>
  );

  const VowTitle = ({ text, sub }: { text: string; sub?: string }) => (
    <div style={{ marginBottom: 16 }}>
      <h1 style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--uv-text)', margin: 0, lineHeight: 1.3 }}>
        {text}
      </h1>
      {sub && (
        <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-text-muted)', marginTop: 6 }}>
          {sub}
        </p>
      )}
    </div>
  );

  const CountdownSection = () => (
    <div style={{ margin: '16px 0' }}>
      {vow.ends_at && (
        <Countdown endsAt={vow.ends_at} startsAt={vow.starts_at || vow.sealed_at || undefined} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--uv-success)' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
          {witnessLabel}
        </span>
      </div>
      {endDateFormatted && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)', marginTop: 6 }}>
          Verdict day: {endDateFormatted}
        </p>
      )}
    </div>
  );

  const TimelineBlock = () => (
    <div style={{ marginTop: 20 }}>
      <button
        onClick={() => setTimelineOpen(!timelineOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>
          Timeline
        </span>
        {timelineOpen
          ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--uv-text-faint)' }} />
          : <ChevronDown className="w-4 h-4" style={{ color: 'var(--uv-text-faint)' }} />
        }
      </button>
      {timelineOpen && (
        <RitualCard>
          <Timeline key={timelineKey} vowId={vowId} endsAt={vow.ends_at} />
        </RitualCard>
      )}
    </div>
  );

  const WithdrawButton = () => {
    if (!isMaker || isTerminal) return null;
    return (
      <div style={{ marginTop: 16 }}>
        <MutedSecondary label="Withdraw vow" onPress={() => setVoidModalOpen(true)} />


      </div>
    );
  };

  const VoidConfirmModal = () => (
    <Modal open={voidModalOpen} onClose={() => setVoidModalOpen(false)} title="Withdraw vow?">
      <p style={{ fontSize: 14, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', marginBottom: 16, lineHeight: 1.5 }}>
        This will cancel your vow{vow.stake_amount > 0 ? ' and refund your stake' : ''}. This cannot be undone.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <GoldCTA label={actionBusy ? 'Withdrawing...' : 'Yes, withdraw'} onPress={handleWithdraw} disabled={actionBusy} />
        <MutedSecondary label="Never mind" onPress={() => setVoidModalOpen(false)} />
      </div>
    </Modal>
  );

  const DevVerdictButtons = () => {
    if (process.env.NODE_ENV !== 'development' || isTerminal || !vow.witness_invite_token) return null;
    return (
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center', color: 'var(--uv-text-faint)', opacity: 0.5 }}>
          Fast-forward (testing)
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => handleTestVerdict('kept')}
            disabled={verdictBusy}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 'var(--uv-radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--uv-success-bg)',
              border: '1px solid var(--uv-success-border)',
              cursor: verdictBusy ? 'not-allowed' : 'pointer',
              opacity: verdictBusy ? 0.4 : 1,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--uv-success)' }}>
              {verdictBusy ? '...' : 'Mark Kept'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTestVerdict('broken')}
            disabled={verdictBusy}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 'var(--uv-radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--uv-danger-bg)',
              border: '1px solid var(--uv-danger-border)',
              cursor: verdictBusy ? 'not-allowed' : 'pointer',
              opacity: verdictBusy ? 0.4 : 1,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--uv-danger)' }}>
              {verdictBusy ? '...' : 'Mark Broken'}
            </span>
          </button>
        </div>
        {verdictError && (
          <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--uv-danger)' }}>{verdictError}</p>
        )}
      </div>
    );
  };

  const DashboardButton = () => (
    <OutlinedGoldCTA label="My Vows" onPress={() => router.push('/dashboard')} />
  );

  const ActionMessage = () => actionMsg ? (
    <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', marginTop: 8 }}>{actionMsg}</p>
  ) : null;

  // ============================================================
  //  PHASE: WITNESS PENDING
  // ============================================================
  if (phase === 'witness_pending') {
    const witnessDeclined = vow.witness_declined;
    const nudgeShareText = `Hey, did you see my vow? "${vow.refined_text.replace(/\.$/, '')}"${stakeLabel ? ` I put ${stakeLabel} on it.` : ''} I need you to accept:`;

    return (
      <RitualScreen>
        <BackNav />
        <StatusPill variant="pending">Waiting on witness</StatusPill>

        <VowTitle text={vow.refined_text} sub={stakeSubtitle} />

        {/* Witness declined */}
        {witnessDeclined && (
          <div style={{ borderRadius: 18, padding: '18px 22px', background: 'var(--uv-bg-card)', border: '1px solid var(--uv-warn)', display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)' }}>
              {vow.witness_name} declined.
            </span>
            <p style={{ fontSize: 13, lineHeight: '19px', color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', marginTop: 8 }}>
              You can continue solo &mdash; you&apos;ll judge the vow yourself on verdict day.
            </p>
            <div style={{ marginTop: 12 }}>
              <GoldCTA label={actionBusy ? 'Switching...' : 'Go solo instead'} onPress={handleGoSolo} disabled={actionBusy} />
            </div>
          </div>
        )}

        {/* Witness pending - nudge card */}
        {!witnessDeclined && witnessUrl && (
          <RitualCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--uv-gold-selected-shadow)' }}>
                <Clock className="w-[18px] h-[18px]" style={{ color: 'var(--uv-gold)' }} />
              </div>
              <div>
                <span style={{ fontSize: 15, fontWeight: 500, display: 'block', color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)' }}>
                  Waiting on {vow.witness_name}.
                </span>
                <span style={{ fontSize: 12, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>
                  {vow.witness_phone ? 'We texted them an invite. Nudge if they haven\u2019t checked yet.' : 'Share the invite so they can accept.'}
                </span>
              </div>
            </div>
            <ShareButton
              url={witnessUrl}
              text={nudgeShareText}
              buttonText={vow.witness_phone ? 'Nudge your witness' : 'Send the invite'}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <div style={{ borderRadius: 10, padding: '8px 12px', flex: 1, minWidth: 0, backgroundColor: 'var(--uv-bg-elevated)', border: '1px solid var(--uv-border-strong)' }}>
                <p style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--uv-text-faint)', margin: 0 }}>{witnessUrl}</p>
              </div>
              <CopyLinkButton url={witnessUrl} />
            </div>
          </RitualCard>
        )}

        {/* Go solo link */}
        {!witnessDeclined && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <MutedSecondary label="or go solo" onPress={handleGoSolo} />
          </div>
        )}

        <TimelineBlock />
        <WithdrawButton />
        <VoidConfirmModal />
        <ActionMessage />
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <DashboardButton />
        </div>
      </RitualScreen>
    );
  }

  // ============================================================
  //  PHASE: ACTIVE
  // ============================================================
  if (phase === 'active') {
    const cdDays = Math.floor(cdTime.totalMs / 86400000);
    const cdHrs = cdTime.hours % 24;
    const cdMin = cdTime.minutes;
    const cdSec = cdTime.seconds;
    const endDateFull = endsAt
      ? endsAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
        ' at ' + endsAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '';

    return (
      <RitualScreen>
        {/* ── Mock topbar: ← | VOW LIVE | ··· ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 4px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--uv-text-muted)', padding: 0 }} aria-label="Back to dashboard">
            ←
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'var(--uv-success)', fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--uv-success)', boxShadow: '0 0 6px var(--uv-success)', display: 'inline-block' }} />
            Vow live
          </div>
          {isAuthenticated && <HamburgerMenu />}
        </div>

        {/* ── Vow card ── */}
        <div style={{
          background: 'var(--uv-bg-card)',
          border: '1px solid var(--uv-border-soft)',
          borderRadius: 14,
          padding: '16px 18px 14px',
          marginBottom: 16,
          position: 'relative' as const,
        }}>
          {/* Gold gradient line */}
          <div style={{ position: 'absolute', top: 0, left: 22, right: 22, height: 1, background: 'linear-gradient(90deg, transparent, var(--uv-gold-line), transparent)' }} />
          <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: 'var(--uv-text-dim)', fontWeight: 500, marginBottom: 6 }}>
            — The Vow —
          </div>
          <div style={{
            fontFamily: 'var(--uv-font-serif)', fontWeight: 400,
            fontVariationSettings: '"opsz" 144',
            fontSize: 19, lineHeight: 1.18, letterSpacing: '-0.005em',
            color: 'var(--uv-text)', marginBottom: 10,
          }}>
            <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>I&apos;ll</em>{' '}
            {vow.refined_text.replace(/^I('ll|'ll| will)\s*/i, '')}
          </div>
          <div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: '1px dashed var(--uv-border-soft)' }}>
            {vow.stake_amount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: 'var(--uv-text-dim)', fontWeight: 500 }}>On hold</div>
                <div style={{ fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 13, color: 'var(--uv-gold-bright)', fontFeatureSettings: '"tnum"' }}>{stakeLabel}</div>
              </div>
            )}
            {vow.destination && vow.stake_amount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: 'var(--uv-text-dim)', fontWeight: 500 }}>Goes to</div>
                <div style={{ fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 13, color: 'var(--uv-text)', fontFeatureSettings: '"tnum"' }}>{vow.destination}</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: 'var(--uv-text-dim)', fontWeight: 500 }}>Judge</div>
              <div style={{ fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 13, color: 'var(--uv-text)', fontFeatureSettings: '"tnum"', display: 'flex', alignItems: 'center', gap: 6 }}>
                {!isSolo && vow.witness_accepted_at && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--uv-success)', display: 'inline-block' }} />
                )}
                {isSolo ? 'Just me' : vow.witness_name}
              </div>
            </div>
          </div>
        </div>

        {/* ── Countdown grid ── */}
        {vow.ends_at && (
          <div style={{
            background: 'var(--uv-bg-elevated)',
            border: '1px solid var(--uv-gold-line)',
            borderRadius: 14,
            padding: '18px 16px 14px',
            marginBottom: 16,
            textAlign: 'center' as const,
          }}>
            <div style={{ fontSize: 9.5, letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: 'var(--uv-text-dim)', fontWeight: 500, marginBottom: 10 }}>
              — Time until verdict —
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {([
                [cdDays, 'Days'],
                [cdHrs, 'Hrs'],
                [cdMin, 'Min'],
                [cdSec, 'Sec'],
              ] as [number, string][]).map(([num, unit]) => (
                <div key={unit} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2 }}>
                  <div style={{
                    fontFamily: 'var(--uv-font-serif)', fontWeight: 500,
                    fontVariationSettings: '"opsz" 144',
                    fontSize: 30, lineHeight: 1, letterSpacing: '-0.02em',
                    color: 'var(--uv-gold-bright)', fontFeatureSettings: '"tnum"',
                  }}>
                    {num.toString().padStart(unit === 'Days' ? 1 : 2, '0')}
                  </div>
                  <div style={{ fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'var(--uv-text-dim)', fontWeight: 500 }}>
                    {unit}
                  </div>
                </div>
              ))}
            </div>
            {endDateFull && (
              <div style={{
                marginTop: 12, fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 12,
                color: 'var(--uv-text-muted)', paddingTop: 10, borderTop: '1px dashed var(--uv-border-soft)',
              }}>
                {endDateFull}
              </div>
            )}
          </div>
        )}

        {/* ── Action tiles: Text witness + Share ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {!isSolo && vow.witness_phone ? (
            <button type="button" onClick={handleTextWitness} style={{
              background: 'var(--uv-gold-soft)', border: '1px solid var(--uv-gold-line)',
              borderRadius: 12, padding: '14px 14px', display: 'flex', flexDirection: 'column' as const, gap: 4,
              minHeight: 84, cursor: 'pointer', textAlign: 'left' as const,
            }}>
              <div style={{ fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--uv-gold-bright)', marginBottom: 2 }}>→</div>
              <div style={{ fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 14, color: 'var(--uv-text)', letterSpacing: '-0.005em' }}>Text {vow.witness_name}</div>
              <div style={{ fontSize: 11, color: 'var(--uv-text-muted)', lineHeight: 1.35 }}>Check in with them</div>
            </button>
          ) : (
            <button type="button" onClick={async () => {
              const inviteShareText = vow.stake_amount > 0
                ? `I vowed to ${vow.refined_text.replace(/\.$/, '').toLowerCase()} and put ${stakeLabel} on it.`
                : `I vowed to ${vow.refined_text.replace(/\.$/, '').toLowerCase()}.`;
              const url = isSolo && witnessUrl ? witnessUrl : shareUrl;
              if (navigator.share) {
                try { await navigator.share({ text: inviteShareText, url }); } catch {}
              } else {
                await navigator.clipboard.writeText(`${inviteShareText} ${url}`);
                setActionMsg('Link copied');
                setTimeout(() => setActionMsg(''), 2000);
              }
            }} style={{
              background: 'var(--uv-gold-soft)', border: '1px solid var(--uv-gold-line)',
              borderRadius: 12, padding: '14px 14px', display: 'flex', flexDirection: 'column' as const, gap: 4,
              minHeight: 84, cursor: 'pointer', textAlign: 'left' as const,
            }}>
              <div style={{ fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--uv-gold-bright)', marginBottom: 2 }}>→</div>
              <div style={{ fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 14, color: 'var(--uv-text)', letterSpacing: '-0.005em' }}>{isSolo ? 'Invite a judge' : `Text ${vow.witness_name}`}</div>
              <div style={{ fontSize: 11, color: 'var(--uv-text-muted)', lineHeight: 1.35 }}>{isSolo ? 'People keep vows 3x more' : 'Check in with them'}</div>
            </button>
          )}
          <button type="button" onClick={async () => {
            if (navigator.share) {
              try { await navigator.share({ text: `My vow: "${vow.refined_text}"`, url: shareUrl }); } catch {}
            } else {
              await navigator.clipboard.writeText(shareUrl);
              setActionMsg('Link copied');
              setTimeout(() => setActionMsg(''), 2000);
            }
          }} style={{
            background: 'var(--uv-bg-card)', border: '1px solid var(--uv-border-soft)',
            borderRadius: 12, padding: '14px 14px', display: 'flex', flexDirection: 'column' as const, gap: 4,
            minHeight: 84, cursor: 'pointer', textAlign: 'left' as const,
          }}>
            <div style={{ fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--uv-gold)', marginBottom: 2 }}>⌁</div>
            <div style={{ fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 14, color: 'var(--uv-text)', letterSpacing: '-0.005em' }}>Share</div>
            <div style={{ fontSize: 11, color: 'var(--uv-text-muted)', lineHeight: 1.35 }}>Brag a little</div>
          </button>
        </div>

        {/* ── Activity timeline (always visible, matching mock) ── */}
        <div style={{ fontSize: 9.5, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: 'var(--uv-text-dim)', fontWeight: 500, margin: '6px 4px 10px' }}>
          Activity
        </div>
        <div style={{ background: 'var(--uv-bg-card)', border: '1px solid var(--uv-border-soft)', borderRadius: 12, padding: '4px 16px' }}>
          <Timeline key={timelineKey} vowId={vowId} endsAt={vow.ends_at} />
        </div>

        <WithdrawButton />
        <VoidConfirmModal />
        <DevVerdictButtons />
        <ActionMessage />
      </RitualScreen>
    );
  }

  // ============================================================
  //  PHASE: VERDICT WAITING
  // ============================================================
  if (phase === 'verdict_waiting') {
    const witnessAccepted = !!vow.witness_accepted_at;
    const canSelfResolve = isMaker && (isSolo || !witnessAccepted);

    return (
      <RitualScreen>
        <BackNav />
        <StatusPill variant="verdict">Verdict due</StatusPill>

        <VowTitle
          text={isWitness ? `${vow.witness_name}, it's your call.` : isSolo ? "Time's up." : `${vow.witness_name} is deciding.`}
          sub={isSolo ? 'How did it go?' : witnessAccepted ? undefined : `${vow.witness_name} never accepted. You can self-resolve.`}
        />

        <RitualCard>
          <p style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 17, fontWeight: 400, color: 'var(--uv-text)', margin: 0 }}>
            {vow.refined_text}
          </p>
          <div style={{ height: 1, backgroundColor: 'var(--uv-border-strong)', margin: '12px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>At stake</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>{stakeLabel || 'Accountability only'}</span>
          </div>
          {vow.destination && vow.stake_amount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>If broken</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)' }}>{vow.destination}</span>
            </div>
          )}
        </RitualCard>

        <TimelineBlock />
        <WithdrawButton />
        <VoidConfirmModal />
        <DevVerdictButtons />
        <ActionMessage />

        {/* Footer CTAs */}
        <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {canSelfResolve && (
            <GoldCTA label="Deliver your verdict" onPress={() => router.push(`/self-resolve?id=${vow.id}`)} />
          )}
          {isMaker && witnessAccepted && vow.witness_phone && (
            <GoldCTA label={`Nudge ${vow.witness_name}`} onPress={() => { if (vow.witness_phone) window.open(`sms:${vow.witness_phone}`, '_self'); }} />
          )}
          {isMaker && witnessAccepted && !vow.witness_phone && (
            <ShareButton
              url={witnessUrl ? `${witnessUrl}/verdict` : ''}
              text={`Time to deliver the verdict on my vow: "${vow.refined_text}"`}
              buttonText={`Nudge ${vow.witness_name} to decide`}
            />
          )}
          {isWitness && vow.witness_invite_token && (
            <GoldCTA label="Deliver your verdict" onPress={() => router.push(`/w/${vow.witness_invite_token}/verdict`)} />
          )}
          <DashboardButton />
        </div>
      </RitualScreen>
    );
  }

  // ============================================================
  //  PHASE: CHALLENGE PENDING
  // ============================================================
  if (phase === 'challenge_pending') {
    const targetName = vow.target_phone ? vow.target_phone.slice(-4) : 'them';

    return (
      <RitualScreen>
        <BackNav />
        <StatusPill variant="pending">Challenge sent</StatusPill>

        <VowTitle text={vow.refined_text} sub={`Waiting for ${targetName} to accept the challenge.`} />

        <RitualCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--uv-info-bg)' }}>
              <Clock className="w-[18px] h-[18px]" style={{ color: 'var(--uv-gold)' }} />
            </div>
            <div>
              <span style={{ fontSize: 15, fontWeight: 500, display: 'block', color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)' }}>Challenge pending</span>
              <span style={{ fontSize: 12, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>
                They&apos;ll get a text with the dare. Nudge if they haven&apos;t responded.
              </span>
            </div>
          </div>
        </RitualCard>

        <TimelineBlock />
        <WithdrawButton />
        <VoidConfirmModal />

        <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vow.target_phone && (
            <GoldCTA label={`Nudge ${targetName}`} onPress={() => window.open(`sms:${vow.target_phone}`, '_self')} />
          )}
          <DashboardButton />
        </div>
      </RitualScreen>
    );
  }

  // ============================================================
  //  PHASE: CHALLENGE WATCHING
  // ============================================================
  if (phase === 'challenge_watching') {
    const targetName = vow.target_phone ? vow.target_phone.slice(-4) : 'them';

    return (
      <RitualScreen>
        <BackNav />
        <StatusPill variant="active">Challenge active</StatusPill>

        <VowTitle text={vow.refined_text} sub={`${targetName} accepted. The clock is ticking.`} />

        <CountdownSection />
        <TimelineBlock />
        <DevVerdictButtons />

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <DashboardButton />
        </div>
      </RitualScreen>
    );
  }

  // ============================================================
  //  PHASE: CHALLENGE VERDICT
  // ============================================================
  if (phase === 'challenge_verdict') {
    const targetName = vow.target_phone ? vow.target_phone.slice(-4) : 'them';

    return (
      <RitualScreen>
        <BackNav />
        <StatusPill variant="verdict">Time to judge</StatusPill>

        <VowTitle text="Time's up." sub={`Did ${targetName} keep their word?`} />

        <RitualCard>
          <p style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 17, fontWeight: 400, color: 'var(--uv-text)', margin: 0 }}>
            {vow.refined_text}
          </p>
          <div style={{ height: 1, backgroundColor: 'var(--uv-border-strong)', margin: '12px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>At stake</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>{stakeLabel || 'Accountability only'}</span>
          </div>
        </RitualCard>

        <TimelineBlock />
        <DevVerdictButtons />

        <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vow.witness_invite_token && (
            <GoldCTA label="Deliver your verdict" onPress={() => router.push(`/w/${vow.witness_invite_token}/verdict`)} />
          )}
          <DashboardButton />
        </div>
      </RitualScreen>
    );
  }

  // ============================================================
  //  PHASE: WITNESS WATCHING
  // ============================================================
  if (phase === 'witness_watching') {
    return (
      <RitualScreen>
        <BackNav />
        <StatusPill variant="active">You&apos;re watching</StatusPill>

        <VowTitle text={vow.refined_text} sub={stakeSubtitle} />

        <CountdownSection />

        <RitualCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Eye className="w-5 h-5 shrink-0" style={{ color: 'var(--uv-gold)' }} />
            <p style={{ fontSize: 14, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', margin: 0 }}>
              You&apos;ll be asked to deliver your verdict on {endDateFormatted}.
            </p>
          </div>
        </RitualCard>

        <TimelineBlock />

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <DashboardButton />
        </div>
      </RitualScreen>
    );
  }

  // ============================================================
  //  PHASE: KEPT
  // ============================================================
  if (phase === 'kept') {
    return (
      <RitualScreen gradient="verdict">
        <BackNav />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 16 }}>
          <StatusPill variant="kept">KEPT</StatusPill>
          <h1 style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--uv-success)', margin: 0 }}>
            You kept your word.
          </h1>
        </div>

        <RitualCard>
          <p style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 17, fontWeight: 400, textAlign: 'center', color: 'var(--uv-text)', margin: 0 }}>
            &ldquo;{vow.refined_text}&rdquo;
          </p>
          <div style={{ height: 1, backgroundColor: 'var(--uv-border-strong)', margin: '12px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>Witnessed by</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)' }}>{vow.witness_name}</span>
          </div>
          {stakeLabel && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>Stake</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-success)', fontFamily: 'var(--uv-font-sans)' }}>{stakeLabel} protected</span>
            </div>
          )}
          {vow.verdict_at && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>Verdict</span>
              <span style={{ fontSize: 14, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>
                {new Date(vow.verdict_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </RitualCard>

        <TimelineBlock />

        <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {certificateUrl && (
            <ShareButton
              url={certificateUrl}
              text={`I kept my vow: "${vow.refined_text}"`}
              buttonText="Share your certificate"
            />
          )}
          <DashboardButton />
        </div>
      </RitualScreen>
    );
  }

  // ============================================================
  //  PHASE: BROKEN
  // ============================================================
  if (phase === 'broken') {
    return (
      <RitualScreen gradient="broken">
        <BackNav />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 16 }}>
          <StatusPill variant="broken">BROKEN</StatusPill>
          <h1 style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--uv-danger)', margin: 0 }}>
            You broke it.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', margin: 0 }}>
            {stakeLabel ? `${stakeLabel} goes to ${vow.destination}.` : 'The vow was not honored.'}
          </p>
        </div>

        <RitualCard>
          <p style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 17, fontWeight: 400, textAlign: 'center', color: 'var(--uv-text)', margin: 0 }}>
            &ldquo;{vow.refined_text}&rdquo;
          </p>
          <div style={{ height: 1, backgroundColor: 'var(--uv-border-strong)', margin: '12px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>Witnessed by</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)' }}>{vow.witness_name}</span>
          </div>
          {stakeLabel && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>Consequence</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-danger)', fontFamily: 'var(--uv-font-sans)' }}>{stakeLabel} &rarr; {vow.destination}</span>
            </div>
          )}
        </RitualCard>

        <TimelineBlock />

        <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <GoldCTA label="Make a new vow" onPress={() => router.push('/quick-vow')} />
          <DashboardButton />
        </div>
      </RitualScreen>
    );
  }

  // ============================================================
  //  PHASE: VOIDED
  // ============================================================
  return (
    <RitualScreen>
      <BackNav />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 16 }}>
        <StatusPill variant="voided">VOIDED</StatusPill>
        <h1 style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--uv-text-faint)', margin: 0 }}>
          You called it off.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', margin: 0 }}>
          {stakeLabel ? `${stakeLabel} was refunded.` : 'This vow was cancelled.'}
        </p>
      </div>

      <RitualCard>
        <p style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 17, fontWeight: 400, textAlign: 'center', color: 'var(--uv-text-faint)', margin: 0 }}>
          &ldquo;{vow.refined_text}&rdquo;
        </p>
      </RitualCard>

      <TimelineBlock />

      <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <GoldCTA label="Make a new vow" onPress={() => router.push('/quick-vow')} />
        <DashboardButton />
      </div>
    </RitualScreen>
  );
}

// Simple back nav for not-found state (outside component scope for early return)
function BackNavSimple() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push('/dashboard')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <ArrowLeft className="w-5 h-5" style={{ color: 'var(--uv-text-faint)' }} />
      <span style={{ fontSize: 14, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>Dashboard</span>
    </button>
  );
}

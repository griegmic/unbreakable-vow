'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Clock, Shield, MessageCircle, Ban, ChevronDown, ChevronUp, Share2, Eye, Trophy, XCircle } from 'lucide-react';
import { RitualScreen, RitualCard, GoldCTA, OutlinedGoldCTA } from '@/components/primitives';

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
        <OutlinedGoldCTA label="Withdraw vow" onPress={() => setVoidModalOpen(true)} />


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
        <OutlinedGoldCTA label="Never mind" onPress={() => setVoidModalOpen(false)} />
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
            <OutlinedGoldCTA label="or go solo" onPress={handleGoSolo} />
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
    const inviteShareText = vow.stake_amount > 0
      ? `I vowed to ${vow.refined_text.replace(/\.$/, '').toLowerCase()} and put ${stakeLabel} on it. You decide if I kept my word:`
      : `I vowed to ${vow.refined_text.replace(/\.$/, '').toLowerCase()}. If I fail, you get to call me out:`;

    return (
      <RitualScreen>
        <BackNav />
        <StatusPill variant="active">Active</StatusPill>

        <VowTitle text={vow.refined_text} sub={stakeSubtitle} />

        <CountdownSection />

        {/* Invite a witness - solo vows only */}
        {isSolo && witnessUrl && (
          <button type="button" style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }} onClick={async () => {
            if (navigator.share) {
              try { await navigator.share({ text: inviteShareText, url: witnessUrl }); } catch {}
            } else {
              await navigator.clipboard.writeText(`${inviteShareText} ${witnessUrl}`);
              setActionMsg('Link copied');
              setTimeout(() => setActionMsg(''), 2000);
            }
          }}>
            <RitualCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Eye className="w-[18px] h-[18px] shrink-0" style={{ color: 'var(--uv-text-faint)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, display: 'block', color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>Invite a witness</span>
                  <span style={{ fontSize: 12, display: 'block', marginTop: 2, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>People keep vows 3x more with someone watching.</span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <CopyLinkButton url={witnessUrl} />
                </div>
              </div>
            </RitualCard>
          </button>
        )}

        {/* Share vow */}
        {shareUrl && (
          <div style={{ marginTop: 12 }}>
            <ShareButton
              url={shareUrl}
              text={`My vow: "${vow.refined_text}"`}
              buttonText="Share vow"
            />
          </div>
        )}

        <TimelineBlock />
        <WithdrawButton />
        <VoidConfirmModal />
        <DevVerdictButtons />
        <ActionMessage />

        {/* Footer CTAs */}
        <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!isSolo && vow.witness_phone && (
            <GoldCTA label={`Text ${vow.witness_name}`} onPress={handleTextWitness} />
          )}
          <DashboardButton />
        </div>
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
          <GoldCTA label="Make a new vow" onPress={() => router.push('/create')} />
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
        <GoldCTA label="Make a new vow" onPress={() => router.push('/create')} />
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

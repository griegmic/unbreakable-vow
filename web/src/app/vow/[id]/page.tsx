'use client';
import React, { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock, Shield, MessageCircle, Ban, ChevronDown, ChevronUp, Share2, Eye, Trophy, XCircle, Check, Link2, Copy } from 'lucide-react';
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
import { ShareButton } from '@/components/share-button';
import { HamburgerMenu } from '@/components/hamburger-menu';
import Timeline from '@/components/timeline';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { antiCauses } from '@/lib/vow-logic';
import type { Database } from '@/lib/types';
import {
  FlowCard,
  FlowCTA,
  FlowGrid,
  FlowJob,
  FlowLabel,
  FlowMeta,
  FlowMeter,
  FlowSecondary,
  FlowShell,
  FlowSpacer,
  FlowStamp,
  FlowStatus,
  FlowSub,
  FlowTitle,
  FlowTop,
  FlowVow,
  shortDestinationName,
} from '@/components/vow-flow-ui';

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

function VowDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
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

  // Post-seal celebration overlay
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebPhase, setCelebPhase] = useState<'seal' | 'text' | 'share' | 'fade' | 'done'>('seal');
  const [shareSent, setShareSent] = useState(false);
  const celebTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Track whether we've already transitioned out of 'text' phase
  const textTransitionDoneRef = useRef(false);

  useEffect(() => {
    if (searchParams.get('sealed') === '1') {
      setShowCelebration(true);
      textTransitionDoneRef.current = false;

      const prefersReducedMotion = typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      setCelebPhase(prefersReducedMotion ? 'text' : 'seal');

      if (!prefersReducedMotion) {
        const t1 = setTimeout(() => setCelebPhase('text'), 140);
        celebTimersRef.current.push(t1);
      }
    }
    return () => {
      celebTimersRef.current.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vow-aware celebration transition: once vow loads and we're past the text display time, decide share vs fade
  useEffect(() => {
    if (!showCelebration || celebPhase !== 'text' || textTransitionDoneRef.current || !vow) return;

    // One short confirmation beat, then move to the next real job.
    const minTextTime = setTimeout(() => {
      if (textTransitionDoneRef.current) return;
      textTransitionDoneRef.current = true;

      const isSelfWitness = vow.witness_name === 'Just me';
      if (!isSelfWitness) {
        setCelebPhase('share');
      } else {
        setCelebPhase('fade');
        const t1 = setTimeout(() => {
          setCelebPhase('done');
          setShowCelebration(false);
          router.replace(`/vow/${vowId}`, { scroll: false });
        }, 500);
        celebTimersRef.current.push(t1);
      }
    }, 1100);

    celebTimersRef.current.push(minTextTime);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCelebration, celebPhase, vow]);

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
    const interval = setInterval(fetchVow, 5000);
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

  // Celebration share handlers
  const handleCelebTextWitness = () => {
    if (!vow || !vow.witness_invite_token || !origin) return;
    const wUrl = `${origin}/w/${vow.witness_invite_token}`;
    const smsBody = encodeURIComponent(
      `I just made an Unbreakable Vow: "${vow.refined_text}" \u2014 and I need you to hold me to it.\n\n${wUrl}`
    );
    const phone = vow.witness_phone;
    if (phone) {
      const cleanPhone = phone.replace(/[^\d+\-]/g, '');
      window.location.href = `sms:${cleanPhone}?body=${smsBody}`;
    } else if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ text: decodeURIComponent(smsBody) }).catch(() => {});
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${decodeURIComponent(smsBody)}`).catch(() => {});
    }
    setShareSent(true);
    const t = setTimeout(() => {
      setCelebPhase('fade');
      const t2 = setTimeout(() => {
        setCelebPhase('done');
        setShowCelebration(false);
        router.replace(`/vow/${vowId}`, { scroll: false });
      }, 500);
      celebTimersRef.current.push(t2);
    }, 1200);
    celebTimersRef.current.push(t);
  };

  const handleCelebSkipShare = () => {
    setCelebPhase('fade');
    const t = setTimeout(() => {
      setCelebPhase('done');
      setShowCelebration(false);
      router.replace(`/vow/${vowId}`, { scroll: false });
    }, 500);
    celebTimersRef.current.push(t);
  };

  const [celebCopied, setCelebCopied] = useState(false);
  const handleCelebCopyLink = async () => {
    if (!vow || !vow.witness_invite_token || !origin) return;
    const wUrl = `${origin}/w/${vow.witness_invite_token}`;
    try {
      await navigator.clipboard.writeText(wUrl);
      setCelebCopied(true);
      setTimeout(() => setCelebCopied(false), 2000);
    } catch {}
  };

  // Post-seal celebration overlay
  if (showCelebration && celebPhase !== 'done') {
    const celebWitnessName = vow?.witness_name && !['Your witness', 'Witness'].includes(vow.witness_name)
      ? vow.witness_name : 'your witness';
    const celebWitnessUrl = vow?.witness_invite_token && origin
      ? `${origin}/w/${vow.witness_invite_token}` : '';
    const truncatedUrl = celebWitnessUrl.length > 40
      ? celebWitnessUrl.slice(0, 37) + '...' : celebWitnessUrl;
    const celebVowText = vow?.refined_text?.trim() || 'Your vow';
    const truncatedVowText = celebVowText.length > 54
      ? `${celebVowText.slice(0, 51).trim()}...`
      : celebVowText;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: '#0F0D0A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: celebPhase === 'fade' ? 0 : 1,
          transition: 'opacity 500ms ease',
          padding: '0 24px',
        }}
      >
        {/* Seal + text phases */}
        {(celebPhase === 'seal' || celebPhase === 'text') && (
          <>
            <div
              style={{
                position: 'relative',
                width: 126,
                height: 126,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(212,169,85,0.24)' }} />
              <div style={{ position: 'absolute', inset: 13, borderRadius: '50%', border: '1px solid rgba(212,169,85,0.38)' }} />
              <div
                style={{
                  width: 94,
                  height: 94,
                  borderRadius: 26,
                  background: 'radial-gradient(circle at 30% 22%, #F2C766 0%, #E8B656 30%, #C89B3C 62%, #8B6820 100%)',
                  boxShadow: '0 0 0 1px rgba(139,104,32,0.45), 0 18px 50px rgba(200,155,60,0.32)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: celebPhase === 'seal' ? 'scale(0.96)' : 'scale(1)',
                  transition: 'transform 420ms cubic-bezier(.2,.9,.2,1)',
                }}
              >
                <Check style={{ width: 42, height: 42, color: '#1A1205', strokeWidth: 3 }} />
              </div>
            </div>

            <div
              style={{
                textAlign: 'center',
                opacity: celebPhase === 'text' ? 1 : 0,
                transform: celebPhase === 'text' ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 300ms ease, transform 300ms ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <p style={{
                fontFamily: 'var(--uv-font-sans)',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--uv-gold-bright, #F2C766)',
                margin: '0 0 12px',
              }}>
                Sealed
              </p>
              <p
                style={{
                  fontFamily: 'var(--uv-font-serif)',
                  fontSize: 38,
                  lineHeight: 1.04,
                  fontWeight: 400,
                  color: 'var(--uv-text)',
                  margin: 0,
                }}
              >
                Your vow is<br />
                <em style={{ color: 'var(--uv-gold, #D4A955)', fontStyle: 'italic' }}>bound.</em>
              </p>
              <div style={{
                width: 92,
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(212,169,85,0.58), transparent)',
                margin: '20px 0 16px',
              }} />
              <p style={{
                fontFamily: 'var(--uv-font-serif)',
                fontStyle: 'italic',
                fontSize: 20,
                lineHeight: 1.28,
                color: 'var(--uv-text)',
                margin: '0 0 9px',
                maxWidth: 300,
              }}>
                &ldquo;{truncatedVowText}&rdquo;
              </p>
              <p style={{
                fontFamily: 'var(--uv-font-sans)',
                fontSize: 13,
                lineHeight: 1.4,
                color: 'var(--uv-text-muted)',
                margin: 0,
              }}>
                Next: send the witness link.
              </p>
            </div>
          </>
        )}

        {/* Share phase — tell your witness */}
        {celebPhase === 'share' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 360,
            animation: 'uv-celeb-share-in 400ms ease both',
          }}>
            <style>{`@keyframes uv-celeb-share-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

            {/* Gold checkmark circle */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 22%, #F2C766 0%, #E8B656 30%, #C89B3C 62%, #8B6820 100%)',
              boxShadow: '0 0 0 1px rgba(139,104,32,0.45), 0 8px 24px rgba(200,155,60,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Check style={{ width: 24, height: 24, color: '#1A1205', strokeWidth: 3 }} />
            </div>

            {/* Headline */}
            <p style={{
              fontFamily: 'var(--uv-font-serif)',
              fontStyle: 'italic',
              fontSize: 28,
              fontWeight: 400,
              color: 'var(--uv-gold, #D4A955)',
              margin: '0 0 8px',
              textAlign: 'center',
            }}>
              Now tell {celebWitnessName}.
            </p>

            {/* Subtext */}
            <p style={{
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 14,
              lineHeight: 1.4,
              color: 'var(--uv-text-muted)',
              margin: '0 0 28px',
              textAlign: 'center',
            }}>
              They accept, then the vow starts.
            </p>

            {/* Primary CTA: Text witness */}
            <div style={{ width: '100%', marginBottom: 12 }}>
              <GoldCTA
                label={shareSent ? 'Sent \u2713' : (vow?.witness_phone ? `Text ${celebWitnessName} \u2192` : `Share with ${celebWitnessName} \u2192`)}
                onPress={handleCelebTextWitness}
                disabled={shareSent}
              />
            </div>

            {/* Secondary: skip */}
            <MutedSecondary
              label="I'll do it later"
              onPress={handleCelebSkipShare}
            />

            {/* Copy link row */}
            {celebWitnessUrl && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 20,
                padding: '10px 14px',
                background: 'var(--uv-bg-card, rgba(255,255,255,0.04))',
                borderRadius: 12,
                border: '1px solid var(--uv-border-soft, rgba(255,255,255,0.08))',
                width: '100%',
              }}>
                <Link2 style={{ width: 14, height: 14, color: 'var(--uv-text-faint)', flexShrink: 0 }} />
                <span style={{
                  flex: 1,
                  fontSize: 12,
                  fontFamily: 'var(--uv-font-sans)',
                  color: 'var(--uv-text-faint)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {truncatedUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCelebCopyLink}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontFamily: 'var(--uv-font-sans)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: celebCopied ? 'var(--uv-success, #4ADE80)' : 'var(--uv-gold, #D4A955)',
                    flexShrink: 0,
                  }}
                >
                  {celebCopied ? (
                    <>
                      <Check style={{ width: 12, height: 12 }} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy style={{ width: 12, height: 12 }} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

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
  const destinationShort = shortDestinationName(vow.destination);
  const isTerminal = ['kept', 'broken', 'voided'].includes(vow.status);

  const witnessLabel = isSolo
    ? "You're the judge"
    : vow.witness_accepted_at
    ? `${vow.witness_name} is watching`
    : vow.witness_name
    ? `Waiting for ${vow.witness_name}`
    : 'Your witness is watching';

  const witnessDisplayName = !vow.witness_name || ['Your witness', 'Witness'].includes(vow.witness_name)
    ? 'your witness'
    : vow.witness_name;

  const stakeSubtitle = vow.stake_amount > 0
    ? `${stakeLabel} at stake \u00b7 ${(destinationShort || vow.destination)} if broken`
    : 'Accountability only';
  const isAntiCause = vow.destination
    ? antiCauses.some(cause => vow.destination.toLowerCase().includes(cause.toLowerCase()))
    : false;

  // --- Handlers ---

  const handleGoSolo = async () => {
    if (actionBusy) return;
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
      setVow(current => current ? {
        ...current,
        witness_name: 'Just me',
        witness_phone: null,
        witness_accepted_at: null,
        witness_declined: false,
      } : current);
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

  const handleDoneEarly = async () => {
    if (actionBusy) return;

    if (isSolo) {
      router.push(`/self-resolve?id=${vow.id}`);
      return;
    }

    setActionBusy(true);
    setActionMsg('');

    try {
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      const freshSession = refreshErr ? null : refreshData.session;
      const sess = freshSession || session || (await supabase.auth.getSession()).data.session;
      if (!sess) {
        setActionMsg('Session expired. Please sign in again.');
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/request-early-completion`,
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

      const body = await res.json().catch(() => null);

      if (!res.ok || body?.error) {
        if (body?.error === 'witness_not_ready') {
          setActionMsg(`${witnessDisplayName} needs to accept first. Send the invite again.`);
        } else {
          setActionMsg(body?.message || body?.error || `Error ${res.status}`);
        }
        return;
      }

      if (body?.already_sent) {
        setActionMsg(`${witnessDisplayName} already has the release link.`);
      } else if (body?.sent === false && body?.verdict_url) {
        await navigator.clipboard.writeText(body.verdict_url);
        setActionMsg(`Release link copied. Send it to ${witnessDisplayName}.`);
      } else {
        setActionMsg(`Sent. If ${witnessDisplayName} agrees, they can release you now.`);
      }

      setTimelineKey(k => k + 1);
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Network error');
    } finally {
      setActionBusy(false);
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

  const CountdownSection = ({ statusLabel = witnessLabel }: { statusLabel?: string } = {}) => (
    <div style={{ margin: '16px 0' }}>
      {vow.ends_at && (
        <Countdown endsAt={vow.ends_at} startsAt={vow.starts_at || vow.sealed_at || undefined} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--uv-success)' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
          {statusLabel}
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

  const WithdrawButton = ({ compact = false }: { compact?: boolean }) => {
    if (!isMaker || isTerminal) return null;
    return (
      <div style={{ marginTop: compact ? 6 : 16, display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => setVoidModalOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--uv-text-faint)',
            cursor: 'pointer',
            fontFamily: 'var(--uv-font-sans)',
            fontSize: compact ? 12 : 13,
            padding: compact ? '6px 0' : '10px 0',
          }}
        >
          Withdraw vow
        </button>


      </div>
    );
  };

  const VoidConfirmModal = () => (
    <Modal open={voidModalOpen} onClose={() => setVoidModalOpen(false)} title="Withdraw vow?">
      <p style={{ fontSize: 14, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', marginBottom: 16, lineHeight: 1.5 }}>
        This will cancel your vow{vow.stake_amount > 0 ? ' and leave your wallet untouched' : ''}. This cannot be undone.
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

    const handleSendInvite = async () => {
      if (!witnessUrl) return;
      if (navigator.share) {
        try {
          await navigator.share({ text: nudgeShareText, url: witnessUrl });
        } catch {}
      } else if (vow.witness_phone) {
        const cleanPhone = vow.witness_phone.replace(/[^\d+\-]/g, '');
        const body = encodeURIComponent(`${nudgeShareText} ${witnessUrl}`);
        window.location.href = `sms:${cleanPhone}?body=${body}`;
      }
    };

    const handleCopyLink = async () => {
      if (!witnessUrl) return;
      try {
        await navigator.clipboard.writeText(witnessUrl);
        setActionMsg('Link copied');
        setTimeout(() => setActionMsg(''), 2000);
      } catch {}
    };

    return (
      <FlowShell>
        <FlowTop action="Dashboard" onAction={() => router.push('/dashboard')} />
        <FlowStatus tone="gold">One tap away</FlowStatus>
        <FlowTitle>{witnessDisplayName === 'your witness' ? 'Send the invite.' : `Get ${witnessDisplayName} in.`}</FlowTitle>
        <FlowSub>Your vow is sealed. {witnessDisplayName === 'your witness' ? 'Your witness needs to accept before it goes live.' : `${witnessDisplayName} needs to accept before it goes live.`}</FlowSub>
        <FlowCard hot compact>
          <FlowLabel>The vow</FlowLabel>
          <FlowVow>{vow.refined_text}</FlowVow>
          <FlowMeta items={[
            { label: stakeLabel ? `${stakeLabel} at stake` : 'Accountability only', gold: true },
            ...(destinationShort && stakeLabel ? [{ label: `${destinationShort} if broken` }] : []),
            ...(endDateFormatted ? [{ label: `Due ${endDateFormatted.split(',')[0]}` }] : []),
          ]} />
        </FlowCard>
        {witnessDeclined ? (
          <FlowJob title={`${vow.witness_name} declined`} body="You can continue solo, or choose someone else later." mark="!" />
        ) : (
          <FlowJob
            title="Next move"
            body={witnessDisplayName === 'your witness' ? 'Share the witness link. They accept, then they call it.' : `Send ${witnessDisplayName} the invite. They accept, then they call it.`}
            mark="→"
          />
        )}
        <FlowSpacer />
        {witnessDeclined ? (
          <FlowCTA onClick={handleGoSolo} disabled={actionBusy}>{actionBusy ? 'Switching...' : 'Go solo instead'}</FlowCTA>
        ) : (
          <>
            <FlowCTA tone="green" onClick={handleSendInvite}>{vow.witness_phone ? `Text ${witnessDisplayName} the invite` : 'Share witness invite'}</FlowCTA>
            <FlowSecondary onClick={handleCopyLink}>{actionMsg === 'Link copied' ? 'Copied!' : 'Copy invite link'}</FlowSecondary>
            <FlowSecondary onClick={handleGoSolo}>Judge it myself instead</FlowSecondary>
          </>
        )}
        <VoidConfirmModal />
        <ActionMessage />
      </FlowShell>
    );
  }

  // ============================================================
  //  PHASE: ACTIVE
  // ============================================================
  if (phase === 'active') {
    const cdDays = Math.floor(cdTime.totalMs / 86400000);
    const cdHrs = cdTime.hours % 24;
    const cdMin = cdTime.minutes;
    const endDateFull = endsAt
      ? endsAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
        ' at ' + endsAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '';
    const timeHeadline = cdDays > 0
      ? `${cdDays} ${cdDays === 1 ? 'day' : 'days'} left`
      : cdHrs > 0
        ? `${cdHrs}h ${cdMin}m left`
        : `${cdMin}m left`;
    const consequenceLine = vow.stake_amount > 0
      ? `${stakeLabel} on hold${vow.destination ? ` · ${vow.destination} if broken` : ''}`
      : 'No money on the line';
    const activeJudgeName = witnessDisplayName === 'your witness' ? 'Your witness' : witnessDisplayName;
    const judgeLine = isSolo
      ? 'You judge this one.'
      : vow.witness_accepted_at
        ? `${activeJudgeName} decides if you kept it.`
        : `Get ${witnessDisplayName} in before verdict day.`;
    const primaryLabel = isSolo
      ? 'Mark kept early'
      : vow.witness_accepted_at && !vow.witness_phone
        ? 'Share vow'
        : vow.witness_phone
        ? `Text ${witnessDisplayName} a check-in`
        : 'Send the invite';
    const showSecondaryShare = primaryLabel !== 'Share vow';
    const handleActiveShare = async () => {
      const text = `My vow: "${vow.refined_text}"${stakeLabel ? ` — ${stakeLabel} on the line` : ''}`;
      if (navigator.share) {
        try { await navigator.share({ text, url: shareUrl }); } catch {}
      } else {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
        setActionMsg('Link copied');
        setTimeout(() => setActionMsg(''), 2000);
      }
    };
    const handleActiveInvite = async () => {
      const text = vow.stake_amount > 0
        ? `I vowed to ${vow.refined_text.replace(/\.$/, '').toLowerCase()} and put ${stakeLabel} on it. Will you judge me?`
        : `I vowed to ${vow.refined_text.replace(/\.$/, '').toLowerCase()}. Will you judge me?`;
      const url = witnessUrl || shareUrl;
      if (navigator.share) {
        try { await navigator.share({ text, url }); } catch {}
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setActionMsg('Invite link copied');
        setTimeout(() => setActionMsg(''), 2000);
      }
    };
    const handlePrimaryActiveAction = () => {
      if (isSolo) {
        handleDoneEarly();
      } else if (vow.witness_phone) {
        handleTextWitness();
      } else if (vow.witness_accepted_at) {
        handleActiveShare();
      } else {
        handleActiveInvite();
      }
    };

    return (
      <FlowShell>
        <FlowTop action="Dashboard" onAction={() => router.push('/dashboard')} />
        <FlowStatus>Vow live</FlowStatus>
        <FlowCard hot compact>
          <FlowLabel>The vow</FlowLabel>
          <FlowVow>{vow.refined_text}</FlowVow>
          <FlowMeta items={[
            { label: stakeLabel ? `${stakeLabel} on hold` : 'Your word', gold: true },
            { label: isSolo ? 'You judge' : vow.witness_accepted_at ? `${activeJudgeName} is watching` : `${witnessDisplayName} pending` },
          ]} />
        </FlowCard>
        {vow.ends_at && (
          <FlowCard>
            <FlowLabel>Time left</FlowLabel>
            <p style={{ margin: '0 0 10px', color: 'var(--uv-gold-bright)', fontFamily: 'var(--uv-font-sans)', fontSize: 44, lineHeight: 1, fontWeight: 820, letterSpacing: 0, fontVariantNumeric: 'tabular-nums' }}>
              {timeHeadline}
            </p>
            <p style={{ margin: '0 0 14px', color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', fontSize: 14.5, lineHeight: 1.4 }}>
              Verdict by {endDateFull || endDateFormatted}.
            </p>
            <FlowMeter pct={vow.starts_at && vow.ends_at ? Math.round(((Date.now() - new Date(vow.starts_at).getTime()) / (new Date(vow.ends_at).getTime() - new Date(vow.starts_at).getTime())) * 100) : 42} />
          </FlowCard>
        )}
        <FlowJob
          title={isSolo ? 'Keep going' : vow.witness_accepted_at ? 'Keep going' : 'Next move'}
          body={isSolo ? 'You call this one when it is done.' : vow.witness_accepted_at ? `${activeJudgeName} decides if you kept your word.` : `Send ${witnessDisplayName} the invite so they can accept.`}
        />
        <FlowSpacer />
        <FlowCTA tone="green" onClick={handlePrimaryActiveAction} disabled={actionBusy}>{actionBusy ? 'Working...' : primaryLabel}</FlowCTA>
        {!isSolo && <FlowSecondary onClick={handleDoneEarly}>Ask {witnessDisplayName} to release me early</FlowSecondary>}
        {showSecondaryShare && <FlowSecondary onClick={handleActiveShare}>Share vow</FlowSecondary>}
        <VoidConfirmModal />
        <DevVerdictButtons />
        <ActionMessage />
      </FlowShell>
    );
  }

  // ============================================================
  //  PHASE: VERDICT WAITING
  // ============================================================
  if (phase === 'verdict_waiting') {
    const witnessAccepted = !!vow.witness_accepted_at;
    const canSelfResolve = isMaker && (isSolo || !witnessAccepted);

    return (
      <FlowShell>
        <FlowTop action="Dashboard" onAction={() => router.push('/dashboard')} />
        <FlowStatus tone="gold">Verdict due</FlowStatus>
        <FlowTitle>
          {isWitness ? 'Time to call it.' : isSolo ? "Time's up." : `Time's up.`}<br/>
          <span style={{ color: 'var(--uv-gold-bright)' }}>{isSolo ? 'You decide.' : `${vow.witness_name || 'Your witness'} decides.`}</span>
        </FlowTitle>
        <FlowSub>{isSolo ? 'How did it go?' : witnessAccepted ? 'They have the verdict link. Give them a nudge if you need to.' : `${vow.witness_name} never accepted. You can self-resolve.`}</FlowSub>
        <FlowCard hot compact>
          <FlowLabel>The vow</FlowLabel>
          <FlowVow>{vow.refined_text}</FlowVow>
          <FlowMeta items={[
            { label: stakeLabel ? `${stakeLabel} at stake` : 'Accountability only', gold: true },
            ...(destinationShort && stakeLabel ? [{ label: `${destinationShort} if broken` }] : []),
            { label: 'Ended today' },
          ]} />
        </FlowCard>
        <FlowJob title="Now we wait" body={stakeLabel ? 'Kept means wallet untouched. Broken means donation.' : 'Kept means honored. Broken means the record stands.'} mark="?" />
        <FlowSpacer />
        {canSelfResolve && <FlowCTA onClick={() => router.push(`/self-resolve?id=${vow.id}`)}>Deliver your verdict</FlowCTA>}
        {isMaker && witnessAccepted && vow.witness_phone && (
          <FlowCTA tone="green" onClick={() => { if (vow.witness_phone) window.open(`sms:${vow.witness_phone}`, '_self'); }}>Nudge {vow.witness_name} to decide</FlowCTA>
        )}
        {isMaker && witnessAccepted && !vow.witness_phone && (
          <FlowCTA tone="green" onClick={async () => {
            if (!witnessUrl) return;
            const verdictUrl = `${witnessUrl}/verdict`;
            const text = `Time to deliver the verdict on my vow: "${vow.refined_text}"`;
            if (navigator.share) {
              await navigator.share({ text, url: verdictUrl }).catch(() => {});
            } else {
              await navigator.clipboard.writeText(`${text}\n${verdictUrl}`);
              setActionMsg('Verdict link copied.');
            }
          }}>Nudge {vow.witness_name} to decide</FlowCTA>
        )}
        {isWitness && vow.witness_invite_token && (
          <FlowCTA onClick={() => router.push(`/w/${vow.witness_invite_token}/verdict`)}>Deliver your verdict</FlowCTA>
        )}
        <FlowSecondary onClick={() => router.push('/dashboard')}>Back to dashboard</FlowSecondary>
        <VoidConfirmModal />
        <DevVerdictButtons />
        <ActionMessage />
      </FlowShell>
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
    const verdictLabel = endDateFormatted ? `You judge on ${endDateFormatted}.` : 'You judge when time is up.';

    return (
      <RitualScreen>
        <BackNav />
        <StatusPill variant="active">Challenge active</StatusPill>

        <VowTitle text={vow.refined_text} sub={`${targetName} accepted. The clock is ticking.`} />

        <CountdownSection statusLabel={verdictLabel} />
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
          <h1 style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 34, lineHeight: 1.04, fontWeight: 850, color: 'var(--uv-text)', margin: 0, textAlign: 'center' }}>
            {isAntiCause ? 'Crisis averted.' : 'You actually did it.'}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', margin: 0, textAlign: 'center', lineHeight: 1.45 }}>
            {isAntiCause && stakeLabel
              ? `${stakeLabel} stayed away from ${vow.destination}.`
              : `${vow.witness_name} confirmed. Your word is gold.`}
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
              <span style={{ fontSize: 13, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>Stake</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-success)', fontFamily: 'var(--uv-font-sans)' }}>{isAntiCause ? `${stakeLabel} saved` : `${stakeLabel} returned`}</span>
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
              buttonText={isAntiCause && stakeLabel ? `Tell everyone you saved ${stakeLabel}` : 'Share your win'}
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
          <h1 style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 34, lineHeight: 1.04, fontWeight: 850, color: 'var(--uv-text)', margin: 0, textAlign: 'center' }}>
            {isAntiCause ? 'Brutal. You broke it.' : 'You broke it.'}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', margin: 0 }}>
            {stakeLabel ? `${stakeLabel} ${isAntiCause ? 'just went to' : 'goes to'} ${vow.destination}.` : 'The vow was not honored.'}
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
          <GoldCTA label={isAntiCause ? 'Make a new vow - win it back' : 'Make a new vow'} onPress={() => router.push('/quick-vow')} />
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
          {stakeLabel ? `${stakeLabel} stays untouched.` : 'This vow was cancelled.'}
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

export default function VowDetailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: 'var(--uv-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--uv-gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'uv-spin 600ms linear infinite' }} />
        <style>{`@keyframes uv-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <VowDetailContent />
    </Suspense>
  );
}

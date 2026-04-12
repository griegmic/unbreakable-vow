'use client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Calendar, Shield, Clock, Check, Eye, MessageCircle, LayoutGrid, ChevronRight, Flame, Zap, PartyPopper } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, PrimaryButton, SecondaryButton, StatPill, FadeUp, HeaderBadge } from '@/components/ui';
import { HamburgerMenu } from '@/components/hamburger-menu';
import { ShareButton, CopyLinkButton } from '@/components/share-button';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { getDailyNudge } from '@/lib/vow-logic';
import type { Database } from '@/lib/types';

type VowRow = Database['public']['Tables']['vows']['Row'];
type Vow = Omit<VowRow, 'stripe_payment_intent_id'>;
type VowPhase = 'witness_pending' | 'vow_active' | 'verdict_due';

function getCountdownTint(days: number | null) {
  if (days === null) return { bg: 'rgba(82,214,154,0.06)', border: 'rgba(82,214,154,0.18)' };
  if (days <= 0) return { bg: 'rgba(255,123,123,0.10)', border: 'rgba(255,123,123,0.25)' };
  if (days === 1) return { bg: 'rgba(255,180,80,0.10)', border: 'rgba(255,180,80,0.25)' };
  if (days <= 3) return { bg: 'rgba(212,162,79,0.08)', border: 'rgba(212,162,79,0.20)' };
  return { bg: 'rgba(82,214,154,0.06)', border: 'rgba(82,214,154,0.18)' };
}

const cheekyLabelTemplates = [
  'Report to {name}',
  'Text {name} an update',
  'Prove it to {name}',
  'Check in with {name}',
  'Let {name} know',
  'Update {name}',
];

export default function LivePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [vow, setVow] = useState<Vow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [origin, setOrigin] = useState('');
  const [lastCheckIn, setLastCheckIn] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dailyNudge = useMemo(() => getDailyNudge(), []);

  const fetchVow = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: rows } = await supabase.from('vows')
      .select('id, user_id, raw_input, refined_text, status, witness_name, witness_phone, witness_invite_token, stake_amount, consequence, destination, starts_at, ends_at, verdict, verdict_at, witness_accepted_at, witness_declined, sealed_at, created_at')
      .eq('user_id', session.user.id)
      .in('status', ['sealed', 'active', 'awaiting_verdict'])
      .order('created_at', { ascending: false })
      .limit(5);

    // Prioritize: awaiting_verdict > active with past deadline > most recent
    const pick = rows?.find(v => v.status === 'awaiting_verdict')
      || rows?.find(v => v.status === 'active' && v.ends_at && new Date(v.ends_at) <= new Date())
      || rows?.[0]
      || null;

    setVow(pick);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    fetchVow();

    // Poll every 10 seconds for witness status changes
    intervalRef.current = setInterval(fetchVow, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, authLoading, router, fetchVow]);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  useEffect(() => {
    if (!vow) return;
    const stored = localStorage.getItem(`lastCheckIn-${vow.id}`);
    if (stored) setLastCheckIn(Number(stored));
  }, [vow]);

  const checkInCooldown = lastCheckIn ? (Date.now() - lastCheckIn) < 4 * 60 * 60 * 1000 : false;

  const handleCheckIn = async (mood: 'on_track' | 'struggling' | 'done_early') => {
    if (!vow || actionBusy || checkInCooldown) return;
    setActionBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from('audit_events').insert({
        vow_id: vow.id,
        event_type: 'check_in',
        actor_type: 'maker',
        actor_id: session.user.id,
        metadata: { mood },
      });
      const now = Date.now();
      setLastCheckIn(now);
      localStorage.setItem(`lastCheckIn-${vow.id}`, String(now));
      const labels = { on_track: 'On track', struggling: 'Struggling', done_early: 'Crushing it' };
      setActionMsg(`Checked in: ${labels[mood]}`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch {
      setActionMsg('Check-in failed. Try again.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleGoSolo = async () => {
    if (!vow || actionBusy) return;
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
      <RitualScreen
        footer={<PrimaryButton label="Make a vow" onPress={() => router.push('/create')} />}
      >
        <FadeUp>
          <div className="flex items-center justify-between">
            <HeaderBadge />
            <HamburgerMenu />
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <p className="text-[17px] font-serif text-center" style={{ color: 'var(--text-secondary)' }}>
              No active vow right now.
            </p>
          </div>
        </FadeUp>
      </RitualScreen>
    );
  }

  // ── Derived state ──
  const endsAt = vow.ends_at ? new Date(vow.ends_at) : null;
  const now = new Date();
  const isVerdictDue = endsAt ? now >= endsAt : false;
  const daysLeft = endsAt ? Math.ceil((endsAt.getTime() - now.getTime()) / 86400000) : null;
  const hoursLeft = endsAt ? Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60))) : 0;
  const witnessUrl = vow.witness_invite_token && origin ? `${origin}/w/${vow.witness_invite_token}` : '';
  const isSolo = vow.witness_name === 'Just me';

  const witnessPending = !isSolo && !vow.witness_accepted_at && !vow.witness_declined;
  const witnessDeclined = !isSolo && vow.witness_declined;
  const witnessAccepted = !isSolo && !!vow.witness_accepted_at;

  const phase: VowPhase = isVerdictDue ? 'verdict_due'
    : witnessPending ? 'witness_pending'
    : 'vow_active';

  const countdownLabel = daysLeft === null ? null
    : daysLeft <= 0 ? "Today's the day"
    : daysLeft === 1 ? 'Last day'
    : `${daysLeft} days left`;

  const tint = getCountdownTint(daysLeft);
  const hasRealName = vow.witness_name && vow.witness_name !== 'Your witness' && vow.witness_name !== 'Just me';
  const witnessLabel = isSolo ? "You're the judge" : hasRealName ? `${vow.witness_name} is watching` : 'Your witness is watching';
  const endDateFormatted = endsAt?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) || '—';

  const todaysLabel = (() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % cheekyLabelTemplates.length;
    return cheekyLabelTemplates[dayIndex].replace('{name}', vow.witness_name);
  })();

  const stakeNudge = vow.stake_amount > 0 ? ` I put $${Math.round(vow.stake_amount / 100)} on it.` : '';
  const nudgeShareText = `Hey, did you see my vow? "${vow.refined_text.replace(/\.$/, '')}"${stakeNudge} I need you to accept:`;

  const handleTextWitness = () => {
    const phone = vow.witness_phone;
    const stakeLabel = vow.stake_amount ? `$${vow.stake_amount / 100}` : '';
    const body = encodeURIComponent(
      `Still holding my vow: "${vow.refined_text}"${stakeLabel ? ` — ${stakeLabel} on the line` : ''}. Just checking in 👀`
    );
    if (phone) {
      const cleanPhone = phone.replace(/[^\d+\-]/g, '');
      // ?&body= works cross-platform (iOS Safari + Android)
      window.location.href = `sms:${cleanPhone}?body=${body}`;
    } else {
      // Desktop or no phone: copy message to clipboard
      const msg = decodeURIComponent(body);
      if (navigator.share) {
        navigator.share({ text: msg }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(msg).then(() => {
          setActionMsg('Message copied to clipboard');
          setTimeout(() => setActionMsg(''), 2000);
        });
      }
    }
  };

  // ── VERDICT DUE phase ──
  if (phase === 'verdict_due') {
    return (
      <RitualScreen
        footer={
          <div className="flex flex-col gap-2">
            {isSolo ? (
              <PrimaryButton label="Deliver your verdict" onPress={() => router.push('/self-resolve')} />
            ) : witnessAccepted ? (
              <ShareButton
                url={witnessUrl ? `${witnessUrl}/verdict` : ''}
                text={`Time to deliver the verdict on my vow: "${vow.refined_text}"`}
                buttonText={`Nudge ${vow.witness_name} to decide`}
              />
            ) : (
              <PrimaryButton label="Judge it yourself" onPress={handleGoSolo} loading={actionBusy} />
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-[14px] min-h-[46px] flex items-center justify-between px-4 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        }
      >
        <FadeUp>
          <div className="flex items-center justify-between">
            <HeaderBadge />
            <HamburgerMenu />
          </div>
        </FadeUp>

        {/* Status badge */}
        <FadeUp delay={0.05}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--gold)' }} />
            <span className="text-[13px] font-semibold uppercase tracking-[0.5px]" style={{ color: 'var(--gold)' }}>VERDICT DUE</span>
          </div>
        </FadeUp>

        <FadeUp delay={0.08}>
          <TitleBlock
            title="Time's up."
            subtitle={isSolo ? 'How did it go?' : `${vow.witness_name}, it's your call.`}
          />
        </FadeUp>

        <FadeUp delay={0.12}>
          <RitualCard>
            <p className="text-[17px] font-serif font-medium" style={{ color: 'var(--text)' }}>{vow.refined_text}</p>
            <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>At stake</span>
              <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)}` : 'Accountability only'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>If broken</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{vow.destination}</span>
            </div>
          </RitualCard>
        </FadeUp>

        {actionMsg && (
          <FadeUp>
            <p className="text-[13px] text-center" style={{ color: 'var(--text-secondary)' }}>{actionMsg}</p>
          </FadeUp>
        )}
      </RitualScreen>
    );
  }

  // ── WITNESS PENDING phase ──
  if (phase === 'witness_pending') {
    return (
      <RitualScreen
        footer={
          <div className="flex flex-col gap-2">
            {witnessDeclined ? (
              <PrimaryButton label="Go solo instead" onPress={handleGoSolo} loading={actionBusy} />
            ) : null}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-[14px] min-h-[46px] flex items-center justify-between px-4 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        }
      >
        <FadeUp>
          <div className="flex items-center justify-between">
            <HeaderBadge />
            <HamburgerMenu />
          </div>
        </FadeUp>

        {/* Status badge */}
        <FadeUp delay={0.05}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--gold)' }} />
            <span className="text-[13px] font-semibold uppercase tracking-[0.5px]" style={{ color: 'var(--gold)' }}>VOW PENDING</span>
          </div>
        </FadeUp>

        <FadeUp delay={0.08}>
          <TitleBlock
            title={vow.refined_text}
            subtitle={vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)} at stake · ${vow.destination} if broken` : 'Accountability only'}
          />
        </FadeUp>

        {/* Witness declined */}
        {witnessDeclined && (
          <FadeUp delay={0.12}>
            <div
              className="rounded-[20px] p-5 flex flex-col gap-3"
              style={{ backgroundColor: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)' }}
            >
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>{vow.witness_name} declined.</span>
              <p className="text-[13px] leading-[19px]" style={{ color: 'var(--text-secondary)' }}>
                You can continue solo — you&apos;ll judge the vow yourself on verdict day.
              </p>
            </div>
          </FadeUp>
        )}

        {/* Witness pending — nudge card */}
        {!witnessDeclined && witnessUrl && (
          <FadeUp delay={0.12}>
            <div
              className="rounded-[20px] p-5 flex flex-col gap-3"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(212,162,79,0.15)' }}>
                  <Clock className="w-[18px] h-[18px]" style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <span className="text-[15px] font-semibold block" style={{ color: 'var(--text)' }}>Waiting for your witness to step forward</span>
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {vow.witness_phone ? 'We texted them an invite. Nudge if they haven\u2019t checked yet.' : 'Share the invite so they can accept and start watching.'}
                  </span>
                </div>
              </div>
              <ShareButton
                url={witnessUrl}
                text={nudgeShareText}
                buttonText={vow.witness_phone ? 'Nudge your witness' : 'Send the invite'}
              />
              <div className="flex items-center gap-2">
                <div className="rounded-[10px] py-2 px-3 flex-1 min-w-0" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{witnessUrl}</p>
                </div>
                <CopyLinkButton url={witnessUrl} />
              </div>
            </div>
          </FadeUp>
        )}

        {/* "or go solo" link */}
        {!witnessDeclined && (
          <FadeUp delay={0.16}>
            <button
              onClick={handleGoSolo}
              disabled={actionBusy}
              className="w-full py-2 flex items-center justify-center gap-2"
            >
              <Shield className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>or go solo</span>
            </button>
          </FadeUp>
        )}

        {/* Time info */}
        <FadeUp delay={0.2}>
          <div className="flex gap-3">
            <StatPill value={daysLeft != null && daysLeft > 0 ? `${daysLeft}d` : `${hoursLeft}h`} label="Time left" />
            <StatPill value={endDateFormatted} label="Verdict day" />
          </div>
        </FadeUp>

        {actionMsg && (
          <FadeUp>
            <p className="text-[13px] text-center" style={{ color: 'var(--text-secondary)' }}>{actionMsg}</p>
          </FadeUp>
        )}
      </RitualScreen>
    );
  }

  // ── VOW ACTIVE phase (default) ──
  return (
    <RitualScreen
      footer={
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full rounded-[14px] min-h-[46px] flex items-center justify-between px-4 transition-transform active:scale-[0.98]"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
          <button
            onClick={() => router.push('/?new=1')}
            className="w-full rounded-[14px] min-h-[42px] flex items-center justify-center px-4 transition-transform active:scale-[0.98]"
            style={{ color: 'var(--gold-bright)' }}
          >
            <span className="text-[13px] font-semibold">+ Make another vow</span>
          </button>
        </div>
      }
    >
      <FadeUp>
          <div className="flex items-center justify-between">
            <HeaderBadge />
            <HamburgerMenu />
          </div>
        </FadeUp>

      {/* Status badge */}
      <FadeUp delay={0.05}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
          <span className="text-[13px] font-semibold uppercase tracking-[0.5px]" style={{ color: 'var(--success)' }}>VOW ACTIVE</span>
        </div>
      </FadeUp>

      {/* Vow text */}
      <FadeUp delay={0.08}>
        <TitleBlock
          title={vow.refined_text}
          subtitle={vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)} at stake · ${vow.destination} if broken` : 'Accountability only'}
        />
      </FadeUp>

      {/* Countdown card */}
      <FadeUp delay={0.12}>
        <div
          className="rounded-[20px] p-5 flex flex-col gap-2"
          style={{ backgroundColor: tint.bg, border: `1px solid ${tint.border}` }}
        >
          <span className="text-[22px] font-bold" style={{ color: 'var(--text)' }}>
            {countdownLabel ?? 'Vow active'}
          </span>
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Verdict day: {endDateFormatted}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: 'var(--success)' }} />
            <span className="text-[13px] font-semibold" style={{ color: 'var(--success)' }}>
              {witnessLabel}
            </span>
          </div>
          <p className="text-[12px] italic mt-2" style={{ color: 'var(--text-muted)' }}>
            {dailyNudge}
          </p>
        </div>
      </FadeUp>

      {/* Check-in buttons */}
      <FadeUp delay={0.14}>
        <div className="flex gap-2">
          {([
            { mood: 'on_track' as const, label: 'On track', Icon: Flame },
            { mood: 'struggling' as const, label: 'Struggling', Icon: Zap },
            { mood: 'done_early' as const, label: 'Crushing it', Icon: PartyPopper },
          ]).map(({ mood, label, Icon }) => (
            <button
              key={mood}
              onClick={() => handleCheckIn(mood)}
              disabled={actionBusy || checkInCooldown}
              className="flex-1 rounded-[14px] py-3 flex flex-col items-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-40"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Icon className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </button>
          ))}
        </div>
        {checkInCooldown && (
          <p className="text-[11px] text-center mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Next check-in available in a few hours
          </p>
        )}
      </FadeUp>

      {/* SMS button for friend witnesses */}
      {!isSolo && (
        <FadeUp delay={0.16}>
          <button
            onClick={handleTextWitness}
            className="w-full rounded-[18px] min-h-[52px] flex items-center justify-center gap-2.5 transition-transform active:scale-[0.975]"
            style={{
              background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
              boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
            }}
          >
            <MessageCircle className="w-[18px] h-[18px]" color="#0B0D11" />
            <span className="text-[15px] font-extrabold" style={{ color: '#0B0D11' }}>
              {todaysLabel}
            </span>
          </button>
        </FadeUp>
      )}

      {/* Details card */}
      <FadeUp delay={0.2}>
        <RitualCard>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>If broken</span>
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{vow.destination}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Ends</span>
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{endDateFormatted}</span>
            </div>
          </div>
        </RitualCard>
      </FadeUp>

      {actionMsg && (
        <FadeUp>
          <p className="text-[13px] text-center" style={{ color: 'var(--text-secondary)' }}>{actionMsg}</p>
        </FadeUp>
      )}
    </RitualScreen>
  );
}

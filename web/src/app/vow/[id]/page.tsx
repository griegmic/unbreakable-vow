'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Clock, Shield, MessageCircle, Ban, ChevronDown, ChevronUp, Share2, Eye, Trophy, XCircle } from 'lucide-react';
import { RitualScreen, RitualCard, FadeUp, TitleBlock, PrimaryButton, StatPill } from '@/components/ui';
import { ShareButton, CopyLinkButton } from '@/components/share-button';
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

function getCountdownTint(days: number | null) {
  if (days === null) return { bg: 'rgba(82,214,154,0.06)', border: 'rgba(82,214,154,0.18)' };
  if (days <= 0) return { bg: 'rgba(255,123,123,0.10)', border: 'rgba(255,123,123,0.25)' };
  if (days === 1) return { bg: 'rgba(255,180,80,0.10)', border: 'rgba(255,180,80,0.25)' };
  if (days <= 3) return { bg: 'rgba(212,162,79,0.08)', border: 'rgba(212,162,79,0.20)' };
  return { bg: 'rgba(82,214,154,0.06)', border: 'rgba(82,214,154,0.18)' };
}

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
    if (witnessPending) return 'witness_pending'; // handles both pending and declined
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
  const phase = getPhase(vow, isMaker, isWitness, isTarget);

  const endsAt = vow.ends_at ? new Date(vow.ends_at) : null;
  const now = new Date();
  const daysLeft = endsAt ? Math.ceil((endsAt.getTime() - now.getTime()) / 86400000) : null;
  const hoursLeft = endsAt ? Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60))) : 0;
  const endDateFormatted = endsAt?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) || '—';
  const isSolo = vow.witness_name === 'Just me' && !vow.witness_accepted_at;
  const witnessUrl = vow.witness_invite_token && origin ? `${origin}/w/${vow.witness_invite_token}` : '';
  const shareUrl = origin ? `${origin}/outcome/${vow.id}` : '';
  const certificateUrl = origin ? `${origin}/certificate/${vow.id}` : '';
  const stakeLabel = vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)}` : null;
  const isTerminal = ['kept', 'broken', 'voided'].includes(vow.status);

  const countdownLabel = daysLeft === null ? null
    : daysLeft <= 0 ? "Today's the day"
    : daysLeft === 1 ? 'Last day'
    : `${daysLeft} days left`;

  const tint = getCountdownTint(daysLeft);

  const witnessLabel = isSolo
    ? "You're the judge"
    : vow.witness_accepted_at
    ? `${vow.witness_name} is watching`
    : vow.witness_name
    ? `Waiting for ${vow.witness_name}`
    : 'Your witness is watching';

  const stakeSubtitle = vow.stake_amount > 0
    ? `${stakeLabel} at stake · ${vow.destination} if broken`
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
      `Still holding my vow: "${vow.refined_text}"${stakeLabel ? ` — ${stakeLabel} on the line` : ''}. Just checking in`
    );
    if (phone) {
      const cleanPhone = phone.replace(/[^\d+\-]/g, '');
      window.location.href = `sms:${cleanPhone}?body=${body}`;
    } else if (navigator.share) {
      navigator.share({ text: decodeURIComponent(body) }).catch(() => {});
    }
  };

  const handleWithdraw = async () => {
    if (actionBusy) return;
    if (!confirm('This will cancel your vow' + (vow.stake_amount > 0 ? ' and refund your stake' : '') + '. Continue?')) return;
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
    <FadeUp>
      <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 py-2">
        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Dashboard</span>
      </button>
    </FadeUp>
  );

  const StatusBadge = ({ label, color, pulse }: { label: string; color: string; pulse?: boolean }) => (
    <FadeUp delay={0.05}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${pulse ? 'animate-pulse' : ''}`} style={{ backgroundColor: color }} />
        <span className="text-[13px] font-semibold uppercase tracking-[0.5px]" style={{ color }}>{label}</span>
      </div>
    </FadeUp>
  );

  const CountdownCard = () => (
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
      </div>
    </FadeUp>
  );

  const TimelineBlock = () => (
    <FadeUp delay={0.25}>
      <button
        onClick={() => setTimelineOpen(!timelineOpen)}
        className="w-full flex items-center justify-between py-2"
      >
        <span className="text-[12px] font-bold tracking-[1.2px] uppercase" style={{ color: 'var(--text-muted)' }}>
          Timeline
        </span>
        {timelineOpen
          ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        }
      </button>
      {timelineOpen && (
        <RitualCard>
          <Timeline key={timelineKey} vowId={vowId} endsAt={vow.ends_at} />
        </RitualCard>
      )}
    </FadeUp>
  );

  const WithdrawButton = () => {
    if (!isMaker || isTerminal) return null;
    return (
      <FadeUp delay={0.3}>
        <div className="flex flex-col gap-2">
          <button
            disabled={actionBusy}
            onClick={handleWithdraw}
            className="w-full min-h-[46px] rounded-[14px] flex items-center justify-center gap-2 transition-opacity"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', opacity: actionBusy ? 0.5 : 1 }}
          >
            <Ban className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              {actionBusy ? 'Withdrawing...' : 'Withdraw vow'}
            </span>
          </button>
        </div>
      </FadeUp>
    );
  };

  const DevVerdictButtons = () => {
    if (process.env.NODE_ENV !== 'development' || isTerminal || !vow.witness_invite_token) return null;
    return (
      <FadeUp delay={0.35}>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold tracking-[1px] uppercase text-center" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
            Fast-forward (testing)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleTestVerdict('kept')}
              disabled={verdictBusy}
              className="flex-1 min-h-[44px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97] disabled:opacity-40"
              style={{ backgroundColor: 'rgba(82,214,154,0.12)', border: '1px solid rgba(82,214,154,0.25)' }}
            >
              <span className="text-[13px] font-bold" style={{ color: 'var(--success)' }}>
                {verdictBusy ? '...' : 'Mark Kept'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTestVerdict('broken')}
              disabled={verdictBusy}
              className="flex-1 min-h-[44px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97] disabled:opacity-40"
              style={{ backgroundColor: 'rgba(255,123,123,0.12)', border: '1px solid rgba(255,123,123,0.25)' }}
            >
              <span className="text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
                {verdictBusy ? '...' : 'Mark Broken'}
              </span>
            </button>
          </div>
          {verdictError && (
            <p className="text-[13px] text-center" style={{ color: 'var(--danger)' }}>{verdictError}</p>
          )}
        </div>
      </FadeUp>
    );
  };

  // ══════════════════════════════════════════════
  //  PHASE: WITNESS PENDING
  // ══════════════════════════════════════════════
  if (phase === 'witness_pending') {
    const witnessDeclined = vow.witness_declined;
    const nudgeShareText = `Hey, did you see my vow? "${vow.refined_text.replace(/\.$/, '')}"${stakeLabel ? ` I put ${stakeLabel} on it.` : ''} I need you to accept:`;

    return (
      <RitualScreen
        footer={
          <div className="flex flex-col gap-2">
            {witnessDeclined ? (
              <PrimaryButton label="Go solo instead" onPress={handleGoSolo} loading={actionBusy} />
            ) : null}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-[14px] min-h-[46px] flex items-center justify-center px-4 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
            </button>
          </div>
        }
      >
        <BackNav />
        <StatusBadge label="Vow Pending" color="var(--gold)" pulse />

        <FadeUp delay={0.08}>
          <TitleBlock
            title={vow.refined_text}
            subtitle={stakeSubtitle}
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
                  <span className="text-[15px] font-semibold block" style={{ color: 'var(--text)' }}>Waiting for your witness</span>
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {vow.witness_phone ? 'We texted them an invite. Nudge if they haven\u2019t checked yet.' : 'Share the invite so they can accept.'}
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

        {/* Go solo link */}
        {!witnessDeclined && (
          <FadeUp delay={0.16}>
            <button onClick={handleGoSolo} disabled={actionBusy} className="w-full py-2 flex items-center justify-center gap-2">
              <Shield className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>or go solo</span>
            </button>
          </FadeUp>
        )}

        {/* Time stats */}
        <FadeUp delay={0.2}>
          <div className="flex gap-3">
            <StatPill value={daysLeft != null && daysLeft > 0 ? `${daysLeft}d` : `${hoursLeft}h`} label="Time left" />
            <StatPill value={endDateFormatted} label="Verdict day" />
          </div>
        </FadeUp>

        <TimelineBlock />
        <WithdrawButton />

        {actionMsg && (
          <FadeUp>
            <p className="text-[13px] text-center" style={{ color: 'var(--text-secondary)' }}>{actionMsg}</p>
          </FadeUp>
        )}
      </RitualScreen>
    );
  }

  // ══════════════════════════════════════════════
  //  PHASE: ACTIVE
  // ══════════════════════════════════════════════
  if (phase === 'active') {
    const inviteShareText = vow.stake_amount > 0
      ? `I vowed to ${vow.refined_text.replace(/\.$/, '').toLowerCase()} and put ${stakeLabel} on it. You decide if I kept my word:`
      : `I vowed to ${vow.refined_text.replace(/\.$/, '').toLowerCase()}. If I fail, you get to call me out:`;

    return (
      <RitualScreen
        footer={
          <div className="flex flex-col gap-2">
            {/* Primary CTA: text witness or invite witness */}
            {!isSolo && vow.witness_phone && (
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
                  Text {vow.witness_name}
                </span>
              </button>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-[14px] min-h-[46px] flex items-center justify-center px-4 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
            </button>
          </div>
        }
      >
        <BackNav />

        <FadeUp delay={0.05}>
          <TitleBlock
            title={vow.refined_text}
            subtitle={stakeSubtitle}
          />
        </FadeUp>

        <CountdownCard />

        {/* Invite a witness — solo vows only */}
        {isSolo && witnessUrl && (
          <FadeUp delay={0.16}>
            <button
              onClick={async () => {
                if (navigator.share) {
                  try { await navigator.share({ text: inviteShareText, url: witnessUrl }); } catch {}
                } else {
                  await navigator.clipboard.writeText(`${inviteShareText} ${witnessUrl}`);
                  setActionMsg('Link copied');
                  setTimeout(() => setActionMsg(''), 2000);
                }
              }}
              className="w-full rounded-[14px] p-3.5 flex items-center gap-3 text-left transition-all active:scale-[0.98]"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Eye className="w-[18px] h-[18px] shrink-0" style={{ color: 'var(--text-muted)' }} />
              <div className="flex-1 min-w-0">
                <span className="text-[14px] font-semibold block" style={{ color: 'var(--text-secondary)' }}>Invite a witness</span>
                <span className="text-[12px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>People keep vows 3x more with someone watching.</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <CopyLinkButton url={witnessUrl} />
              </div>
            </button>
          </FadeUp>
        )}

        {/* Share vow */}
        {shareUrl && (
          <FadeUp delay={0.22}>
            <ShareButton
              url={shareUrl}
              text={`My vow: "${vow.refined_text}"`}
              buttonText="Share vow"
            />
          </FadeUp>
        )}

        <TimelineBlock />
        <WithdrawButton />
        <DevVerdictButtons />

        {actionMsg && (
          <FadeUp>
            <p className="text-[13px] text-center" style={{ color: 'var(--text-secondary)' }}>{actionMsg}</p>
          </FadeUp>
        )}
      </RitualScreen>
    );
  }

  // ══════════════════════════════════════════════
  //  PHASE: VERDICT WAITING
  // ══════════════════════════════════════════════
  if (phase === 'verdict_waiting') {
    const witnessAccepted = !!vow.witness_accepted_at;
    const canSelfResolve = isMaker && (isSolo || !witnessAccepted);

    return (
      <RitualScreen
        footer={
          <div className="flex flex-col gap-2">
            {canSelfResolve && (
              <PrimaryButton label="Deliver your verdict" onPress={() => router.push(`/self-resolve?id=${vow.id}`)} />
            )}
            {isMaker && witnessAccepted && vow.witness_phone && (
              <button
                onClick={() => {
                  if (vow.witness_phone) window.open(`sms:${vow.witness_phone}`, '_self');
                }}
                className="w-full rounded-[18px] min-h-[52px] flex items-center justify-center gap-2.5 transition-transform active:scale-[0.975]"
                style={{
                  background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
                  boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
                }}
              >
                <MessageCircle className="w-[18px] h-[18px]" color="#0B0D11" />
                <span className="text-[15px] font-extrabold" style={{ color: '#0B0D11' }}>
                  Nudge {vow.witness_name}
                </span>
              </button>
            )}
            {isMaker && witnessAccepted && !vow.witness_phone && (
              <ShareButton
                url={witnessUrl ? `${witnessUrl}/verdict` : ''}
                text={`Time to deliver the verdict on my vow: "${vow.refined_text}"`}
                buttonText={`Nudge ${vow.witness_name} to decide`}
              />
            )}
            {/* Deliver verdict link for witnesses */}
            {isWitness && vow.witness_invite_token && (
              <a
                href={`/w/${vow.witness_invite_token}/verdict`}
                className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975] block"
                style={{
                  background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
                  boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
                }}
              >
                <div className="min-h-[56px] flex items-center justify-center px-5">
                  <span className="text-[15px] font-extrabold tracking-[0.2px]" style={{ color: '#0B0D11' }}>
                    Deliver your verdict
                  </span>
                </div>
              </a>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-[14px] min-h-[46px] flex items-center justify-center px-4 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
            </button>
          </div>
        }
      >
        <BackNav />
        <StatusBadge label="Verdict Due" color="var(--gold)" />

        <FadeUp delay={0.08}>
          <TitleBlock
            title="Time's up."
            subtitle={isSolo ? 'How did it go?' : witnessAccepted ? `${vow.witness_name}, it's your call.` : `${vow.witness_name} never accepted. You can self-resolve.`}
          />
        </FadeUp>

        <FadeUp delay={0.12}>
          <RitualCard>
            <p className="text-[17px] font-serif font-medium" style={{ color: 'var(--text)' }}>{vow.refined_text}</p>
            <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>At stake</span>
              <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{stakeLabel || 'Accountability only'}</span>
            </div>
            {vow.destination && vow.stake_amount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>If broken</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{vow.destination}</span>
              </div>
            )}
          </RitualCard>
        </FadeUp>

        <TimelineBlock />
        <WithdrawButton />
        <DevVerdictButtons />

        {actionMsg && (
          <FadeUp>
            <p className="text-[13px] text-center" style={{ color: 'var(--text-secondary)' }}>{actionMsg}</p>
          </FadeUp>
        )}
      </RitualScreen>
    );
  }

  // ══════════════════════════════════════════════
  //  PHASE: CHALLENGE PENDING (M9)
  // ══════════════════════════════════════════════
  if (phase === 'challenge_pending') {
    const targetName = vow.target_phone ? vow.target_phone.slice(-4) : 'them';

    return (
      <RitualScreen
        footer={
          <div className="flex flex-col gap-2">
            {vow.target_phone && (
              <button
                onClick={() => window.open(`sms:${vow.target_phone}`, '_self')}
                className="w-full rounded-[18px] min-h-[52px] flex items-center justify-center gap-2.5 transition-transform active:scale-[0.975]"
                style={{
                  background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
                  boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
                }}
              >
                <MessageCircle className="w-[18px] h-[18px]" color="#0B0D11" />
                <span className="text-[15px] font-extrabold" style={{ color: '#0B0D11' }}>
                  Nudge {targetName}
                </span>
              </button>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-[14px] min-h-[46px] flex items-center justify-center px-4 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
            </button>
          </div>
        }
      >
        <BackNav />
        <StatusBadge label="Challenge Sent" color="#60A5FA" pulse />

        <FadeUp delay={0.08}>
          <TitleBlock
            title={vow.refined_text}
            subtitle={`Waiting for ${targetName} to accept the challenge.`}
          />
        </FadeUp>

        <FadeUp delay={0.12}>
          <div
            className="rounded-[20px] p-5 flex flex-col gap-3"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(96,165,250,0.15)' }}>
                <Clock className="w-[18px] h-[18px]" style={{ color: '#60A5FA' }} />
              </div>
              <div>
                <span className="text-[15px] font-semibold block" style={{ color: 'var(--text)' }}>Challenge pending</span>
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  They&apos;ll get a text with the dare. Nudge if they haven&apos;t responded.
                </span>
              </div>
            </div>
          </div>
        </FadeUp>

        {stakeLabel && (
          <FadeUp delay={0.16}>
            <div className="flex gap-3">
              <StatPill value={stakeLabel} label="At stake" />
              <StatPill value={endDateFormatted} label="Verdict day" />
            </div>
          </FadeUp>
        )}

        <TimelineBlock />
        <WithdrawButton />
      </RitualScreen>
    );
  }

  // ══════════════════════════════════════════════
  //  PHASE: CHALLENGE WATCHING (M10)
  // ══════════════════════════════════════════════
  if (phase === 'challenge_watching') {
    const targetName = vow.target_phone ? vow.target_phone.slice(-4) : 'them';

    return (
      <RitualScreen
        footer={
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full rounded-[14px] min-h-[46px] flex items-center justify-center px-4 transition-transform active:scale-[0.98]"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
          </button>
        }
      >
        <BackNav />
        <StatusBadge label="Challenge Active" color="var(--success)" />

        <FadeUp delay={0.08}>
          <TitleBlock
            title={vow.refined_text}
            subtitle={`${targetName} accepted. The clock is ticking.`}
          />
        </FadeUp>

        <CountdownCard />
        <TimelineBlock />
        <DevVerdictButtons />
      </RitualScreen>
    );
  }

  // ══════════════════════════════════════════════
  //  PHASE: CHALLENGE VERDICT (M11)
  // ══════════════════════════════════════════════
  if (phase === 'challenge_verdict') {
    const targetName = vow.target_phone ? vow.target_phone.slice(-4) : 'them';

    return (
      <RitualScreen
        footer={
          <div className="flex flex-col gap-2">
            {vow.witness_invite_token && (
              <a
                href={`/w/${vow.witness_invite_token}/verdict`}
                className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975] block"
                style={{
                  background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
                  boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
                }}
              >
                <div className="min-h-[56px] flex items-center justify-center px-5">
                  <span className="text-[15px] font-extrabold tracking-[0.2px]" style={{ color: '#0B0D11' }}>
                    Deliver your verdict
                  </span>
                </div>
              </a>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-[14px] min-h-[46px] flex items-center justify-center px-4 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
            </button>
          </div>
        }
      >
        <BackNav />
        <StatusBadge label="Time to Judge" color="var(--gold)" />

        <FadeUp delay={0.08}>
          <TitleBlock
            title="Time's up."
            subtitle={`Did ${targetName} keep their word?`}
          />
        </FadeUp>

        <FadeUp delay={0.12}>
          <RitualCard>
            <p className="text-[17px] font-serif font-medium" style={{ color: 'var(--text)' }}>{vow.refined_text}</p>
            <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>At stake</span>
              <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{stakeLabel || 'Accountability only'}</span>
            </div>
          </RitualCard>
        </FadeUp>

        <TimelineBlock />
        <DevVerdictButtons />
      </RitualScreen>
    );
  }

  // ══════════════════════════════════════════════
  //  PHASE: WITNESS WATCHING (W2)
  // ══════════════════════════════════════════════
  if (phase === 'witness_watching') {
    return (
      <RitualScreen
        footer={
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full rounded-[14px] min-h-[46px] flex items-center justify-center px-4 transition-transform active:scale-[0.98]"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
          </button>
        }
      >
        <BackNav />
        <StatusBadge label="You're Watching" color="var(--success)" />

        <FadeUp delay={0.08}>
          <TitleBlock
            title={vow.refined_text}
            subtitle={stakeSubtitle}
          />
        </FadeUp>

        <CountdownCard />

        <FadeUp delay={0.18}>
          <div
            className="rounded-[16px] p-4 flex items-center gap-3"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <Eye className="w-5 h-5 shrink-0" style={{ color: 'var(--gold)' }} />
            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              You&apos;ll be asked to deliver your verdict on {endDateFormatted}.
            </p>
          </div>
        </FadeUp>

        <TimelineBlock />
      </RitualScreen>
    );
  }

  // ══════════════════════════════════════════════
  //  PHASE: KEPT
  // ══════════════════════════════════════════════
  if (phase === 'kept') {
    return (
      <RitualScreen
        footer={
          <div className="flex flex-col gap-2">
            {certificateUrl && (
              <ShareButton
                url={certificateUrl}
                text={`I kept my vow: "${vow.refined_text}"`}
                buttonText="Share your certificate"
              />
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-[14px] min-h-[46px] flex items-center justify-center px-4 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
            </button>
          </div>
        }
      >
        <BackNav />

        <FadeUp delay={0.05}>
          <div className="flex flex-col items-center gap-4 pt-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(82,214,154,0.15)', border: '2px solid rgba(82,214,154,0.3)' }}
            >
              <Trophy className="w-7 h-7" style={{ color: 'var(--success)' }} />
            </div>
            <div className="text-center">
              <h1 className="text-[28px] font-bold font-serif" style={{ color: 'var(--success)' }}>Vow Kept</h1>
              <p className="text-[15px] mt-1" style={{ color: 'var(--text-secondary)' }}>You honored your word.</p>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <RitualCard>
            <p className="text-[17px] font-serif font-medium text-center" style={{ color: 'var(--text)' }}>
              &ldquo;{vow.refined_text}&rdquo;
            </p>
            <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Witnessed by</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{vow.witness_name}</span>
            </div>
            {stakeLabel && (
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Stake</span>
                <span className="text-sm font-bold" style={{ color: 'var(--success)' }}>{stakeLabel} protected</span>
              </div>
            )}
            {vow.verdict_at && (
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Verdict</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {new Date(vow.verdict_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </RitualCard>
        </FadeUp>

        <TimelineBlock />
      </RitualScreen>
    );
  }

  // ══════════════════════════════════════════════
  //  PHASE: BROKEN
  // ══════════════════════════════════════════════
  if (phase === 'broken') {
    return (
      <RitualScreen
        footer={
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push('/create')}
              className="w-full rounded-[18px] min-h-[52px] flex items-center justify-center gap-2.5 transition-transform active:scale-[0.975]"
              style={{
                background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
                boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
              }}
            >
              <span className="text-[15px] font-extrabold" style={{ color: '#0B0D11' }}>
                Make a new vow
              </span>
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-[14px] min-h-[46px] flex items-center justify-center px-4 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
            </button>
          </div>
        }
      >
        <BackNav />

        <FadeUp delay={0.05}>
          <div className="flex flex-col items-center gap-4 pt-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.25)' }}
            >
              <XCircle className="w-7 h-7" style={{ color: 'var(--danger)' }} />
            </div>
            <div className="text-center">
              <h1 className="text-[28px] font-bold font-serif" style={{ color: 'var(--danger)' }}>Vow Broken</h1>
              <p className="text-[15px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                {stakeLabel ? `${stakeLabel} goes to ${vow.destination}.` : 'The vow was not honored.'}
              </p>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <RitualCard>
            <p className="text-[17px] font-serif font-medium text-center" style={{ color: 'var(--text)' }}>
              &ldquo;{vow.refined_text}&rdquo;
            </p>
            <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Witnessed by</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{vow.witness_name}</span>
            </div>
            {stakeLabel && (
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Consequence</span>
                <span className="text-sm font-bold" style={{ color: 'var(--danger)' }}>{stakeLabel} → {vow.destination}</span>
              </div>
            )}
          </RitualCard>
        </FadeUp>

        <TimelineBlock />
      </RitualScreen>
    );
  }

  // ══════════════════════════════════════════════
  //  PHASE: VOIDED
  // ══════════════════════════════════════════════
  return (
    <RitualScreen
      footer={
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push('/create')}
            className="w-full rounded-[18px] min-h-[52px] flex items-center justify-center gap-2.5 transition-transform active:scale-[0.975]"
            style={{
              background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
              boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
            }}
          >
            <span className="text-[15px] font-extrabold" style={{ color: '#0B0D11' }}>
              Make a new vow
            </span>
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full rounded-[14px] min-h-[46px] flex items-center justify-center px-4 transition-transform active:scale-[0.98]"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>My Vows</span>
          </button>
        </div>
      }
    >
      <BackNav />

      <FadeUp delay={0.05}>
        <div className="flex flex-col items-center gap-4 pt-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(90,86,80,0.12)', border: '2px solid rgba(90,86,80,0.25)' }}
          >
            <Ban className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="text-center">
            <h1 className="text-[28px] font-bold font-serif" style={{ color: 'var(--text-muted)' }}>Withdrawn</h1>
            <p className="text-[15px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              {stakeLabel ? `${stakeLabel} was refunded.` : 'This vow was cancelled.'}
            </p>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        <RitualCard>
          <p className="text-[17px] font-serif font-medium text-center" style={{ color: 'var(--text-muted)' }}>
            &ldquo;{vow.refined_text}&rdquo;
          </p>
        </RitualCard>
      </FadeUp>

      <TimelineBlock />
    </RitualScreen>
  );
}

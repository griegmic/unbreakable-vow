'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Clock, Eye, MessageCircle, LayoutGrid, ChevronRight, Trash2 } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, PrimaryButton, StatPill, FadeUp, HeaderBadge } from '@/components/ui';
import { HamburgerMenu } from '@/components/hamburger-menu';
import { ShareButton, CopyLinkButton } from '@/components/share-button';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
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
  const { isAuthenticated, loading: authLoading, session } = useAuth();
  const [vow, setVow] = useState<Vow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [origin, setOrigin] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const ADMIN_EMAILS = ['rosenfield.joseph@gmail.com', 'joero93@gmail.com', 'joe@turnkey.io'];
  const userEmail = (session as any)?.user?.email || '';
  const isAdmin = ADMIN_EMAILS.includes(userEmail);

  const handleDeleteVow = async () => {
    if (!vow || actionBusy) return;
    if (!confirm(`Delete "${vow.refined_text}"? This will permanently remove this vow and cannot be undone.`)) return;
    setActionBusy(true);
    try {
      // Delete audit events first (FK constraint)
      await supabase.from('audit_events').delete().eq('vow_id', vow.id);
      await supabase.from('sms_log').delete().eq('vow_id', vow.id);
      const { error } = await supabase.from('vows').delete().eq('id', vow.id);
      if (error) throw error;
      setVow(null);
      // Will trigger redirect to create flow via the useEffect below
    } catch {
      setActionMsg('Failed to delete vow.');
      setActionBusy(false);
    }
  };

  // No active vow — redirect to create flow
  // Experienced users (have any past vows) → /create (quick vow)
  // New users (no vows ever) → /guided
  useEffect(() => {
    if (loading || authLoading || vow) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { count } = await supabase.from('vows')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      if ((count ?? 0) > 0) {
        router.replace('/create');
      } else {
        router.replace('/guided');
      }
    })();
  }, [loading, authLoading, vow, router]);

  if (loading || authLoading || !vow) {
    return (
      <RitualScreen>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
        </div>
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
  const isSolo = vow.witness_name === 'Just me' && !vow.witness_accepted_at;

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
  const witnessLabel = isSolo ? "You're the judge" : hasRealName ? `${vow.witness_name} is watching` : 'Invite pending';
  const endDateFormatted = endsAt?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) || '—';

  const todaysLabel = (() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % cheekyLabelTemplates.length;
    const displayName = hasRealName ? vow.witness_name : 'your witness';
    return cheekyLabelTemplates[dayIndex].replace('{name}', displayName);
  })();

  const stakeNudge = vow.stake_amount > 0 ? ` I put $${Math.round(vow.stake_amount / 100)} on it.` : '';
  const nudgeShareText = `Hey, did you see my vow? "${vow.refined_text.replace(/\.$/, '')}"${stakeNudge} I need you to accept:`;
  const inviteShareText = vow.stake_amount > 0
    ? `I vowed to ${vow.refined_text.replace(/\.$/, '').toLowerCase()} and put $${Math.round(vow.stake_amount / 100)} on it. You decide if I kept my word:`
    : `I vowed to ${vow.refined_text.replace(/\.$/, '').toLowerCase()}. If I fail, you get to call me out:`;

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
            {isAdmin && (
              <button
                onClick={handleDeleteVow}
                disabled={actionBusy}
                className="w-full rounded-[14px] min-h-[40px] flex items-center justify-center gap-2 px-4 transition-transform active:scale-[0.98] disabled:opacity-40"
                style={{ color: 'var(--danger)', opacity: 0.6 }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[12px] font-medium">Delete this vow</span>
              </button>
            )}
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
            {isAdmin && (
              <button
                onClick={handleDeleteVow}
                disabled={actionBusy}
                className="w-full rounded-[14px] min-h-[40px] flex items-center justify-center gap-2 px-4 transition-transform active:scale-[0.98] disabled:opacity-40"
                style={{ color: 'var(--danger)', opacity: 0.6 }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[12px] font-medium">Delete this vow</span>
              </button>
            )}
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
            className="w-full py-2 flex items-center justify-center"
          >
            <span className="text-[13px] font-semibold" style={{ color: 'var(--gold-bright)' }}>+ Make another vow</span>
          </button>
          {isAdmin && (
            <button
              onClick={handleDeleteVow}
              disabled={actionBusy}
              className="w-full rounded-[14px] min-h-[40px] flex items-center justify-center gap-2 px-4 transition-transform active:scale-[0.98] disabled:opacity-40"
              style={{ color: 'var(--danger)', opacity: 0.6 }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[12px] font-medium">Delete this vow</span>
            </button>
          )}
        </div>
      }
    >
      <FadeUp>
          <div className="flex items-center justify-between">
            <HeaderBadge />
            <HamburgerMenu />
          </div>
        </FadeUp>

      {/* Vow text */}
      <FadeUp delay={0.05}>
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
        </div>
      </FadeUp>

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

      {actionMsg && (
        <FadeUp>
          <p className="text-[13px] text-center" style={{ color: 'var(--text-secondary)' }}>{actionMsg}</p>
        </FadeUp>
      )}
    </RitualScreen>
  );
}

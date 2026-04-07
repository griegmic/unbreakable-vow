'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Calendar, Shield, Clock, Check, Eye } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, PrimaryButton, SecondaryButton, StatPill, FadeUp, HeaderBadge } from '@/components/ui';
import { ShareButton, CopyLinkButton } from '@/components/share-button';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';

type Vow = Database['public']['Tables']['vows']['Row'];

export default function LivePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [vow, setVow] = useState<Vow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [origin, setOrigin] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchVow = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase.from('vows')
      .select('*')
      .eq('user_id', session.user.id)
      .in('status', ['sealed', 'active', 'awaiting_verdict'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setVow(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    fetchVow();

    intervalRef.current = setInterval(fetchVow, 30000);
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
        footer={<PrimaryButton label="Make a vow" onPress={() => router.push('/')} />}
      >
        <FadeUp><HeaderBadge /></FadeUp>
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

  const isActive = ['sealed', 'active'].includes(vow.status);
  const isAwaiting = vow.status === 'awaiting_verdict';
  const endsAt = vow.ends_at ? new Date(vow.ends_at) : null;
  const now = new Date();
  const hoursLeft = endsAt ? Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60))) : 0;
  const daysLeft = Math.floor(hoursLeft / 24);
  const witnessUrl = vow.witness_invite_token && origin ? `${origin}/w/${vow.witness_invite_token}` : '';
  const isSolo = vow.witness_name === 'Just me';

  const witnessPending = !isSolo && !vow.witness_accepted_at && !vow.witness_declined;
  const witnessDeclined = !isSolo && vow.witness_declined;
  const witnessAccepted = !isSolo && !!vow.witness_accepted_at;

  const statusLabel = isAwaiting ? 'Awaiting verdict' : witnessPending ? 'Witness pending' : 'Vow active';
  const statusColor = isAwaiting ? 'var(--gold)' : witnessPending ? 'var(--gold)' : 'var(--success)';
  const nudgeShareText = `I made a vow: "${vow.refined_text.replace(/\.$/, '')}" — I picked you to hold me accountable. Tap here to accept:`;

  return (
    <RitualScreen
      footer={
        <div className="flex flex-col gap-2">
          {isSolo && (isActive || isAwaiting) && (
            <PrimaryButton label="Deliver your verdict" onPress={() => router.push('/self-resolve')} />
          )}
          {witnessPending && witnessUrl && (
            <ShareButton
              url={witnessUrl}
              text={nudgeShareText}
              buttonText={`Nudge ${vow.witness_name}`}
            />
          )}
          <SecondaryButton label="View history" onPress={() => router.push('/history')} />
        </div>
      }
    >
      <FadeUp><HeaderBadge /></FadeUp>

      {/* Status badge */}
      <FadeUp delay={0.05}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-[13px] font-semibold uppercase tracking-[0.5px]" style={{ color: statusColor }}>{statusLabel}</span>
        </div>
      </FadeUp>

      {/* Vow text */}
      <FadeUp delay={0.08}>
        <TitleBlock
          title={vow.refined_text}
          subtitle={`$${vow.stake_amount / 100} at stake · ${vow.destination} if broken`}
        />
      </FadeUp>

      {/* Stats */}
      <FadeUp delay={0.12}>
        <div className="flex gap-3">
          <StatPill value={daysLeft > 0 ? `${daysLeft}d` : `${hoursLeft}h`} label="Time left" />
          <StatPill
            value={endsAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || '—'}
            label="Verdict day"
          />
        </div>
      </FadeUp>

      {/* STATE: Witness pending */}
      {witnessPending && witnessUrl && (
        <FadeUp delay={0.16}>
          <div
            className="rounded-[20px] p-5 flex flex-col gap-3"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(212,162,79,0.15)' }}>
                <Clock className="w-[18px] h-[18px]" style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <span className="text-[15px] font-semibold block" style={{ color: 'var(--text)' }}>Waiting for {vow.witness_name}</span>
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Send the link to get them on board</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-[10px] py-2 px-3 flex-1 min-w-0" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{witnessUrl}</p>
              </div>
              <CopyLinkButton url={witnessUrl} />
            </div>
          </div>
        </FadeUp>
      )}

      {/* STATE: Witness declined */}
      {witnessDeclined && (
        <FadeUp delay={0.16}>
          <div
            className="rounded-[20px] p-5 flex flex-col gap-3"
            style={{ backgroundColor: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>{vow.witness_name} declined.</span>
            </div>
            <p className="text-[13px] leading-[19px]" style={{ color: 'var(--text-secondary)' }}>
              You can continue solo — you&apos;ll judge the vow yourself on verdict day.
            </p>
            <button
              onClick={handleGoSolo}
              disabled={actionBusy}
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-[14px] transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <Shield className="w-4 h-4" />
              <span className="text-[14px] font-semibold">Go solo instead</span>
            </button>
          </div>
        </FadeUp>
      )}

      {/* STATE: Witness accepted */}
      {witnessAccepted && (
        <FadeUp delay={0.16}>
          <div
            className="rounded-[20px] p-4 flex items-center gap-3"
            style={{
              backgroundColor: 'rgba(82,214,154,0.06)',
              border: '1px solid rgba(82,214,154,0.18)',
            }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(82,214,154,0.15)' }}>
              <Eye className="w-[18px] h-[18px]" style={{ color: 'var(--success)' }} />
            </div>
            <div className="flex-1">
              <span className="text-[15px] font-semibold block" style={{ color: 'var(--text)' }}>{vow.witness_name} is watching.</span>
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                They&apos;ll deliver the verdict on {endsAt?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) || 'verdict day'}.
              </span>
            </div>
            <Check className="w-5 h-5 shrink-0" style={{ color: 'var(--success)' }} />
          </div>
        </FadeUp>
      )}

      {/* Details card — minimal, just the essentials not shown above */}
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
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {endsAt?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) || '—'}
              </span>
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

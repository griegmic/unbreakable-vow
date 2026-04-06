'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Scale, Calendar, Shield, Clock } from 'lucide-react';
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

    // Poll witness status every 30 seconds
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
    } catch (err) {
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
  const statusLabel = isAwaiting ? 'Awaiting verdict' : witnessPending ? `Waiting for ${vow.witness_name}` : 'Active';
  const statusColor = isAwaiting ? 'var(--gold)' : witnessPending ? 'var(--gold)' : 'var(--success)';
  const nudgeShareText = `I made a vow: "${vow.refined_text.replace(/\.$/, '')}" — I picked you to hold me accountable. Tap here to accept:`;

  return (
    <RitualScreen
      footer={
        <div className="flex flex-col gap-2">
          {isSolo && (isActive || isAwaiting) && (
            <PrimaryButton label="Deliver your verdict" onPress={() => router.push('/self-resolve')} />
          )}
          {!isSolo && !witnessPending && witnessUrl && (
            <ShareButton
              url={witnessUrl}
              text={nudgeShareText}
              buttonText={`Share with ${vow.witness_name}`}
            />
          )}
          <SecondaryButton label="View history" onPress={() => router.push('/history')} />
        </div>
      }
    >
      <FadeUp><HeaderBadge /></FadeUp>

      <FadeUp delay={0.05}>
        <TitleBlock
          title={vow.refined_text}
          subtitle=""
        />
      </FadeUp>

      {/* Status badge */}
      <FadeUp delay={0.1}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-[13px] font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
        </div>
      </FadeUp>

      {/* Countdown */}
      <FadeUp delay={0.15}>
        <div className="flex gap-3">
          <StatPill value={daysLeft > 0 ? `${daysLeft}d` : `${hoursLeft}h`} label="Time left" />
          <StatPill value={`$${vow.stake_amount / 100}`} label="At stake" tone="danger" />
        </div>
      </FadeUp>

      {/* Witness pending nudge */}
      {witnessPending && witnessUrl && (
        <FadeUp delay={0.18}>
          <div
            className="rounded-[22px] p-5 flex flex-col gap-4"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(212,162,79,0.15)' }}>
                <Clock className="w-5 h-5" style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <span className="text-[15px] font-semibold block" style={{ color: 'var(--text)' }}>Waiting for {vow.witness_name}</span>
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>They haven&apos;t accepted yet</span>
              </div>
            </div>
            <ShareButton
              url={witnessUrl}
              text={nudgeShareText}
              buttonText={`Nudge ${vow.witness_name}`}
            />
            <div className="flex items-center gap-3">
              <div className="rounded-[12px] p-2.5 flex-1 flex items-center gap-2" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                <p className="flex-1 text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{witnessUrl}</p>
                <CopyLinkButton url={witnessUrl} />
              </div>
            </div>
          </div>
        </FadeUp>
      )}

      {/* Witness accepted - show link */}
      {!isSolo && !witnessPending && !witnessDeclined && witnessUrl && (
        <FadeUp delay={0.18}>
          <div
            className="rounded-[16px] p-3 flex items-center gap-3"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold tracking-[1px] uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>
                Witness link
              </span>
              <p className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
                {witnessUrl}
              </p>
            </div>
            <CopyLinkButton url={witnessUrl} />
          </div>
        </FadeUp>
      )}

      {/* Details */}
      <FadeUp delay={0.2}>
        <RitualCard>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Witness</span>
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{vow.witness_name}</span>
            </div>
            {!isSolo && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Witness status</span>
                  <span className="text-sm font-medium" style={{ color: vow.witness_accepted_at ? 'var(--success)' : vow.witness_declined ? 'var(--danger)' : 'var(--gold)' }}>
                    {vow.witness_accepted_at ? 'Accepted' : vow.witness_declined ? 'Declined' : 'Pending'}
                  </span>
                </div>
                {(witnessPending || witnessDeclined) && (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={handleGoSolo}
                      disabled={actionBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-opacity disabled:opacity-40"
                      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    >
                      <Shield className="w-3 h-3" />
                      Go solo instead
                    </button>
                  </div>
                )}
              </>
            )}
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

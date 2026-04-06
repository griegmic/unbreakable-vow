'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Scale, Calendar, RefreshCw, Shield } from 'lucide-react';
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
  const [resendCooldown, setResendCooldown] = useState(0);
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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResendInvite = async () => {
    if (!vow || resendCooldown > 0 || actionBusy) return;
    setActionBusy(true);
    setActionMsg('');
    try {
      // Re-share the link (on web, we copy to clipboard as "resend")
      const origin = window.location.origin;
      const url = `${origin}/w/${vow.witness_invite_token}`;
      if (navigator.share) {
        await navigator.share({ text: `I made an Unbreakable Vow — ${vow.refined_text} You're my witness.`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setActionMsg('Link copied — share it with your witness!');
      setResendCooldown(60);
    } catch {
      // User cancelled share
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

  const statusLabel = isAwaiting ? 'Awaiting verdict' : 'Active';
  const statusColor = isAwaiting ? 'var(--gold)' : 'var(--success)';

  return (
    <RitualScreen
      footer={
        <div className="flex flex-col gap-2">
          {isSolo && (isActive || isAwaiting) && (
            <PrimaryButton label="Deliver your verdict" onPress={() => router.push('/self-resolve')} />
          )}
          {!isSolo && witnessUrl && (
            <ShareButton
              url={witnessUrl}
              text={`I made an Unbreakable Vow — ${vow.refined_text} You're my witness.`}
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

      {/* Share link */}
      {!isSolo && witnessUrl && (
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
                {/* Witness action buttons when pending or declined */}
                {!vow.witness_accepted_at && (
                  <div className="flex gap-2 mt-1">
                    {!vow.witness_declined && (
                      <button
                        onClick={handleResendInvite}
                        disabled={resendCooldown > 0 || actionBusy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-opacity disabled:opacity-40"
                        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      >
                        <RefreshCw className="w-3 h-3" />
                        {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend invite'}
                      </button>
                    )}
                    <button
                      onClick={handleGoSolo}
                      disabled={actionBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-opacity disabled:opacity-40"
                      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    >
                      <Shield className="w-3 h-3" />
                      Go solo
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

'use client';
import { useState } from 'react';
import { Shield, DollarSign, Sparkles } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, PrimaryButton, SecondaryButton, FadeUp, HeaderBadge } from '@/components/ui';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Vow {
  id: string;
  refined_text: string;
  stake_amount: number;
  destination: string;
  witness_name: string;
  witness_accepted_at: string | null;
  witness_declined: boolean;
  ends_at: string | null;
  status: string;
}

export default function WitnessInviteClient({ vow, token, makerName }: { vow: Vow; token: string; makerName: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>(
    vow.witness_accepted_at ? 'accepted' : vow.witness_declined ? 'declined' : 'pending'
  );

  const handleAccept = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('accept-witness', {
        body: { token, action: 'accept' },
      });
      if (fnError) {
        setError('Failed to accept. Please try again.');
        setBusy(false);
        return;
      }
      if (data?.error) {
        setError(data.error === 'vow_not_active' ? 'This vow is no longer active.' : 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      setStatus('accepted');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('accept-witness', {
        body: { token, action: 'decline' },
      });
      if (fnError) {
        setError('Failed to decline. Please try again.');
        setBusy(false);
        return;
      }
      if (data?.error) {
        setError('Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      setStatus('declined');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const endDate = vow.ends_at
    ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'TBD';

  const vowCard = (
    <RitualCard>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
        <span className="text-[11px] font-bold tracking-[1.3px] uppercase" style={{ color: 'var(--gold)' }}>THE VOW</span>
      </div>
      <p className="text-[17px] font-serif font-medium" style={{ color: 'var(--text)' }}>{vow.refined_text}</p>
      <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>At stake</span>
        </div>
        <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>${vow.stake_amount / 100}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>If broken</span>
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{vow.destination}</span>
      </div>
    </RitualCard>
  );

  if (status === 'accepted') {
    return (
      <RitualScreen
        footer={
          <PrimaryButton
            label="Deliver your verdict"
            onPress={() => window.location.href = `/w/${token}/verdict`}
          />
        }
      >
        <FadeUp><HeaderBadge /></FadeUp>
        <FadeUp delay={0.1}>
          <div className="flex justify-center mt-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center animate-scale-in" style={{ backgroundColor: 'var(--success-muted)' }}>
              <Shield className="w-8 h-8" style={{ color: 'var(--success)' }} />
            </div>
          </div>
        </FadeUp>
        <FadeUp delay={0.15}>
          <TitleBlock
            title="You're the witness."
            subtitle={`On ${endDate}, you decide: kept or broken. One tap.`}
          />
        </FadeUp>
        <FadeUp delay={0.2}>
          {vowCard}
        </FadeUp>
      </RitualScreen>
    );
  }

  if (status === 'declined') {
    return (
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>
        <FadeUp delay={0.1}>
          <TitleBlock
            title="Declined"
            subtitle="You've declined the witness role. The vow maker will be notified."
          />
        </FadeUp>
      </RitualScreen>
    );
  }

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label="I accept — hold them to it"
            onPress={handleAccept}
            loading={busy}
          />
          <SecondaryButton label="Decline" onPress={handleDecline} />
        </>
      }
    >
      <FadeUp><HeaderBadge /></FadeUp>

      <FadeUp delay={0.1}>
        <TitleBlock
          title={`${makerName} made a vow and needs a witness.`}
          subtitle={`$${vow.stake_amount / 100} is on the line. On ${endDate}, you decide: kept or broken.`}
        />
      </FadeUp>

      <FadeUp delay={0.15}>
        {vowCard}
      </FadeUp>

      {error && (
        <FadeUp>
          <div className="rounded-[12px] px-4 py-3 text-[14px]" style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        </FadeUp>
      )}
    </RitualScreen>
  );
}

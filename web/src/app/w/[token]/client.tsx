'use client';
import { useState } from 'react';
import { Shield, DollarSign, Calendar, Sparkles } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, VowPreview, PrimaryButton, SecondaryButton, OathCheckbox, FadeUp, HeaderBadge } from '@/components/ui';
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

export default function WitnessInviteClient({ vow, token }: { vow: Vow; token: string }) {
  const [oathChecked, setOathChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>(
    vow.witness_accepted_at ? 'accepted' : vow.witness_declined ? 'declined' : 'pending'
  );

  const handleAccept = async () => {
    if (!oathChecked || busy) return;
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
            subtitle={`When the time comes, you'll decide: kept or broken. Check back on ${endDate}.`}
          />
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
            disabled={!oathChecked}
            loading={busy}
          />
          <SecondaryButton label="Decline" onPress={handleDecline} />
        </>
      }
    >
      <FadeUp><HeaderBadge /></FadeUp>

      {/* Badge */}
      <FadeUp delay={0.05}>
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl self-start" style={{ backgroundColor: 'rgba(212,162,79,0.1)', border: '1px solid var(--border-strong)' }}>
          <Shield className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          <span className="text-[12px] font-bold tracking-[1px] uppercase" style={{ color: 'var(--gold)' }}>
            YOU&apos;VE BEEN CHOSEN AS A WITNESS
          </span>
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        <TitleBlock
          title={`Someone made a vow and named you as their witness.`}
          subtitle="Real money is on the line. Your job: decide if they kept their word."
        />
      </FadeUp>

      <FadeUp delay={0.15}>
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
      </FadeUp>

      {/* What happens */}
      <FadeUp delay={0.2}>
        <RitualCard>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>What happens</span>
          <div className="flex flex-col gap-3">
            {[
              { n: '1', text: "You'll get a text when it's verdict time." },
              { n: '2', text: "No daily check-ins — just be aware of the vow." },
              { n: '3', text: `On ${endDate}: kept or broken. One tap.` },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--gold)' }}>
                  {n}
                </div>
                <span className="text-[14px] leading-5" style={{ color: 'var(--text-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>
        </RitualCard>
      </FadeUp>

      {error && (
        <FadeUp>
          <div className="rounded-[12px] px-4 py-3 text-[14px]" style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        </FadeUp>
      )}

      <FadeUp delay={0.25}>
        <OathCheckbox
          checked={oathChecked}
          onChange={setOathChecked}
          label="I solemnly swear to judge honestly and deliver a fair verdict."
        />
      </FadeUp>
    </RitualScreen>
  );
}

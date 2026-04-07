'use client';
import { useMemo, useState } from 'react';
import { DollarSign, Sparkles, Calendar, MessageCircle, Clock, Check } from 'lucide-react';
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

const NUDGE_MESSAGES = [
  "Hey, how's the vow going? I'm watching...",
  "Don't think I forgot about the $AMOUNT...",
  "The clock is ticking on your vow...",
  "Just doing my witness duties. How's it going?",
  "I have the power to break you. No pressure.",
  "Checking in. The vow remembers even if you forget.",
  "Your $AMOUNT says you can do this. Can you?",
  "Witness check-in. Still on track?",
  "I will be fair but I will not be merciful.",
  "Tick tock. How's the vow holding up?",
];

export default function WitnessInviteClient({ vow, token, makerName, makerPhone }: { vow: Vow; token: string; makerName: string; makerPhone: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>(
    vow.witness_accepted_at ? 'accepted' : vow.witness_declined ? 'declined' : 'pending'
  );

  const nudgeMessage = useMemo(() => {
    const msg = NUDGE_MESSAGES[Math.floor(Math.random() * NUDGE_MESSAGES.length)];
    return msg.replace(/\$AMOUNT/g, `$${vow.stake_amount / 100}`);
  }, [vow.stake_amount]);

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
      <p className="text-[20px] font-serif font-medium leading-[28px]" style={{ color: 'var(--text)' }}>"{vow.refined_text}"</p>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Your verdict</span>
        </div>
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{endDate}</span>
      </div>
    </RitualCard>
  );

  if (status === 'accepted') {
    const now = new Date();
    const end = vow.ends_at ? new Date(vow.ends_at) : null;
    const isVerdictDue = end ? now >= end : false;
    const daysLeft = end ? Math.ceil((end.getTime() - now.getTime()) / 86400000) : null;
    const countdownLabel = daysLeft === null ? null
      : daysLeft <= 0 ? "Today's the day"
      : daysLeft === 1 ? 'Last day'
      : `${daysLeft} days left`;

    const handleMessage = () => {
      if (makerPhone) {
        const encoded = encodeURIComponent(nudgeMessage);
        window.location.href = `sms:${makerPhone}?body=${encoded}`;
      } else {
        navigator.clipboard.writeText(nudgeMessage).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }
    };

    return (
      <RitualScreen
        footer={
          isVerdictDue ? (
            <PrimaryButton
              label="Deliver your verdict"
              onPress={() => window.location.href = `/w/${token}/verdict`}
            />
          ) : undefined
        }
      >
        <FadeUp><HeaderBadge /></FadeUp>

        {/* Status badge */}
        <FadeUp delay={0.05}>
          <div className="flex justify-center">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full"
              style={{
                backgroundColor: isVerdictDue ? 'rgba(212,162,79,0.12)' : 'var(--success-muted)',
                border: isVerdictDue ? '1px solid var(--border-strong)' : '1px solid rgba(82,214,154,0.22)',
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isVerdictDue ? 'var(--gold-bright)' : 'var(--success)' }}
              />
              <span
                className="text-[12px] font-bold tracking-[1px] uppercase"
                style={{ color: isVerdictDue ? 'var(--gold-bright)' : 'var(--success)' }}
              >
                {isVerdictDue ? 'VERDICT DUE' : 'VOW ACTIVE'}
              </span>
            </div>
          </div>
        </FadeUp>

        {/* Title */}
        <FadeUp delay={0.1}>
          <TitleBlock
            title="You're the witness."
            subtitle={isVerdictDue
              ? `Time's up. It's your call — kept or broken.`
              : `${makerName} is counting on your honesty.`
            }
          />
        </FadeUp>

        {/* Countdown */}
        {countdownLabel && !isVerdictDue && (
          <FadeUp delay={0.15}>
            <div
              className="rounded-[20px] p-6 flex flex-col items-center gap-1"
              style={{
                backgroundColor: 'rgba(82,214,154,0.06)',
                border: '1px solid rgba(82,214,154,0.18)',
              }}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: 'var(--success)' }} />
                <span className="text-[28px] font-extrabold tracking-[-0.5px]" style={{ color: 'var(--text)' }}>
                  {countdownLabel}
                </span>
              </div>
              <span className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Verdict day: {endDate}
              </span>
            </div>
          </FadeUp>
        )}

        {/* Vow card */}
        <FadeUp delay={0.2}>
          {vowCard}
        </FadeUp>

        {/* Message button */}
        <FadeUp delay={0.25}>
          <button
            onClick={handleMessage}
            className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975]"
            style={{
              background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
              boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
            }}
          >
            <div className="min-h-[56px] flex items-center justify-center gap-2.5 px-5">
              {copied ? (
                <>
                  <Check className="w-[18px] h-[18px]" color="#0B0D11" />
                  <span className="text-[15px] font-extrabold tracking-[0.2px]" style={{ color: '#0B0D11' }}>
                    Copied! Paste in your chat
                  </span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-[18px] h-[18px]" color="#0B0D11" />
                  <span className="text-[15px] font-extrabold tracking-[0.2px]" style={{ color: '#0B0D11' }}>
                    Message {makerName}
                  </span>
                </>
              )}
            </div>
          </button>
          {!makerPhone && !copied && (
            <p className="text-center text-[12px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Copies a nudge to your clipboard
            </p>
          )}
        </FadeUp>

        {/* Nudge preview */}
        <FadeUp delay={0.3}>
          <div
            className="rounded-[14px] px-4 py-3 flex items-start gap-3"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <MessageCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <p className="text-[13px] leading-[19px] italic" style={{ color: 'var(--text-secondary)' }}>
              "{nudgeMessage}"
            </p>
          </div>
        </FadeUp>

        {/* Coming soon teaser */}
        <FadeUp delay={0.35}>
          <div
            className="rounded-[14px] px-4 py-3.5 text-center"
            style={{ backgroundColor: 'rgba(94,124,250,0.06)', border: '1px solid rgba(94,124,250,0.1)' }}
          >
            <p className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Group accountability is coming soon. You'll be able to hold them accountable right in your group chat.
            </p>
          </div>
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
          title={`${makerName} made an Unbreakable Vow.`}
          subtitle="Real money is on the line. You decide if they kept their word."
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

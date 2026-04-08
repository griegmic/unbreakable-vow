'use client';
import { useState, useEffect } from 'react';
import { DollarSign, Sparkles, Calendar, Clock, Shield, Swords, MessageCircle } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, PrimaryButton, SecondaryButton, FadeUp, HeaderBadge, StatPill } from '@/components/ui';
import Timeline from '@/components/timeline';
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
  ends_at: string | null;
  sealed_at: string | null;
  status: string;
  challenge_status: string;
}

function generateICS(vow: Vow, makerName: string): string {
  const end = new Date(vow.ends_at!);
  end.setHours(9, 0, 0, 0);
  const endTime = new Date(end.getTime() + 30 * 60 * 1000);

  const fmt = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  };

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Unbreakable Vow//EN',
    'BEGIN:VEVENT',
    `DTSTART;TZID=${tz}:${fmt(end)}`,
    `DTEND;TZID=${tz}:${fmt(endTime)}`,
    `DTSTAMP:${fmt(now)}Z`,
    `UID:challenge-${vow.id}@unbreakablevow.app`,
    `SUMMARY:Challenge deadline — ${makerName}'s vow`,
    `DESCRIPTION:The challenge from ${makerName} ends today. Time to prove yourself.`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Challenge deadline from ${makerName}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export default function ChallengeInviteClient({ vow, token, makerName, makerPhone }: { vow: Vow; token: string; makerName: string; makerPhone: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>(
    vow.challenge_status === 'accepted' ? 'accepted' : vow.challenge_status === 'declined' ? 'declined' : 'pending'
  );
  const [justAccepted, setJustAccepted] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);

  useEffect(() => {
    if (justAccepted) {
      const timer = setTimeout(() => setJustAccepted(false), 2400);
      return () => clearTimeout(timer);
    }
  }, [justAccepted]);

  const handleAccept = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('accept-challenge', {
        body: { token, action: 'accept' },
      });
      if (fnError) {
        setError('Failed to accept. Please try again.');
        setBusy(false);
        return;
      }
      if (data?.error) {
        setError(data.error === 'vow_not_active' ? 'This challenge is no longer active.' : 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      setJustAccepted(true);
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
      const { data, error: fnError } = await supabase.functions.invoke('accept-challenge', {
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

  const handleAddToCalendar = () => {
    if (!vow.ends_at) return;
    const icsContent = generateICS(vow, makerName);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'challenge-deadline.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCalendarAdded(true);
  };

  const handleTextMaker = () => {
    setJustAccepted(false);
    const message = encodeURIComponent("Challenge accepted. Game on. \u{1F525}");
    if (makerPhone) {
      const cleanPhone = makerPhone.replace(/[^\d+\-]/g, '');
      window.location.href = `sms:${cleanPhone}?body=${message}`;
    } else {
      window.location.href = `sms:?body=${message}`;
    }
  };

  const makerLabel = makerName === 'Your friend' ? 'your friend' : makerName;

  const endDate = vow.ends_at
    ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'TBD';

  // ─── ACCEPTED STATE ───
  if (status === 'accepted') {
    const now = new Date();
    const start = vow.sealed_at ? new Date(vow.sealed_at) : now;
    const end = vow.ends_at ? new Date(vow.ends_at) : null;
    const totalDays = end ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000)) : 7;
    const daysLeft = end ? Math.ceil((end.getTime() - now.getTime()) / 86400000) : null;
    const dayNumber = daysLeft !== null ? Math.max(1, totalDays - daysLeft + 1) : null;
    const countdownLabel = daysLeft === null ? null
      : daysLeft <= 0 ? "Time's up"
      : daysLeft === 1 ? 'Last day'
      : `${daysLeft} days left`;
    const progressPct = dayNumber !== null ? Math.min((dayNumber / totalDays) * 100, 100) : 0;

    return (
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>

        {justAccepted ? (
          <>
            <FadeUp delay={0.05}>
              <div className="flex justify-center pt-6 pb-2">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center animate-scale-in"
                  style={{
                    background: 'linear-gradient(135deg, rgba(82,214,154,0.2), rgba(82,214,154,0.08))',
                    border: '2px solid rgba(82,214,154,0.3)',
                    boxShadow: '0 0 40px rgba(82,214,154,0.15)',
                  }}
                >
                  <Swords className="w-9 h-9" style={{ color: 'var(--success)' }} />
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={0.15}>
              <TitleBlock
                title="Challenge accepted."
                subtitle={`${makerName} has been notified. The clock is ticking.`}
              />
            </FadeUp>
            <FadeUp delay={0.3}>
              <div
                className="rounded-[16px] px-5 py-4 flex items-start gap-3"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--gold)' }} />
                <p className="text-[14px] leading-[21px] font-serif" style={{ color: 'var(--text)' }}>
                  &ldquo;{vow.refined_text}&rdquo;
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={0.45}>
              <div className="flex flex-col gap-2.5">
                {makerPhone && (
                  <button
                    type="button"
                    onClick={handleTextMaker}
                    className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975]"
                    style={{
                      background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
                      boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
                    }}
                  >
                    <div className="min-h-[56px] flex items-center justify-center gap-2.5 px-5">
                      <MessageCircle className="w-[18px] h-[18px]" color="#0B0D11" />
                      <span className="text-[15px] font-extrabold tracking-[0.2px]" style={{ color: '#0B0D11' }}>
                        Tell {makerLabel} it&apos;s on
                      </span>
                    </div>
                  </button>
                )}
                <a
                  href="https://unbreakablevow.app"
                  className="block text-center text-[13px] py-3 transition-opacity hover:opacity-80"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Make a vow of your own &rarr;
                </a>
              </div>
            </FadeUp>
          </>
        ) : (
          <>
            {/* Status badge */}
            <FadeUp delay={0.05}>
              <div className="flex justify-center">
                <div
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full"
                  style={{
                    backgroundColor: 'var(--success-muted)',
                    border: '1px solid rgba(82,214,154,0.22)',
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--success)' }}
                  />
                  <span
                    className="text-[12px] font-bold tracking-[1px] uppercase"
                    style={{ color: 'var(--success)' }}
                  >
                    CHALLENGE ACTIVE
                  </span>
                </div>
              </div>
            </FadeUp>

            {/* Title */}
            <FadeUp delay={0.1}>
              <TitleBlock
                title="You're in."
                subtitle={`${makerName} is watching. Prove yourself.`}
              />
            </FadeUp>

            {/* Vow quote */}
            <FadeUp delay={0.13}>
              <div
                className="flex items-stretch overflow-hidden rounded-[14px]"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
              >
                <div className="w-[3px] shrink-0" style={{ backgroundColor: 'var(--gold)' }} />
                <div className="flex-1 py-3 px-3.5">
                  <p className="text-[16px] leading-[23px] font-serif font-medium" style={{ color: 'var(--text)' }}>
                    &ldquo;{vow.refined_text}&rdquo;
                  </p>
                  <p className="text-[12px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    {vow.stake_amount > 0 ? `$${vow.stake_amount / 100} at stake` : 'Accountability only'}
                    {vow.stake_amount > 0 && <> &middot; {vow.destination} if broken</>}
                  </p>
                </div>
              </div>
            </FadeUp>

            {/* Progress bar */}
            <FadeUp delay={0.16}>
              <div className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <StatPill
                    value={dayNumber !== null ? `Day ${Math.min(dayNumber, totalDays)}` : '\u2014'}
                    label={`of ${totalDays}`}
                  />
                  <StatPill
                    value={countdownLabel || '\u2014'}
                    label={`Deadline: ${endDate}`}
                  />
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'rgba(212,162,79,0.12)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      background: 'linear-gradient(90deg, var(--gold-deep), var(--gold-bright))',
                    }}
                  />
                </div>
              </div>
            </FadeUp>

            {/* Text maker CTA */}
            {makerPhone && (
              <FadeUp delay={0.2}>
                <button
                  type="button"
                  onClick={handleTextMaker}
                  className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975]"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border-strong)',
                  }}
                >
                  <div className="min-h-[56px] flex items-center justify-center gap-2.5 px-5">
                    <MessageCircle className="w-[16px] h-[16px]" style={{ color: 'var(--gold-bright)' }} />
                    <span className="text-[14px] font-bold" style={{ color: 'var(--gold-bright)' }}>
                      Text {makerLabel}
                    </span>
                  </div>
                </button>
              </FadeUp>
            )}

            {/* Calendar reminder */}
            {vow.ends_at && (
              <FadeUp delay={makerPhone ? 0.25 : 0.2}>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleAddToCalendar}
                    className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975]"
                    style={{
                      background: calendarAdded
                        ? 'var(--surface)'
                        : 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
                      boxShadow: calendarAdded ? 'none' : '0 12px 24px rgba(212,162,79,0.28)',
                      border: calendarAdded ? '1px solid var(--border-strong)' : 'none',
                    }}
                  >
                    <div className="min-h-[56px] flex items-center justify-center gap-2.5 px-5">
                      <Calendar
                        className="w-[18px] h-[18px]"
                        color={calendarAdded ? 'var(--success)' : '#0B0D11'}
                      />
                      <span
                        className="text-[15px] font-extrabold tracking-[0.2px]"
                        style={{ color: calendarAdded ? 'var(--success)' : '#0B0D11' }}
                      >
                        {calendarAdded ? 'Added to calendar' : 'Add deadline to calendar'}
                      </span>
                    </div>
                  </button>
                  <p className="text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    Deadline: {endDate}
                  </p>
                </div>
              </FadeUp>
            )}

            {/* Witness info */}
            <FadeUp delay={makerPhone ? 0.3 : 0.25}>
              <p className="text-center text-[13px] leading-[19px]" style={{ color: 'var(--text-muted)' }}>
                {makerLabel} is your witness. They&apos;ll judge when time&apos;s up.
              </p>
            </FadeUp>

            {/* Timeline */}
            <FadeUp delay={makerPhone ? 0.35 : 0.3}>
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-bold tracking-[1.2px] uppercase" style={{ color: 'var(--text-muted)' }}>
                  TIMELINE
                </span>
                <Timeline vowId={vow.id} endsAt={vow.ends_at} />
              </div>
            </FadeUp>

            {/* Make your own vow */}
            <FadeUp delay={makerPhone ? 0.4 : 0.35}>
              <a
                href="https://unbreakablevow.app"
                className="block text-center text-[13px] py-3 transition-opacity hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                Make a vow of your own &rarr;
              </a>
            </FadeUp>
          </>
        )}
      </RitualScreen>
    );
  }

  // ─── DECLINED STATE ───
  if (status === 'declined') {
    return (
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>
        <FadeUp delay={0.1}>
          <TitleBlock
            title="Challenge declined."
            subtitle="No hard feelings."
          />
        </FadeUp>
        <FadeUp delay={0.2}>
          <a
            href="/"
            className="block text-center text-[13px] py-3 transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            Make your own vow &rarr;
          </a>
        </FadeUp>
      </RitualScreen>
    );
  }

  // ─── PENDING STATE (accept/decline) ───
  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton
            label="Accept Challenge"
            onPress={handleAccept}
            loading={busy}
          />
          <SecondaryButton label="Decline — no shame" onPress={handleDecline} />
        </>
      }
    >
      <FadeUp><HeaderBadge /></FadeUp>

      <FadeUp delay={0.05}>
        <div className="flex justify-center pt-4 pb-1">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(212,162,79,0.15), rgba(212,162,79,0.05))',
              border: '2px solid rgba(212,162,79,0.25)',
              boxShadow: '0 0 30px rgba(212,162,79,0.1)',
            }}
          >
            <Swords className="w-7 h-7" style={{ color: 'var(--gold)' }} />
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.08}>
        <TitleBlock
          title={`${makerName} challenged you.`}
          subtitle={vow.stake_amount > 0 ? "Real money is on the line. Are you in?" : "Your word is on the line. Are you in?"}
        />
      </FadeUp>

      <FadeUp delay={0.14}>
        <RitualCard>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
            <span className="text-[11px] font-bold tracking-[1.3px] uppercase" style={{ color: 'var(--gold)' }}>THE CHALLENGE</span>
          </div>
          <p className="text-[20px] font-serif font-medium leading-[28px]" style={{ color: 'var(--text)' }}>&ldquo;{vow.refined_text}&rdquo;</p>
          <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>At stake</span>
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
              {vow.stake_amount > 0 ? `$${vow.stake_amount / 100}` : 'Accountability only'}
            </span>
          </div>
          {vow.stake_amount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>If you fail</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{vow.destination}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Deadline</span>
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{endDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Witness</span>
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{makerName}</span>
          </div>
        </RitualCard>
      </FadeUp>

      {/* What this means */}
      <FadeUp delay={0.2}>
        <div className="flex flex-col gap-3 px-1">
          {[
            { icon: Swords, text: `${makerName} is both challenger and witness.` },
            { icon: Clock, text: `You have until ${endDate} to follow through.` },
            { icon: DollarSign, text: vow.stake_amount > 0 ? `If you fail, $${vow.stake_amount / 100} goes to ${vow.destination}.` : 'No money at stake — just your word.' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(212,162,79,0.08)', border: '1px solid rgba(212,162,79,0.12)' }}
              >
                <item.icon className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              </div>
              <span className="text-[14px] leading-[20px]" style={{ color: 'var(--text-secondary)' }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </FadeUp>

      <FadeUp delay={0.25}>
        <p className="text-center text-[13px] leading-[19px]" style={{ color: 'var(--text-muted)' }}>
          Accept and you&apos;re locked in. {makerLabel} will hold you to it.
        </p>
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

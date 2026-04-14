'use client';
import { useState, useEffect } from 'react';
import { Sparkles, Eye, MessageCircle, Check, Phone } from 'lucide-react';
import { RitualScreen, TitleBlock, PrimaryButton, FadeUp, HeaderBadge, StatPill } from '@/components/ui';

interface Vow {
  id: string;
  refined_text: string;
  stake_amount: number;
  destination: string;
  witness_name: string;
  witness_accepted_at: string | null;
  witness_declined: boolean;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
}

export default function WitnessInviteClient({ vow, token, makerName, makerPhone }: { vow: Vow; token: string; makerName: string; makerPhone: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>(
    vow.witness_accepted_at ? 'accepted' : vow.witness_declined ? 'declined' : 'pending'
  );
  const [justAccepted, setJustAccepted] = useState(false);
  // Reminder capture
  const [reminderExpanded, setReminderExpanded] = useState(false);
  const [reminderPhone, setReminderPhone] = useState('');
  const [reminderName, setReminderName] = useState('');
  const [reminderSaved, setReminderSaved] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [sworn, setSworn] = useState(false);

  const needsWitnessName = !vow.witness_name || vow.witness_name === 'Just me';

  const handleSaveReminder = async () => {
    const digits = reminderPhone.replace(/\D/g, '');
    if (digits.length < 7 || reminderSaving) return;
    setReminderSaving(true);
    // Format to E.164
    const formatted = digits.startsWith('1') && digits.length === 11
      ? `+${digits}`
      : digits.length === 10
        ? `+1${digits}`
        : `+${digits}`;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/accept-witness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({ token, action: 'save-reminder', phone: formatted, name: reminderName.trim() || undefined }),
      });
      if (res.ok) {
        setReminderSaved(true);
      } else {
        setError('Could not save reminder. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setReminderSaving(false);
  };

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/accept-witness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({ token, action: 'accept' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.error === 'vow_not_active'
          ? 'This vow is no longer active.'
          : data?.error === 'invalid_token'
            ? 'This invite link is no longer valid.'
            : `Failed to accept. Please try again. (${data?.error || res.status})`;
        console.error('[accept-witness] Error:', data);
        setError(msg);
        setBusy(false);
        return;
      }
      if (data?.error) {
        setError(data.error === 'vow_not_active' ? 'This vow is no longer active.' : 'Something went wrong. Please try again.');
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/accept-witness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({ token, action: 'decline' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.error('[accept-witness decline] Error:', data);
        setError(`Failed to decline. Please try again. (${data?.error || res.status})`);
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

  // Elapsed computation for time-based nudges
  const getElapsed = (): number => {
    if (!vow.starts_at || !vow.ends_at) return 0;
    const start = new Date(vow.starts_at).getTime();
    const end = new Date(vow.ends_at).getTime();
    if (end <= start) return 0;
    return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
  };

  const getNudgeSms = (elapsed: number): string => {
    if (elapsed < 0.15) return "How's the vow going?";
    if (elapsed < 0.85) return "Still keeping the vow? I'm paying attention.";
    return 'Almost verdict time. You good?';
  };

  const handleTextMaker = () => {
    const isJustAcceptedState = justAccepted;
    setJustAccepted(false);
    const smsBody = isJustAcceptedState
      ? "Just accepted your vow. I'm watching. 👀"
      : getNudgeSms(getElapsed());
    const message = encodeURIComponent(smsBody);
    if (makerPhone) {
      // Sanitize phone: keep only digits, +, and hyphens
      const cleanPhone = makerPhone.replace(/[^\d+\-]/g, '');
      window.location.href = `sms:${cleanPhone}?body=${message}`;
    } else {
      window.location.href = `sms:?body=${message}`;
    }
  };

  // Use first name only for intimacy
  const makerFirstName = makerName === 'Your friend' ? 'Your friend' : makerName.split(' ')[0];
  const makerLabel = makerName === 'Your friend' ? 'your friend' : makerFirstName;

  const endDate = vow.ends_at
    ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'TBD';

  // ─── RESOLVED STATE (voided/kept/broken) ───
  if (['voided', 'kept', 'broken'].includes(vow.status)) {
    const resolvedMessages: Record<string, { title: string; subtitle: string }> = {
      voided: { title: 'Vow withdrawn.', subtitle: `${makerFirstName} withdrew this vow.` },
      kept: { title: 'Vow kept!', subtitle: `${makerFirstName} kept their word. The verdict is in.` },
      broken: { title: 'Vow broken.', subtitle: `${makerFirstName} didn't follow through.` },
    };
    const msg = resolvedMessages[vow.status] || resolvedMessages.voided;
    return (
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>
        <FadeUp delay={0.1}>
          <TitleBlock title={msg.title} subtitle={msg.subtitle} />
        </FadeUp>
        <FadeUp delay={0.2}>
          <a
            href={`/?ref=witness&from=${encodeURIComponent(makerFirstName)}`}
            className="block w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975] text-center"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div className="min-h-[50px] flex items-center justify-center px-5">
              <span className="text-[14px] font-bold" style={{ color: 'var(--gold-bright)' }}>
                Your turn &mdash; make a vow of your own
              </span>
            </div>
          </a>
        </FadeUp>
      </RitualScreen>
    );
  }

  // ─── ACCEPTED STATE ───
  if (status === 'accepted') {
    const now = new Date();
    const end = vow.ends_at ? new Date(vow.ends_at) : null;
    const isVerdictDue = end ? now >= end : false;
    const start = vow.starts_at ? new Date(vow.starts_at) : null;
    const totalDays = (start && end) ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000)) : 7;
    const daysLeft = end ? Math.ceil((end.getTime() - now.getTime()) / 86400000) : null;
    const dayNumber = daysLeft !== null ? Math.max(1, totalDays - daysLeft + 1) : null;
    const countdownLabel = daysLeft === null ? null
      : daysLeft <= 0 ? "Time's up"
      : daysLeft === 1 ? 'Last day'
      : `${daysLeft} days left`;

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
                  <Eye className="w-9 h-9" style={{ color: 'var(--success)' }} />
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={0.15}>
              <TitleBlock
                title="You're locked in."
                subtitle={`${makerFirstName} has been notified. The vow is real now.`}
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
                <a
                  href={`/?ref=witness&from=${encodeURIComponent(makerFirstName)}`}
                  onClick={() => {
                    // Track reciprocal CTA tap
                    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/audit_events`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
                        'Prefer': 'return=minimal',
                      },
                      body: JSON.stringify({ vow_id: vow.id, event_type: 'reciprocal_cta_tapped', actor_type: 'witness', metadata: {} }),
                    }).catch(() => {});
                  }}
                  className="block w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975] text-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
                    boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
                  }}
                >
                  <div className="min-h-[56px] flex items-center justify-center px-5">
                    <span className="text-[15px] font-extrabold tracking-[0.2px]" style={{ color: '#0B0D11' }}>
                      Your move &mdash; make a vow and pick {makerLabel} to judge you
                    </span>
                  </div>
                </a>
                {makerPhone && (
                  <button
                    type="button"
                    onClick={handleTextMaker}
                    className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975]"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border-strong)',
                    }}
                  >
                    <div className="min-h-[50px] flex items-center justify-center gap-2 px-5">
                      <MessageCircle className="w-[16px] h-[16px]" style={{ color: 'var(--gold-bright)' }} />
                      <span className="text-[14px] font-bold" style={{ color: 'var(--gold-bright)' }}>
                        Tell {makerLabel} you&apos;re watching
                      </span>
                    </div>
                  </button>
                )}
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
                title={isVerdictDue ? "Time's up." : "You're watching."}
                subtitle={isVerdictDue
                  ? `Did ${makerFirstName} keep the vow? Your call.`
                  : `${makerFirstName} is counting on your honesty.`
                }
              />
            </FadeUp>

            {/* Vow quote — compact, not a full card */}
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
                    {vow.stake_amount > 0
                      ? `$${vow.stake_amount / 100} at stake · ${vow.destination} if broken`
                      : 'Their word is on the line'}
                  </p>
                </div>
              </div>
            </FadeUp>

            {/* Stats row */}
            {!isVerdictDue && (
              <FadeUp delay={0.16}>
                <div className="flex gap-3">
                  <StatPill
                    value={dayNumber !== null ? `Day ${Math.min(dayNumber, totalDays)}` : '—'}
                    label={`of ${totalDays}`}
                  />
                  <StatPill
                    value={countdownLabel || '—'}
                    label={`Verdict: ${endDate}`}
                  />
                </div>
              </FadeUp>
            )}

            {/* Primary CTA: Text the maker — time-based nudge */}
            {!isVerdictDue && (() => {
              const elapsed = getElapsed();
              const nudgeLabel = elapsed < 0.15
                ? `Send ${makerLabel} a message`
                : elapsed < 0.85
                  ? `Check in on ${makerLabel}`
                  : `The clock is ticking — message ${makerLabel}`;
              return (
                <FadeUp delay={0.2}>
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
                        {nudgeLabel}
                      </span>
                    </div>
                  </button>
                </FadeUp>
              );
            })()}

            {/* Secondary: Reminder phone capture */}
            {!isVerdictDue && (
              <FadeUp delay={0.25}>
                {reminderSaved ? (
                  <div
                    className="flex items-center justify-center gap-2 py-3.5 rounded-[18px]"
                    style={{ backgroundColor: 'rgba(82,214,154,0.08)', border: '1px solid rgba(82,214,154,0.2)' }}
                  >
                    <Check className="w-4 h-4" style={{ color: 'var(--success)' }} />
                    <span className="text-[14px] font-semibold" style={{ color: 'var(--success)' }}>
                      Reminder set — we&apos;ll text you on verdict day
                    </span>
                  </div>
                ) : reminderExpanded ? (
                  <div
                    className="rounded-[18px] p-4 flex flex-col gap-3"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" style={{ color: 'var(--gold-bright)' }} />
                      <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                        {vow.witness_name && vow.witness_name !== 'Just me' ? `Hey ${vow.witness_name}! ` : ''}Get a text on verdict day
                      </span>
                    </div>
                    {needsWitnessName && (
                      <input
                        type="text"
                        value={reminderName}
                        onChange={(e) => setReminderName(e.target.value)}
                        placeholder="Your name"
                        className="w-full bg-transparent text-[15px] outline-none py-2.5 px-3.5 rounded-xl"
                        style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
                      />
                    )}
                    <input
                      type="tel"
                      value={reminderPhone}
                      onChange={(e) => setReminderPhone(e.target.value)}
                      placeholder="Phone number"
                      autoFocus
                      className="w-full bg-transparent text-[15px] outline-none py-2.5 px-3.5 rounded-xl"
                      style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
                    />
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={handleSaveReminder}
                        disabled={!reminderPhone.trim() || reminderSaving}
                        className="px-5 py-2.5 rounded-xl text-[14px] font-bold transition-opacity"
                        style={{
                          backgroundColor: 'var(--gold-bright)',
                          color: '#0B0D11',
                          opacity: !reminderPhone.trim() || reminderSaving ? 0.5 : 1,
                        }}
                      >
                        {reminderSaving ? 'Saving...' : 'Remind me'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReminderExpanded(false)}
                        className="text-[13px] font-medium"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        No thanks
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReminderExpanded(true)}
                    className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975]"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
                  >
                    <div className="min-h-[50px] flex items-center justify-center gap-2 px-5">
                      <span className="text-[14px] font-bold" style={{ color: 'var(--gold-bright)' }}>
                        Remind me on verdict day
                      </span>
                    </div>
                  </button>
                )}
              </FadeUp>
            )}

            {/* Tertiary: make your own vow */}
            <FadeUp delay={makerPhone ? 0.3 : 0.25}>
              <a
                href={`/?ref=witness&from=${encodeURIComponent(makerFirstName)}`}
                className="block w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975] text-center"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <div className="min-h-[50px] flex items-center justify-center px-5">
                  <span className="text-[14px] font-bold" style={{ color: 'var(--gold-bright)' }}>
                    Your move &mdash; make a vow and pick {makerLabel} to judge you
                  </span>
                </div>
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
            title="Declined."
            subtitle={`${makerFirstName} will be notified. The vow continues without a witness.`}
          />
        </FadeUp>
        <FadeUp delay={0.2}>
          <a
            href={`/?ref=witness&from=${encodeURIComponent(makerFirstName)}`}
            className="block w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975] text-center"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
          >
            <div className="min-h-[50px] flex items-center justify-center px-5">
              <span className="text-[14px] font-bold" style={{ color: 'var(--gold-bright)' }}>
                Make a vow of your own
              </span>
            </div>
          </a>
        </FadeUp>
      </RitualScreen>
    );
  }

  // ─── PENDING STATE (accept/decline) ───
  const stakeDisplay = vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)}` : null;

  return (
    <RitualScreen
      footer={
        <PrimaryButton
          label={busy ? 'Accepting...' : "I'll hold them to it"}
          onPress={handleAccept}
          loading={busy}
          disabled={!sworn}
        />
      }
    >
      <FadeUp><HeaderBadge /></FadeUp>

      <FadeUp delay={0.06}>
        <h1 className="text-[28px] font-bold font-serif leading-[34px] tracking-[-0.5px] text-center" style={{ color: 'var(--text)' }}>
          {makerFirstName} made a vow.
        </h1>
      </FadeUp>

      <FadeUp delay={0.12}>
        <p className="text-[22px] font-serif font-medium leading-[30px] text-center" style={{ color: 'var(--text)' }}>
          &ldquo;{vow.refined_text}&rdquo;
        </p>
      </FadeUp>

      <FadeUp delay={0.18}>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[15px] leading-[22px] text-center" style={{ color: 'var(--text-secondary)' }}>
            {stakeDisplay
              ? `If ${makerFirstName} breaks it, ${stakeDisplay} goes to ${vow.destination}.`
              : `No money at stake — just their word.`}
          </p>
          <p className="text-[15px] leading-[22px] text-center" style={{ color: 'var(--text-secondary)' }}>
            You decide on {endDate}.
          </p>
        </div>
      </FadeUp>

      <FadeUp delay={0.24}>
        <div className="flex flex-col gap-2 -mt-1">
          <button
            type="button"
            onClick={() => setSworn(!sworn)}
            className="flex items-start gap-3 w-full text-left py-3 px-4 rounded-[16px] transition-all"
            style={{
              backgroundColor: sworn ? 'rgba(212,162,79,0.08)' : 'transparent',
              border: `1px solid ${sworn ? 'rgba(212,162,79,0.25)' : 'var(--border)'}`,
            }}
          >
            <div
              className="w-6 h-6 rounded-[7px] flex items-center justify-center shrink-0 mt-0.5 transition-all"
              style={{
                backgroundColor: sworn ? 'var(--gold-bright)' : 'transparent',
                border: sworn ? '2px solid var(--gold-bright)' : '2px solid var(--text-muted)',
              }}
            >
              {sworn && (
                <Check className="w-3.5 h-3.5" style={{ color: '#0B0D11' }} strokeWidth={3} />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold font-serif" style={{ color: 'var(--gold-bright)' }}>
                I do solemnly swear
              </span>
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                to keep {makerLabel} accountable
              </span>
            </div>
          </button>
          {!sworn && (
            <p className="text-[11px] text-center mt-1" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              they picked you for a reason
            </p>
          )}
        </div>
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

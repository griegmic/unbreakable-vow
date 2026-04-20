'use client';
import { useState, useEffect } from 'react';
import { Check, Phone, MessageCircle } from 'lucide-react';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { SecondaryButton } from '@/components/uv/SecondaryButton';
import { OathCheckbox } from '@/components/uv/OathCheckbox';
import { Card } from '@/components/uv/Card';
import { Input } from '@/components/uv/Input';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { HamburgerMenu } from '@/components/hamburger-menu';

interface Vow {
  id: string;
  refined_text: string;
  stake_amount: number;
  destination: string;
  witness_name: string;
  witness_phone: string | null;
  witness_accepted_at: string | null;
  witness_declined: boolean;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
}

export default function WitnessInviteClient({ vow, token, makerName, makerPhone }: { vow: Vow; token: string; makerName: string; makerPhone: string | null }) {
  const { isAuthenticated } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>(
    vow.witness_accepted_at ? 'accepted' : vow.witness_declined ? 'declined' : 'pending'
  );
  // Post-accept flow: capturing (phone) → null (dashboard)
  const [acceptPhase, setAcceptPhase] = useState<'capturing' | null>(null);
  // Reminder capture
  const [reminderExpanded, setReminderExpanded] = useState(false);
  const [reminderPhone, setReminderPhone] = useState('');
  const [reminderName, setReminderName] = useState('');
  const [reminderSaved, setReminderSaved] = useState(false);
  const [reminderSkipped, setReminderSkipped] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [sworn, setSworn] = useState(false);

  const needsWitnessName = !vow.witness_name || vow.witness_name === 'Just me' || vow.witness_name === 'Your witness';

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

  const handleAccept = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Use JWT if authenticated so edge function can link witness_user_id
      let authToken = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) authToken = session.access_token;
      } catch {}
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/accept-witness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${authToken}`,
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
        setError(data.error === 'vow_not_active' ? 'This vow is no longer active.' : 'Failed to accept. Please try again.');
        setBusy(false);
        return;
      }
      setAcceptPhase(vow.witness_phone ? null : 'capturing');
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
        setError('Failed to decline. Please try again.');
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
    const isJustAcceptedState = acceptPhase !== null;
    if (acceptPhase) setAcceptPhase(null);
    const smsBody = isJustAcceptedState
      ? "Just accepted your vow. I'm watching. \u{1F440}"
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
              UNBREAKABLE VOW
            </span>
            {isAuthenticated && <HamburgerMenu />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
            <h1 style={{ fontSize: 28, fontWeight: 600, fontFamily: 'var(--uv-font-serif)', color: 'var(--uv-text)', margin: 0 }}>
              {msg.title}
            </h1>
            <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
              {msg.subtitle}
            </p>
          </div>
          <a href="/create" style={{ textDecoration: 'none' }}>
            <PrimaryButton>Make your own vow &rarr;</PrimaryButton>
          </a>
        </div>
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
      <RitualScreen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
              UNBREAKABLE VOW
            </span>
            {isAuthenticated && <HamburgerMenu />}
          </div>

          {acceptPhase === 'capturing' ? (
            /* ── POST-ACCEPT: Confirmation line + phone capture ── */
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(82,214,154,0.08)',
                  border: '1px solid rgba(82,214,154,0.15)',
                }}
              >
                <Check style={{ width: 16, height: 16, color: 'var(--uv-success)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--uv-success)', fontFamily: 'var(--uv-font-sans)' }}>
                  You&apos;re on it.
                </span>
              </div>

              <Card>
                <p style={{ fontSize: 13, fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', color: 'var(--uv-gold)', margin: 0 }}>
                  &ldquo;{vow.refined_text}&rdquo;
                </p>
              </Card>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
                <h2 style={{ fontSize: 24, fontWeight: 600, fontFamily: 'var(--uv-font-serif)', color: 'var(--uv-text)', margin: 0 }}>
                  You&apos;re the judge.
                </h2>
                <p style={{ fontSize: 14, color: 'var(--uv-text-muted)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
                  We&apos;ll text you on {endDate} when it&apos;s time to deliver your verdict.
                </p>
              </div>

              <Input
                type="tel"
                value={reminderPhone}
                onChange={(val) => setReminderPhone(val)}
                placeholder="Phone number"
                label="Phone number"
              />

              {error && (
                <div style={{ borderRadius: 12, padding: '12px 16px', fontSize: 14, backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--uv-danger)', border: '1px solid var(--uv-danger)' }}>
                  {error}
                </div>
              )}

              <div style={{ flex: 1 }} />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <PrimaryButton
                  onClick={async () => {
                    const digits = reminderPhone.replace(/\D/g, '');
                    if (digits.length < 7) return;
                    await handleSaveReminder();
                    setAcceptPhase(null);
                  }}
                  disabled={!reminderPhone.trim()}
                  loading={reminderSaving}
                >
                  Done
                </PrimaryButton>
                <SecondaryButton onClick={() => { setReminderSkipped(true); setAcceptPhase(null); }}>
                  Not now
                </SecondaryButton>
              </div>
            </>
          ) : (
            /* ── DASHBOARD ── */
            <>
              {/* Status badge */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 999,
                    backgroundColor: isVerdictDue ? 'rgba(212,162,79,0.12)' : 'rgba(82,214,154,0.08)',
                    border: isVerdictDue ? '1px solid var(--uv-border-strong)' : '1px solid rgba(82,214,154,0.22)',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: isVerdictDue ? 'var(--uv-gold-bright)' : 'var(--uv-success)',
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: isVerdictDue ? 'var(--uv-gold-bright)' : 'var(--uv-success)', fontFamily: 'var(--uv-font-sans)' }}>
                    {isVerdictDue ? 'VERDICT DUE' : 'VOW ACTIVE'}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h1 style={{ fontSize: 26, fontWeight: 600, fontFamily: 'var(--uv-font-serif)', color: 'var(--uv-text)', margin: 0 }}>
                  {isVerdictDue ? "Time's up." : "You're watching."}
                </h1>
                <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
                  {isVerdictDue
                    ? `Did ${makerFirstName} keep the vow? Your call.`
                    : `${makerFirstName} is counting on your honesty.`
                  }
                </p>
              </div>

              {/* Vow quote */}
              <Card>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
                  <div style={{ width: 3, borderRadius: 2, backgroundColor: 'var(--uv-gold)', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <p style={{ fontSize: 16, lineHeight: '23px', fontFamily: 'var(--uv-font-serif)', fontWeight: 500, color: 'var(--uv-text)', margin: 0 }}>
                      &ldquo;{vow.refined_text}&rdquo;
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--uv-text-muted)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
                      {vow.stake_amount > 0
                        ? `$${vow.stake_amount / 100} at stake \u00B7 ${vow.destination} if broken`
                        : 'Their word is on the line'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Stats row */}
              {!isVerdictDue && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, padding: '12px 16px', borderRadius: 'var(--uv-radius-md)', backgroundColor: 'var(--uv-bg-card)', border: '1px solid var(--uv-border-strong)', textAlign: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', display: 'block' }}>
                      {dayNumber !== null ? `Day ${Math.min(dayNumber, totalDays)}` : '\u2014'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)' }}>
                      of {totalDays}
                    </span>
                  </div>
                  <div style={{ flex: 1, padding: '12px 16px', borderRadius: 'var(--uv-radius-md)', backgroundColor: 'var(--uv-bg-card)', border: '1px solid var(--uv-border-strong)', textAlign: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', display: 'block' }}>
                      {countdownLabel || '\u2014'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)' }}>
                      Verdict: {endDate}
                    </span>
                  </div>
                </div>
              )}

              {/* Primary CTA: Text the maker */}
              {!isVerdictDue && (() => {
                const elapsed = getElapsed();
                const nudgeLabel = elapsed < 0.15
                  ? `Send ${makerLabel} a message`
                  : elapsed < 0.85
                    ? `Check in on ${makerLabel}`
                    : `The clock is ticking \u2014 message ${makerLabel}`;
                return (
                  <PrimaryButton onClick={handleTextMaker}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <MessageCircle style={{ width: 16, height: 16 }} />
                      {nudgeLabel}
                    </span>
                  </PrimaryButton>
                );
              })()}

              {/* Verdict due CTA */}
              {isVerdictDue && (
                <PrimaryButton onClick={() => window.location.href = `/w/${token}/verdict`}>
                  Deliver your verdict
                </PrimaryButton>
              )}

              {/* Phone capture — only if skipped on screen 2 */}
              {!isVerdictDue && !reminderSaved && reminderSkipped && (
                <>
                  {reminderExpanded ? (
                    <Card>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Phone style={{ width: 16, height: 16, color: 'var(--uv-gold-bright)' }} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)' }}>
                            We&apos;ll text you on verdict day
                          </span>
                        </div>
                        {needsWitnessName && (
                          <Input
                            type="text"
                            value={reminderName}
                            onChange={(val) => setReminderName(val)}
                            placeholder="Your first name"
                          />
                        )}
                        <Input
                          type="tel"
                          value={reminderPhone}
                          onChange={(val) => setReminderPhone(val)}
                          placeholder="Phone number"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <PrimaryButton
                            onClick={handleSaveReminder}
                            disabled={!reminderPhone.trim()}
                            loading={reminderSaving}
                          >
                            Done
                          </PrimaryButton>
                          <SecondaryButton onClick={() => setReminderExpanded(false)}>
                            Not now
                          </SecondaryButton>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <SecondaryButton onClick={() => setReminderExpanded(true)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Phone style={{ width: 14, height: 14 }} />
                        Get a verdict-day reminder
                      </span>
                    </SecondaryButton>
                  )}
                </>
              )}

              {/* Saved confirmation */}
              {!isVerdictDue && reminderSaved && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '14px 16px',
                    borderRadius: 'var(--uv-radius-md)',
                    backgroundColor: 'rgba(82,214,154,0.08)',
                    border: '1px solid rgba(82,214,154,0.2)',
                  }}
                >
                  <Check style={{ width: 16, height: 16, color: 'var(--uv-success)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-success)', fontFamily: 'var(--uv-font-sans)' }}>
                    We&apos;ll text you on {endDate}
                  </span>
                </div>
              )}

              {/* Growth CTAs */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                <a href="/create" style={{ fontSize: 13, fontWeight: 500, color: 'var(--uv-gold)', textDecoration: 'none', fontFamily: 'var(--uv-font-sans)' }}>
                  Make your own vow &rarr;
                </a>
              </div>
            </>
          )}
        </div>
      </RitualScreen>
    );
  }

  // ─── DECLINED STATE ───
  if (status === 'declined') {
    return (
      <RitualScreen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
              UNBREAKABLE VOW
            </span>
            {isAuthenticated && <HamburgerMenu />}
          </div>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 style={{ fontSize: 28, fontWeight: 600, fontFamily: 'var(--uv-font-serif)', color: 'var(--uv-text)', margin: 0 }}>
              Stepped back.
            </h1>
            <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
              {makerFirstName} has been told.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a href="/create" style={{ textDecoration: 'none' }}>
              <PrimaryButton>Make your own vow &rarr;</PrimaryButton>
            </a>
            <div style={{ textAlign: 'center' }}>
              <a href={`/?ref=witness&dare=${encodeURIComponent(makerFirstName)}`} style={{ fontSize: 13, fontWeight: 500, color: 'var(--uv-gold)', textDecoration: 'none', fontFamily: 'var(--uv-font-sans)' }}>
                Dare {makerFirstName} &rarr;
              </a>
            </div>
          </div>
        </div>
      </RitualScreen>
    );
  }

  // ─── PENDING STATE (accept/decline) ───
  const stakeDisplay = vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)}` : null;

  return (
    <RitualScreen variant="ceremony">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
            UNBREAKABLE VOW
          </span>
          {isAuthenticated && <HamburgerMenu />}
        </div>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, fontFamily: 'var(--uv-font-serif)', color: 'var(--uv-text)', margin: 0, lineHeight: 1.2 }}>
            {makerFirstName} made an Unbreakable Vow.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--uv-text-muted)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
            They&apos;re asking you to judge.
          </p>
        </div>

        <Card variant="elevated">
          <p style={{ fontSize: 20, fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontStyle: 'italic', color: 'var(--uv-gold)', margin: 0, textAlign: 'center', lineHeight: 1.4 }}>
            &ldquo;{vow.refined_text}&rdquo;
          </p>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', margin: 0, textAlign: 'center', fontFamily: 'var(--uv-font-sans)' }}>
            {stakeDisplay
              ? `If ${makerFirstName} breaks it, ${stakeDisplay} goes to ${vow.destination}.`
              : `No money at stake \u2014 just their word.`}
          </p>
          <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', margin: 0, textAlign: 'center', fontFamily: 'var(--uv-font-sans)' }}>
            You decide on {endDate}.
          </p>
        </div>

        <OathCheckbox
          checked={sworn}
          onChange={setSworn}
          label={`I swear to keep ${makerLabel} accountable`}
        />

        {!sworn && (
          <p style={{ fontSize: 11, textAlign: 'center', color: 'var(--uv-text-faint)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
            they picked you for a reason
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PrimaryButton
            onClick={handleAccept}
            loading={busy}
            disabled={!sworn}
          >
            I&apos;ll judge &rarr;
          </PrimaryButton>
          <div style={{ textAlign: 'center' }}>
            <SecondaryButton onClick={handleDecline}>
              I can&apos;t
            </SecondaryButton>
          </div>
        </div>

        <p style={{ fontSize: 11, textAlign: 'center', color: 'var(--uv-text-faint)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
          By accepting, you agree to receive a text on verdict day. Msg &amp; data rates may apply.
        </p>

        {error && (
          <div style={{ borderRadius: 12, padding: '12px 16px', fontSize: 14, backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--uv-danger)', border: '1px solid var(--uv-danger)', fontFamily: 'var(--uv-font-sans)' }}>
            {error}
          </div>
        )}
      </div>
    </RitualScreen>
  );
}

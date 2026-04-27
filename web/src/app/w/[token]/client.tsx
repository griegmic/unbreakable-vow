'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { FrauncesSub, GoldCTA } from '@/components/primitives';
import { supabase } from '@/lib/supabase';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>(
    vow.witness_accepted_at ? 'accepted' : vow.witness_declined ? 'declined' : 'pending'
  );
  // Post-accept flow: capturing (phone) → null (dashboard)
  const [acceptPhase, setAcceptPhase] = useState<'capturing' | null>(null);
  // Reminder capture
  const [reminderPhone, setReminderPhone] = useState('');
  const [reminderName, setReminderName] = useState('');
  const [reminderSaving, setReminderSaving] = useState(false);

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
        setAcceptPhase(null);
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

  // Elapsed computation for time-based nudges
  const getElapsed = (): number => {
    if (!vow.starts_at || !vow.ends_at) return 0;
    const start = new Date(vow.starts_at).getTime();
    const end = new Date(vow.ends_at).getTime();
    if (end <= start) return 0;
    return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
  };

  const getNudgeSms = (elapsed: number): string => {
    if (elapsed < 0.15) return "I'm officially watching. Keep it clean.";
    if (elapsed < 0.85) return "Still keeping the vow? I'm paying attention.";
    return 'Almost verdict time. You good?';
  };

  const handleTextMaker = () => {
    const isJustAcceptedState = acceptPhase !== null;
    if (acceptPhase) setAcceptPhase(null);
    const smsBody = isJustAcceptedState
        ? (vow.status === 'draft'
          ? "I accepted. Now ante up and finish staking your vow."
          : "Just accepted your vow. I'm officially watching.")
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

  const displayMakerName = makerName.replace(/\D/g, '').length >= 7 ? 'Your friend' : makerName;
  // Use first name only for intimacy
  const makerFirstName = displayMakerName === 'Your friend' ? 'Your friend' : displayMakerName.split(' ')[0];
  const endDate = vow.ends_at
    ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'TBD';
  const verdictWeekday = vow.ends_at
    ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'long' })
    : 'verdict day';

  // ─── RESOLVED STATE (voided/kept/broken) ───
  if (['voided', 'kept', 'broken'].includes(vow.status)) {
    const resolvedMessages: Record<string, { title: string; subtitle: string }> = {
      voided: { title: 'Vow withdrawn.', subtitle: `${makerFirstName} withdrew this vow.` },
      kept: { title: 'Vow kept!', subtitle: `${makerFirstName} kept their word. The verdict is in.` },
      broken: { title: 'Vow broken.', subtitle: `${makerFirstName} didn't follow through.` },
    };
    const msg = resolvedMessages[vow.status] || resolvedMessages.voided;
    return (
      <div style={{ minHeight: "100dvh", background: "var(--uv-bg)", backgroundImage: "radial-gradient(ellipse at 50% 20%, rgba(200,155,60,0.06), var(--uv-bg) 70%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 36px 40px" }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
              UNBREAKABLE VOW
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
            <h1 style={{ fontSize: 28, fontWeight: 600, fontFamily: 'var(--uv-font-serif)', color: 'var(--uv-text)', margin: 0 }}>
              {msg.title}
            </h1>
            <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
              {msg.subtitle}
            </p>
          </div>
          <Link href="/quick-vow" style={{ textDecoration: 'none' }}>
            <button style={{ width: "100%", height: 62, borderRadius: 14, border: "none", background: "linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold) 60%, var(--uv-gold-deep))", color: "var(--uv-text-on-gold)", fontFamily: "var(--uv-font-serif)", fontSize: 17, fontWeight: 500, cursor: "pointer" }}>Make your own vow &rarr;</button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── ACCEPTED STATE ───
  if (status === 'accepted') {
    const end = vow.ends_at ? new Date(vow.ends_at) : null;
    const needsMakerToFinish = vow.status === 'draft';
    const needsVerdictNow = vow.status === 'awaiting_verdict';

    if (needsVerdictNow) {
      return (
        <div style={{ minHeight: "100dvh", background: "var(--uv-bg)", backgroundImage: "radial-gradient(ellipse at 50% 20%, rgba(200,155,60,0.06), var(--uv-bg) 70%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "42px 24px 24px" }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 340, alignItems: 'center', minHeight: 'calc(100dvh - 66px)' }}>
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
              <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--uv-success)', fontFamily: 'var(--uv-font-sans)' }}>
                You&apos;re on it.
              </span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <h1 style={{ margin: 0, fontFamily: 'var(--uv-font-sans)', fontSize: 34, lineHeight: 1.02, fontWeight: 850, color: 'var(--uv-text)', letterSpacing: 0 }}>
                Time&apos;s up.<br/><span style={{ color: 'var(--uv-gold)' }}>It&apos;s your call.</span>
              </h1>
            </div>

            <p style={{ maxWidth: 290, margin: 0, fontFamily: 'var(--uv-font-sans)', fontSize: 15, lineHeight: 1.42, color: 'var(--uv-text-muted)', textAlign: 'center' }}>
              You accepted the job. Now call whether {makerFirstName} kept the vow.
            </p>

            <section style={{ width: '100%', borderRadius: 16, padding: '15px 15px 14px', background: 'linear-gradient(180deg, rgba(215,169,70,0.10), rgba(238,231,215,0.025))', border: '1px solid var(--uv-border-soft)', textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--uv-text-dim)', fontWeight: 750, marginBottom: 9 }}>
                The vow
              </div>
              <p style={{ margin: '0 0 12px', fontFamily: 'var(--uv-font-sans)', fontSize: 18, lineHeight: 1.25, color: 'var(--uv-text)', fontWeight: 750 }}>
                {vow.refined_text}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12, borderTop: '1px solid var(--uv-border-soft)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 32, borderRadius: 999, border: '1px solid var(--uv-gold-line)', background: 'rgba(215,169,70,0.10)', color: 'var(--uv-gold-bright)', padding: '0 11px', fontFamily: 'var(--uv-font-sans)', fontSize: 12.5, fontWeight: 750 }}>
                  {vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)} on the line` : 'Their word'}
                </span>
                {vow.destination && vow.stake_amount > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 32, borderRadius: 999, border: '1px solid var(--uv-border-soft)', background: 'rgba(238,231,215,0.035)', color: 'var(--uv-text-muted)', padding: '0 11px', fontFamily: 'var(--uv-font-sans)', fontSize: 12.5, fontWeight: 750 }}>
                    {vow.destination} if broken
                  </span>
                )}
              </div>
            </section>

            <div style={{ flex: 1 }} />

            <GoldCTA
              label="Deliver your verdict"
              onPress={() => { window.location.href = `/w/${token}/verdict`; }}
            />
            <Link href={`/w/${token}`} style={{ color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 650, textDecoration: 'none' }}>
              Back to vow
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: "100dvh", background: "var(--uv-bg)", backgroundImage: "radial-gradient(ellipse at 50% 20%, rgba(200,155,60,0.06), var(--uv-bg) 70%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "42px 24px 24px" }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 340, alignItems: 'center' }}>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
                <h2 style={{ fontSize: 30, lineHeight: 1.05, fontWeight: 750, fontFamily: 'var(--uv-font-sans)', color: 'var(--uv-text)', margin: 0 }}>
                  Where should we text you?
                </h2>
                <p style={{ fontSize: 15, lineHeight: 1.4, color: 'var(--uv-text-muted)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
                  We&apos;ll send the verdict link on {endDate}. That&apos;s the whole thing.
                </p>
              </div>

              <section style={{ width: '100%', borderRadius: 16, padding: '15px 15px 14px', background: 'linear-gradient(180deg, rgba(215,169,70,0.10), rgba(238,231,215,0.025))', border: '1px solid var(--uv-border-soft)', textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--uv-text-dim)', fontWeight: 750, marginBottom: 9 }}>
                  You accepted
                </div>
                <p style={{ margin: '0 0 12px', fontFamily: 'var(--uv-font-sans)', fontSize: 18, lineHeight: 1.25, color: 'var(--uv-text)', fontWeight: 750 }}>
                  {vow.refined_text}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12, borderTop: '1px solid var(--uv-border-soft)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 32, borderRadius: 999, border: '1px solid var(--uv-gold-line)', background: 'rgba(215,169,70,0.10)', color: 'var(--uv-gold-bright)', padding: '0 11px', fontFamily: 'var(--uv-font-sans)', fontSize: 12.5, fontWeight: 750 }}>
                    {vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)} on the line` : 'Their word'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 32, borderRadius: 999, border: '1px solid var(--uv-border-soft)', background: 'rgba(238,231,215,0.035)', color: 'var(--uv-text-muted)', padding: '0 11px', fontFamily: 'var(--uv-font-sans)', fontSize: 12.5, fontWeight: 750 }}>
                    {verdictWeekday === 'verdict day' ? 'Verdict day' : `${verdictWeekday} verdict`}
                  </span>
                </div>
              </section>

              <input
                type="tel"
                value={reminderPhone}
                onChange={(e) => setReminderPhone(e.target.value)}
                placeholder="Phone number"
                style={{ width: '100%', height: 52, padding: '0 16px', borderRadius: 14, border: '1px solid var(--uv-border)', background: 'var(--uv-bg-card)', color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', fontSize: 16, outline: 'none' }}
              />

              {needsWitnessName && (
                <input
                  type="text"
                  value={reminderName}
                  onChange={(e) => setReminderName(e.target.value)}
                  placeholder="Your name"
                  style={{ width: '100%', height: 52, padding: '0 16px', borderRadius: 14, border: '1px solid var(--uv-border)', background: 'var(--uv-bg-card)', color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', fontSize: 16, outline: 'none' }}
                />
              )}

              <p style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--uv-text-dim)', margin: '-2px 0 0', fontFamily: 'var(--uv-font-sans)', textAlign: 'center' }}>
                {needsWitnessName ? `${makerFirstName} will see who accepted.` : 'Just the verdict link. Nothing else.'}
              </p>

              {error && (
                <div style={{ borderRadius: 12, padding: '12px 16px', fontSize: 14, backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--uv-danger)', border: '1px solid var(--uv-danger)' }}>
                  {error}
                </div>
              )}

              <div style={{ flex: 1 }} />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={async () => {
                    const digits = reminderPhone.replace(/\D/g, '');
                    if (digits.length < 7) return;
                    await handleSaveReminder();
                    setAcceptPhase(null);
                  }}
                  disabled={!reminderPhone.trim() || reminderSaving}
                  style={{ width: '100%', height: 56, borderRadius: 999, border: 'none', background: !reminderPhone.trim() ? 'var(--uv-bg-elevated)' : 'linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold) 60%, var(--uv-gold-deep))', color: !reminderPhone.trim() ? 'var(--uv-text-dim)' : 'var(--uv-text-on-gold)', fontFamily: 'var(--uv-font-sans)', fontSize: 17, fontWeight: 800, cursor: !reminderPhone.trim() ? 'not-allowed' : 'pointer' }}
                >
                  Text me {verdictWeekday}
                </button>
                <button onClick={() => { setAcceptPhase(null); }} style={{ background: "none", border: "none", color: "var(--uv-text-dim)", fontFamily: "var(--uv-font-sans)", fontSize: 13, lineHeight: 1.2, cursor: "pointer", padding: 0 }}>
                  Not now
                </button>
              </div>
            </>
          ) : (
            /* ── S16: WITNESS ACCEPTED (V6 mock: 10-witness-accepted.html) ── */
            /* Rewritten from pre-V6 dashboard tracker to V6 accepted state. */
            /* Handlers (handleTextMaker, handleSaveReminder) preserved in scope. */
            <>
              {/* Gold checkmark circle — matches mock's 78px checkmark, not the full WaxSeal */}
              {/* TODO-MOCK-REFRESH: mock uses a 78px gold circle with check, not the WaxSeal primitive (96px md). */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <div style={{ position: 'relative', width: 64, height: 64 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, rgba(200,155,60,0.25), transparent 70%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--uv-gold-bright), var(--uv-gold))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 20px var(--uv-gold-glow)',
                    }}>
                      <span style={{ color: 'var(--uv-text-on-gold)', fontSize: 22, fontWeight: 700 }}>✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* "— YOU'RE IN —" stamp */}
              <div style={{ textAlign: 'center', fontFamily: 'var(--uv-font-sans)', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--uv-text-dim)' }}>
                — You&apos;re in —
              </div>

              <div style={{ textAlign: 'center' }}>
                <h1 style={{ margin: 0, fontFamily: 'var(--uv-font-sans)', fontSize: 34, lineHeight: 1.02, fontWeight: 850, color: 'var(--uv-text)', letterSpacing: 0 }}>
                  {needsMakerToFinish
                    ? <>{makerFirstName} still needs<br/><span style={{ color: 'var(--uv-gold)' }}>to stake it.</span></>
                    : <>{makerFirstName} knows<br/><span style={{ color: 'var(--uv-gold)' }}>you&apos;re watching.</span></>}
                </h1>
              </div>

              <div style={{ textAlign: 'center', maxWidth: 290 }}>
                <FrauncesSub>
                  {needsMakerToFinish ? (
                    <>
                      You accepted. Now nudge {makerFirstName} to put the money down and make it real.
                    </>
                  ) : (
                    <>
                      <strong style={{ color: 'var(--uv-text)', fontWeight: 500, fontStyle: 'normal' }}>That&apos;s it for now.</strong><br/>
                      Tasteful pestering is encouraged.
                    </>
                  )}
                </FrauncesSub>
              </div>

              <div style={{ width: '100%', borderRadius: 16, padding: '14px 16px', background: 'var(--uv-bg-card)', border: '1px solid var(--uv-border-soft)' }}>
                <p style={{ margin: '0 0 12px', fontFamily: 'var(--uv-font-sans)', fontSize: 12, color: 'var(--uv-text-dim)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 650 }}>
                  You&apos;re watching
                </p>
                <p style={{ margin: '0 0 12px', fontFamily: 'var(--uv-font-sans)', fontSize: 17, lineHeight: 1.3, color: 'var(--uv-text)', fontWeight: 600 }}>
                  {vow.refined_text}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 12, borderTop: '1px dashed var(--uv-border-soft)' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 10, color: 'var(--uv-text-dim)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 650 }}>On the line</div>
                    <div style={{ marginTop: 4, fontFamily: 'var(--uv-font-sans)', fontSize: 15, color: 'var(--uv-text)', fontWeight: 650 }}>{vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)}` : 'Their word'}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 10, color: 'var(--uv-text-dim)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 650 }}>If broken</div>
                    <div style={{ marginTop: 4, fontFamily: 'var(--uv-font-sans)', fontSize: 15, color: 'var(--uv-text)', fontWeight: 650 }}>{vow.destination || 'You call it'}</div>
                  </div>
                </div>
              </div>

              <div style={{ width: '100%', borderRadius: 16, padding: '14px 16px', background: 'rgba(238,231,215,0.035)', border: '1px solid var(--uv-border-soft)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 10, color: 'var(--uv-text-dim)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 650, marginBottom: 4 }}>Now</div>
                  <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 14, color: 'var(--uv-text)', fontWeight: 650 }}>{makerFirstName} knows.</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 10, color: 'var(--uv-text-dim)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 650, marginBottom: 4 }}>
                    {vow.ends_at ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short' }) : 'Verdict'}
                  </div>
                  <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 14, color: 'var(--uv-text)', fontWeight: 650 }}>You call it.</div>
                </div>
              </div>

              {/* Spacer */}
              {/* iMessage-green CTA per V6 mock */}
              <GoldCTA
                label={needsMakerToFinish ? `Text ${makerFirstName}: ante up` : `Pester ${makerFirstName} responsibly`}
                onPress={handleTextMaker}
                variant="filled-imsg-green"
              />

              <Link href="/quick-vow" style={{ color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 650, textDecoration: 'none' }}>
                Make your own vow &rarr;
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── DECLINED STATE ───
  if (status === 'declined') {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--uv-bg)", backgroundImage: "radial-gradient(ellipse at 50% 20%, rgba(200,155,60,0.06), var(--uv-bg) 70%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 36px 40px" }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
              UNBREAKABLE VOW
            </span>
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
            <Link href="/quick-vow" style={{ textDecoration: 'none' }}>
              <button style={{ width: "100%", height: 62, borderRadius: 14, border: "none", background: "linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold) 60%, var(--uv-gold-deep))", color: "var(--uv-text-on-gold)", fontFamily: "var(--uv-font-serif)", fontSize: 17, fontWeight: 500, cursor: "pointer" }}>Make your own vow &rarr;</button>
            </Link>
            <div style={{ textAlign: 'center' }}>
              <Link href="/cast" style={{ fontSize: 13, fontWeight: 500, color: 'var(--uv-gold)', textDecoration: 'none', fontFamily: 'var(--uv-font-sans)' }}>
                Dare {makerFirstName} &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PENDING STATE (accept/decline) ───
  const stakeDisplay = vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)}` : null;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--uv-bg)', backgroundImage: 'radial-gradient(ellipse at top, rgba(200,155,60,0.08), transparent 52%), radial-gradient(ellipse at 50% 100%, rgba(200,155,60,0.04), transparent 72%)', display: 'flex', justifyContent: 'center', padding: '22px 18px 24px' }}>
      <div style={{ width: '100%', maxWidth: 520, minHeight: 'calc(100dvh - 46px)', display: 'flex', flexDirection: 'column', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg, var(--uv-gold-bright), var(--uv-gold))', color: 'var(--uv-text-on-gold)', display: 'grid', placeItems: 'center', fontFamily: 'var(--uv-font-serif)', fontSize: 10, fontWeight: 700 }}>
              UV
            </div>
            <div style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 14, fontWeight: 500, color: 'var(--uv-text-muted)' }}>
              Unbreakable <em style={{ color: 'var(--uv-gold)', fontStyle: 'italic' }}>Vow</em>
            </div>
          </div>
        </div>

        <section style={{ textAlign: 'left', marginBottom: 18 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid var(--uv-gold-line)', borderRadius: 999, padding: '7px 11px', color: 'var(--uv-gold-bright)', fontFamily: 'var(--uv-font-sans)', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
            Witness invite
          </div>
          <h1 style={{ fontFamily: 'var(--uv-font-sans)', fontWeight: 800, fontSize: 42, lineHeight: 0.98, letterSpacing: 0, margin: '0 0 12px', color: 'var(--uv-text)' }}>
            {makerFirstName === 'Your friend' ? 'Your friend needs you.' : `${makerFirstName} needs you.`}
          </h1>
          <p style={{ fontFamily: 'var(--uv-font-sans)', fontWeight: 500, fontSize: 17, color: 'var(--uv-text-muted)', lineHeight: 1.42, margin: 0 }}>
            They put {stakeDisplay || 'their word'} on a promise. Your job is tiny but powerful: keep them honest, then call it kept or broken.
          </p>
        </section>

        <section style={{ background: 'linear-gradient(180deg, rgba(215,169,70,0.11), rgba(238,231,215,0.025))', border: '1px solid var(--uv-gold-line)', borderRadius: 18, padding: '15px 15px 14px', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 10, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--uv-text-dim)', fontWeight: 750, marginBottom: 10 }}>
            The vow
          </div>
          <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 23, lineHeight: 1.12, color: 'var(--uv-text)', fontWeight: 750, letterSpacing: 0, marginBottom: 14 }}>
            {vow.refined_text}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12, borderTop: '1px solid var(--uv-border-soft)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 34, borderRadius: 999, border: '1px solid var(--uv-gold-line)', background: 'rgba(215,169,70,0.1)', color: 'var(--uv-gold-bright)', padding: '0 12px', fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 750 }}>
              {stakeDisplay ? `${stakeDisplay} on the line` : 'Their word'}
            </span>
            {stakeDisplay && (
              <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 34, borderRadius: 999, border: '1px solid var(--uv-border-soft)', background: 'rgba(238,231,215,0.035)', color: 'var(--uv-text-muted)', padding: '0 12px', fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 750 }}>
                {vow.destination} if broken
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 34, borderRadius: 999, border: '1px solid var(--uv-border-soft)', background: 'rgba(238,231,215,0.035)', color: 'var(--uv-text-muted)', padding: '0 12px', fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 750 }}>
              You call it {endDate?.replace(/,.*$/, '') || 'verdict day'}
            </span>
          </div>
        </section>

        <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '13px 14px', border: '1px solid var(--uv-border-soft)', borderRadius: 16, background: 'rgba(238,231,215,0.035)', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 14.5, lineHeight: 1.2, color: 'var(--uv-text)', fontWeight: 750, marginBottom: 3 }}>Your job</div>
            <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, lineHeight: 1.3, color: 'var(--uv-text-muted)' }}>
              Accept, keep {makerFirstName} accountable, and we text you {endDate?.replace(/,.*$/, '') || 'verdict day'} to call it.
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: '0 0 auto', color: 'var(--uv-text-on-gold)', background: 'linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold))', fontSize: 18, fontWeight: 900 }}>
            ✓
          </div>
        </section>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <GoldCTA label={busy ? 'Accepting...' : `I'm in — hold ${makerFirstName} to it`} onPress={handleAccept} disabled={busy} />
          </div>
        </div>

        {error && (
          <div style={{ borderRadius: 12, padding: '12px 16px', fontSize: 14, backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--uv-danger)', border: '1px solid var(--uv-danger)', fontFamily: 'var(--uv-font-sans)', marginTop: 12 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

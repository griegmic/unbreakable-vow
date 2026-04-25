'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { FrauncesH1, FrauncesSub, GoldCTA, MutedSecondary, TimelineCard } from '@/components/primitives';
import { useAuth } from '@/providers/auth-provider';
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

  const displayMakerName = makerName.replace(/\D/g, '').length >= 7 ? 'Your friend' : makerName;
  // Use first name only for intimacy
  const makerFirstName = displayMakerName === 'Your friend' ? 'Your friend' : displayMakerName.split(' ')[0];
  const makerLabel = displayMakerName === 'Your friend' ? 'your friend' : makerFirstName;

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
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{ width: "100%", height: 62, borderRadius: 14, border: "none", background: "linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold) 60%, var(--uv-gold-deep))", color: "var(--uv-text-on-gold)", fontFamily: "var(--uv-font-serif)", fontSize: 17, fontWeight: 500, cursor: "pointer" }}>Make your own vow &rarr;</button>
          </Link>
        </div>
      </div>
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
      <div style={{ minHeight: "100dvh", background: "var(--uv-bg)", backgroundImage: "radial-gradient(ellipse at 50% 20%, rgba(200,155,60,0.06), var(--uv-bg) 70%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 28px 32px" }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 340, alignItems: 'center' }}>
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

              <div style={{ borderRadius: 18, padding: "18px 22px", background: "var(--uv-bg-card)", border: "1px solid var(--uv-border)" }}>
                <p style={{ fontSize: 13, fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', color: 'var(--uv-gold)', margin: 0 }}>
                  &ldquo;{vow.refined_text}&rdquo;
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
                <h2 style={{ fontSize: 24, fontWeight: 600, fontFamily: 'var(--uv-font-serif)', color: 'var(--uv-text)', margin: 0 }}>
                  You&apos;re the judge.
                </h2>
                <p style={{ fontSize: 14, color: 'var(--uv-text-muted)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
                  We&apos;ll text you on {endDate} when it&apos;s time to deliver your verdict.
                </p>
              </div>

              <input
                type="tel"
                value={reminderPhone}
                onChange={(e) => setReminderPhone(e.target.value)}
                placeholder="Phone number"
                style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 14, border: '1px solid var(--uv-border)', background: 'var(--uv-bg-input)', color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', fontSize: 16, outline: 'none' }}
              />

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
                  style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', background: !reminderPhone.trim() ? 'var(--uv-bg-elevated)' : 'linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold) 60%, var(--uv-gold-deep))', color: !reminderPhone.trim() ? 'var(--uv-text-dim)' : 'var(--uv-text-on-gold)', fontFamily: 'var(--uv-font-serif)', fontSize: 16, fontWeight: 500, cursor: !reminderPhone.trim() ? 'not-allowed' : 'pointer' }}
                >
                  Done
                </button>
                <button onClick={() => { setReminderSkipped(true); setAcceptPhase(null); }} style={{ background: "none", border: "none", color: "var(--uv-text-dim)", fontFamily: "var(--uv-font-sans)", fontSize: 13, lineHeight: 1.2, cursor: "pointer", padding: 0 }}>
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <div style={{ position: 'relative', width: 78, height: 78 }}>
                  <div style={{
                    width: 78, height: 78, borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, rgba(200,155,60,0.25), transparent 70%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--uv-gold-bright), var(--uv-gold))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 20px var(--uv-gold-glow)',
                    }}>
                      <span style={{ color: 'var(--uv-text-on-gold)', fontSize: 24, fontWeight: 700 }}>✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* "— YOU'RE IN —" stamp */}
              <div style={{ textAlign: 'center', fontFamily: 'var(--uv-font-sans)', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--uv-text-dim)' }}>
                — You&apos;re in —
              </div>

              {/* H1 per §3.2 S16 */}
              <div style={{ textAlign: 'center' }}>
                <FrauncesH1 italic size="page">{makerFirstName} knows<br/>you&apos;ve got <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>them.</em></FrauncesH1>
              </div>

              {/* Sub per §3.2 S16 */}
              <div style={{ textAlign: 'center', maxWidth: 290 }}>
                <FrauncesSub>
                  <strong style={{ color: 'var(--uv-text)', fontWeight: 500, fontStyle: 'normal' }}>That&apos;s it for now.</strong>{' '}
                  We&apos;ll text you {vow.ends_at ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'long' }) : 'verdict day'} at 9pm.
                </FrauncesSub>
              </div>

              {/* Timeline card per V6 mock — static labels, PATH A */}
              <TimelineCard
                steps={[
                  { label: 'Now', desc: `${makerFirstName} gets the green light.`, state: 'now' },
                  { label: `${daysLeft !== null && daysLeft > 1 ? 'Sat' : 'Tomorrow'} — 24h before`, desc: "We'll text you a heads-up.", state: 'future' },
                  { label: vow.ends_at ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short' }) + ', 9pm' : 'Verdict day', desc: 'One tap: did he keep it?', state: 'future' },
                ]}
              />

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* iMessage-green CTA per V6 mock */}
              <GoldCTA
                label={`Text ${makerFirstName}: I've got you`}
                onPress={handleTextMaker}
                variant="filled-imsg-green"
              />

              {/* Footer per mock: preview text + micro */}
              <div style={{ textAlign: 'center', fontFamily: 'var(--uv-font-sans)', fontSize: 12, lineHeight: 1.4, color: 'var(--uv-text-dim)' }}>
                Opens Messages with: <em style={{ color: 'var(--uv-text-muted)', fontStyle: 'italic' }}>&ldquo;Just accepted your vow. I&apos;m watching.&rdquo;</em>
              </div>

              {/* Early-accept note for draft/sealed vows */}
              {(vow.status === 'draft' || vow.status === 'sealed') && (
                <p style={{ textAlign: 'center', fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontStyle: 'italic', color: 'var(--uv-text-dim)', margin: '4px 0 0' }}>
                  {makerFirstName} is still setting things up. We&apos;ll text you when the vow goes live.
                </p>
              )}
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
            <Link href="/" style={{ textDecoration: 'none' }}>
              <button style={{ width: "100%", height: 62, borderRadius: 14, border: "none", background: "linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold) 60%, var(--uv-gold-deep))", color: "var(--uv-text-on-gold)", fontFamily: "var(--uv-font-serif)", fontSize: 17, fontWeight: 500, cursor: "pointer" }}>Make your own vow &rarr;</button>
            </Link>
            <div style={{ textAlign: 'center' }}>
              <Link href={`/?ref=witness&dare=${encodeURIComponent(makerFirstName)}`} style={{ fontSize: 13, fontWeight: 500, color: 'var(--uv-gold)', textDecoration: 'none', fontFamily: 'var(--uv-font-sans)' }}>
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
    <div style={{ minHeight: '100dvh', background: 'var(--uv-bg)', backgroundImage: 'radial-gradient(ellipse at top, rgba(200,155,60,0.07), transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(200,155,60,0.04), transparent 70%)', display: 'flex', flexDirection: 'column', padding: '30px 24px 26px' }}>
      {/* Brand: diamond seal + "Unbreakable Vow" wordmark per mock */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 18, height: 18, border: '1px solid var(--uv-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(45deg)' }}>
          <div style={{ width: 4, height: 4, background: 'var(--uv-gold)' }} />
        </div>
        <div style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 13, fontWeight: 500, letterSpacing: '0.01em', color: 'var(--uv-text-muted)' }}>
          Unbreakable <em style={{ color: 'var(--uv-gold)', fontStyle: 'italic' }}>Vow</em>
        </div>
      </div>

      {/* H1 per mock: "[Name] needs you to hold them to this." */}
      <h1 style={{ fontFamily: 'var(--uv-font-serif)', fontWeight: 400, fontVariationSettings: '"opsz" 144', fontSize: 30, lineHeight: 1.08, letterSpacing: '-0.018em', textAlign: 'center', marginBottom: 8, color: 'var(--uv-text)' }}>
        <span style={{ fontStyle: 'italic', color: 'var(--uv-gold)', fontWeight: 400 }}>{makerFirstName}</span> needs you<br/>to hold them to this.
      </h1>

      {/* Sub line per mock */}
      <div style={{ textAlign: 'center', fontFamily: 'var(--uv-font-serif)', fontWeight: 400, fontSize: 14.5, color: 'var(--uv-text-muted)', lineHeight: 1.5, marginBottom: 22, padding: '0 10px', fontStyle: 'italic' }}>
        {stakeDisplay
          ? <>They put {stakeDisplay} on it. If they break their word, <b style={{ color: 'var(--uv-text)', fontStyle: 'normal', fontWeight: 500 }}>you call it.</b></>
          : <>If they break their word, <b style={{ color: 'var(--uv-text)', fontStyle: 'normal', fontWeight: 500 }}>you call it.</b></>
        }
      </div>

      {/* Vow doc card per mock — surface bg, rule border, 6px radius */}
      <div style={{ background: 'var(--uv-bg-card)', border: '1px solid var(--uv-border-soft)', borderRadius: 6, padding: '20px 20px 16px', marginBottom: 16, position: 'relative' }}>
        {/* Gold gradient line at top */}
        <div style={{ position: 'absolute', top: 0, left: 22, right: 22, height: 1, background: 'linear-gradient(90deg, transparent, var(--uv-gold-line), transparent)' }} />
        {/* "— The Vow —" label */}
        <div style={{ fontSize: 9.5, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--uv-gold)', fontWeight: 500, marginBottom: 10, textAlign: 'center', fontFamily: 'var(--uv-font-sans)' }}>
          &mdash; The Vow &mdash;
        </div>
        {/* Vow quote */}
        <div style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 21, lineHeight: 1.28, color: 'var(--uv-text)', fontStyle: 'italic', fontWeight: 400, textAlign: 'center', letterSpacing: '-0.005em', padding: '4px 0 14px', borderBottom: '1px dashed var(--uv-border-soft)', marginBottom: 14 }}>
          &ldquo;{vow.refined_text}&rdquo;
        </div>
        {/* 2-column meta: ON THE LINE / YOU DECIDE */}
        {stakeDisplay && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 18px' }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--uv-text-dim)', fontWeight: 500, marginBottom: 4, fontFamily: 'var(--uv-font-sans)' }}>On the line</div>
              <div style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 15, fontWeight: 500, color: 'var(--uv-text)', letterSpacing: '-0.005em', fontFeatureSettings: '"tnum"' }}>
                {stakeDisplay}
                <span style={{ fontSize: 11, color: 'var(--uv-text-muted)', fontWeight: 400, fontStyle: 'italic', marginTop: 2, display: 'block' }}>to {vow.destination}, if broken</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--uv-text-dim)', fontWeight: 500, marginBottom: 4, fontFamily: 'var(--uv-font-sans)' }}>You decide</div>
              <div style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 15, fontWeight: 500, color: 'var(--uv-text)', letterSpacing: '-0.005em', fontFeatureSettings: '"tnum"' }}>
                {endDate?.replace(/,.*$/, '') || 'TBD'}
                <span style={{ fontSize: 11, color: 'var(--uv-text-muted)', fontWeight: 400, fontStyle: 'italic', marginTop: 2, display: 'block' }}>at 9:00 PM</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role line per mock — serif italic */}
      <p style={{ textAlign: 'center', fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--uv-text-muted)', margin: '8px 0 14px', lineHeight: 1.45 }}>
        All you do: <b style={{ color: 'var(--uv-text)', fontWeight: 500, fontStyle: 'normal' }}>say if they kept it or broke it.</b>
      </p>

      {/* Oath checkbox — product addition, not in mock */}
      <label style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', padding: '8px 0' }}>
        <input
          type="checkbox"
          checked={sworn}
          onChange={(e) => setSworn(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        />
        <span
          aria-hidden="true"
          style={{
            width: 21,
            height: 21,
            flex: '0 0 21px',
            borderRadius: 6,
            border: sworn ? '1px solid var(--uv-gold)' : '1px solid var(--uv-border-strong)',
            background: sworn ? 'linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold))' : 'rgba(238,231,215,0.04)',
            boxShadow: sworn ? '0 0 20px rgba(200,155,60,0.16)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {sworn && <Check style={{ width: 14, height: 14, color: 'var(--uv-text-on-gold)', strokeWidth: 3 }} />}
        </span>
        <span style={{ fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--uv-text-muted)' }}>
          I swear to keep {makerLabel} accountable
        </span>
      </label>

      {!sworn && (
        <p style={{ fontSize: 11, textAlign: 'center', color: 'var(--uv-text-faint)', margin: '0 0 8px', fontFamily: 'var(--uv-font-sans)' }}>
          they picked you for a reason
        </p>
      )}

      {/* Footer — pushed to bottom */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <GoldCTA label="I'm in →" onPress={handleAccept} disabled={!sworn || busy} />
          <MutedSecondary label="Pass — I can't" onPress={handleDecline} />
        </div>
      </div>

      {error && (
        <div style={{ borderRadius: 12, padding: '12px 16px', fontSize: 14, backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--uv-danger)', border: '1px solid var(--uv-danger)', fontFamily: 'var(--uv-font-sans)', marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  FlowCard,
  FlowCheck,
  FlowCTA,
  FlowGrid,
  FlowInput,
  FlowJob,
  FlowLabel,
  FlowMeta,
  FlowMeter,
  FlowPill,
  FlowSecondary,
  FlowShell,
  FlowSpacer,
  FlowStamp,
  FlowSub,
  FlowTitle,
  FlowTop,
  FlowVow,
  shortDestinationName,
} from '@/components/vow-flow-ui';

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
  const [acceptPhase, setAcceptPhase] = useState<'capturing' | null>(null);
  const [justAccepted, setJustAccepted] = useState(false);
  const [reminderPhone, setReminderPhone] = useState('');
  const [reminderSaving, setReminderSaving] = useState(false);
  const [optionalWitnessName, setOptionalWitnessName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const displayMakerName = makerName.replace(/\D/g, '').length >= 7 ? 'Your friend' : makerName;
  const makerFirstName = displayMakerName === 'Your friend' ? 'Your friend' : displayMakerName.split(' ')[0];
  const makerFirstLower = makerFirstName === 'Your friend' ? 'your friend' : makerFirstName;
  const needsWitnessName = !vow.witness_name || vow.witness_name === 'Just me' || vow.witness_name === 'Your witness';
  const stakeDisplay = vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)}` : null;
  const destinationShort = shortDestinationName(vow.destination);
  const endShort = vow.ends_at ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short' }) : 'verdict day';
  const verdictWeekday = vow.ends_at ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'long' }) : 'verdict day';
  const endDate = vow.ends_at ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD';

  const getElapsed = (): number => {
    if (!vow.starts_at || !vow.ends_at) return 0.24;
    const start = new Date(vow.starts_at).getTime();
    const end = new Date(vow.ends_at).getTime();
    if (end <= start) return 0.24;
    return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
  };

  const getNudgeSms = (elapsed: number): string => {
    if (elapsed < 0.15) return "I'm officially watching. Keep it clean.";
    if (elapsed < 0.85) return "Still keeping the vow? I'm paying attention.";
    return 'Almost verdict time. You good?';
  };

  const handleSaveReminder = async () => {
    const digits = reminderPhone.replace(/\D/g, '');
    if (digits.length < 7 || reminderSaving) return;
    setReminderSaving(true);
    setError(null);
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
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({ token, action: 'save-reminder', phone: formatted }),
      });
      if (!res.ok) {
        setError('Could not save reminder. Please try again.');
        return;
      }
      setAcceptPhase(null);
      setJustAccepted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setReminderSaving(false);
    }
  };

  const handleSaveWitnessName = async () => {
    const name = optionalWitnessName.trim();
    if (!name || nameSaving) return;
    setNameSaving(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/accept-witness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({ token, action: 'save-reminder', name }),
      });
      if (!res.ok) {
        setError('Could not save your name. Please try again.');
        return;
      }
      setNameSaved(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setNameSaving(false);
    }
  };

  const handleAccept = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      let authToken = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) authToken = session.access_token;
      } catch {}
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/accept-witness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token, action: 'accept' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        const msg = data?.error === 'vow_not_active'
          ? 'This vow is no longer active.'
          : data?.error === 'invalid_token'
            ? 'This invite link is no longer valid.'
            : `Failed to accept. Please try again. (${data?.error || res.status})`;
        setError(msg);
        return;
      }
      setStatus('accepted');
      setJustAccepted(true);
      setAcceptPhase(vow.witness_phone ? null : 'capturing');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleTextMaker = () => {
    const smsBody = vow.status === 'draft'
      ? "I accepted. Now ante up and finish staking your vow."
      : justAccepted
        ? "Just accepted your vow. I'm officially watching."
        : getNudgeSms(getElapsed());
    const message = encodeURIComponent(smsBody);
    if (makerPhone) {
      const cleanPhone = makerPhone.replace(/[^\d+\-]/g, '');
      window.location.href = `sms:${cleanPhone}?body=${message}`;
    } else {
      window.location.href = `sms:?body=${message}`;
    }
  };

  const VowSummary = ({ hot = true, compact = true, quote = false }: { hot?: boolean; compact?: boolean; quote?: boolean }) => (
    <FlowCard hot={hot} compact={compact}>
      <FlowLabel>{quote ? 'You accepted' : 'The vow'}</FlowLabel>
      <FlowVow quote={quote}>{vow.refined_text}</FlowVow>
      <FlowMeta items={[
        { label: stakeDisplay ? `${stakeDisplay} on the line` : 'Their word', gold: true },
        ...(stakeDisplay && destinationShort ? [{ label: `${destinationShort} if broken` }] : []),
        { label: quote ? `${verdictWeekday} verdict` : `You call it ${endShort}` },
      ]} />
    </FlowCard>
  );

  if (status === 'declined') {
    return (
      <FlowShell center>
        <FlowTop action="Make a vow" onAction={() => { window.location.href = '/quick-vow'; }} />
        <FlowCheck tone="red">×</FlowCheck>
        <FlowStamp>Stepped back</FlowStamp>
        <FlowTitle small center>You passed<br/><span style={{ color: 'var(--uv-danger)' }}>on the job.</span></FlowTitle>
        <FlowSub center>{makerFirstName} has been told.</FlowSub>
        <FlowSpacer />
        <FlowCTA onClick={() => { window.location.href = '/quick-vow'; }}>Make your own vow</FlowCTA>
      </FlowShell>
    );
  }

  if (['voided', 'kept', 'broken'].includes(vow.status)) {
    const isKept = vow.status === 'kept';
    return (
      <FlowShell center tone={vow.status === 'broken' ? 'danger' : 'success'}>
        <FlowTop action="Make a vow" onAction={() => { window.location.href = '/quick-vow'; }} />
        <FlowCheck tone={isKept ? 'green' : vow.status === 'broken' ? 'red' : 'gold'}>{isKept ? '✓' : vow.status === 'broken' ? '!' : '×'}</FlowCheck>
        <FlowStamp>{vow.status === 'voided' ? 'Vow withdrawn' : 'Verdict in'}</FlowStamp>
        <FlowTitle small center>
          {vow.status === 'voided' ? <>Nothing left<br/><span style={{ color: 'var(--uv-gold-bright)' }}>to judge.</span></> : isKept ? <>{makerFirstName} kept<br/><span style={{ color: 'var(--uv-success)' }}>the vow.</span></> : <>{makerFirstName} broke<br/><span style={{ color: 'var(--uv-danger)' }}>the vow.</span></>}
        </FlowTitle>
        <VowSummary hot={false} compact={false} quote />
        <FlowSpacer />
        <FlowCTA onClick={() => { window.location.href = '/quick-vow'; }}>Make your own vow</FlowCTA>
      </FlowShell>
    );
  }

  if (status === 'accepted') {
    const needsMakerToFinish = vow.status === 'draft';
    const needsVerdictNow = vow.status === 'awaiting_verdict';
    const progress = Math.round(getElapsed() * 100);

    if (needsVerdictNow) {
      return (
        <FlowShell>
          <FlowTop action="Back to vow" onAction={() => { window.location.href = `/w/${token}`; }} />
          <FlowStamp>Verdict day</FlowStamp>
          <FlowTitle small center>{makerFirstName}&apos;s vow<br/>is <span style={{ color: 'var(--uv-gold-bright)' }}>up.</span></FlowTitle>
          <VowSummary hot compact={false} quote />
          <FlowStamp>Your call</FlowStamp>
          <FlowTitle small center>Did {makerFirstLower} keep<br/><span style={{ color: 'var(--uv-gold-bright)' }}>their word?</span></FlowTitle>
          <FlowSpacer />
          <FlowCTA onClick={() => { window.location.href = `/w/${token}/verdict`; }}>Deliver your verdict</FlowCTA>
          <p style={{ color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 13, textAlign: 'center', margin: '12px 0 0' }}>
            Be honest. They are counting on it.
          </p>
        </FlowShell>
      );
    }

    if (acceptPhase === 'capturing') {
      return (
        <FlowShell center>
          <FlowTop />
          <FlowPill tone="green">You&apos;re on it</FlowPill>
          <FlowTitle small center>Last step.</FlowTitle>
          <FlowSub center>Where should we text your verdict link?</FlowSub>
          <FlowInput
            type="tel"
            value={reminderPhone}
            onChange={(e) => setReminderPhone(e.target.value)}
            placeholder="Phone number"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
            aria-label="Phone number"
            style={{
              height: 64,
              marginBottom: 10,
              borderColor: 'rgba(240,233,219,.22)',
              fontSize: 20,
              textAlign: 'center',
            }}
          />
          <p style={{ color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', fontSize: 13, lineHeight: 1.35, textAlign: 'center', margin: '0 0 18px', maxWidth: 300 }}>
            One text when it is time. No account.
          </p>
          {error && <ErrorText>{error}</ErrorText>}
          <FlowCTA onClick={handleSaveReminder} disabled={!reminderPhone.trim() || reminderSaving}>
            {reminderSaving ? 'Saving...' : "I'm ready"}
          </FlowCTA>
          <FlowSecondary onClick={() => { setAcceptPhase(null); setJustAccepted(true); }}>Not now</FlowSecondary>
        </FlowShell>
      );
    }

    if (!justAccepted) {
      return (
        <FlowShell>
          <FlowTop action="Make a vow" onAction={() => { window.location.href = '/quick-vow'; }} />
          <FlowPill tone="green">Watching</FlowPill>
          <FlowTitle>{makerFirstName} is still<br/><span style={{ color: 'var(--uv-gold-bright)' }}>on the hook.</span></FlowTitle>
          <FlowSub>Verdict day is {verdictWeekday}. If they get slippery, one text is enough.</FlowSub>
          <FlowCard hot>
            <FlowLabel>The vow</FlowLabel>
            <FlowVow>{vow.refined_text}</FlowVow>
            <FlowGrid
              left={{ label: 'On the line', value: stakeDisplay || 'Word', sub: stakeDisplay && destinationShort ? `${destinationShort} if broken` : 'accountability', tone: 'gold' }}
              right={{ label: 'Progress', value: progress < 20 ? 'Early' : progress < 85 ? 'Midway' : 'Close', sub: `${Math.max(0, Math.ceil((new Date(vow.ends_at || Date.now()).getTime() - Date.now()) / 86400000))} days left` }}
            />
            <FlowMeter pct={progress} />
          </FlowCard>
          <FlowCard>
            <FlowLabel>Suggested text</FlowLabel>
            <FlowVow quote>{getNudgeSms(getElapsed())}</FlowVow>
          </FlowCard>
          <FlowSpacer />
          <FlowCTA tone="green" onClick={handleTextMaker}>Check in on {makerFirstName}</FlowCTA>
          <FlowSecondary onClick={() => { window.location.href = '/quick-vow'; }}>Make your own vow</FlowSecondary>
        </FlowShell>
      );
    }

    return (
      <FlowShell center>
        <FlowTop action="Make a vow" onAction={() => { window.location.href = '/quick-vow'; }} />
        <FlowCheck />
        <FlowStamp>You&apos;re in</FlowStamp>
        <FlowTitle small center>
          {needsMakerToFinish
            ? <>{makerFirstName} still needs<br/><span style={{ color: 'var(--uv-gold-bright)' }}>to stake it.</span></>
            : <>{makerFirstName} knows<br/><span style={{ color: 'var(--uv-gold-bright)' }}>you are watching.</span></>}
        </FlowTitle>
        <FlowSub center>
          {needsMakerToFinish ? <>You accepted. Now nudge {makerFirstName} to put the money down and make it real.</> : <>That&apos;s it for now. We&apos;ll text you {verdictWeekday}.<br/><strong style={{ color: 'var(--uv-text)' }}>Tasteful pestering encouraged.</strong></>}
        </FlowSub>
        <FlowCard>
          <FlowLabel>You&apos;re watching</FlowLabel>
          <FlowVow>{vow.refined_text}</FlowVow>
          <FlowGrid
            left={{ label: 'On the line', value: stakeDisplay || 'Word', sub: stakeDisplay && destinationShort ? `${destinationShort} if broken` : 'accountability', tone: 'gold' }}
            right={{ label: 'Next', value: endShort, sub: 'verdict link' }}
          />
          <FlowMeter pct={Math.max(12, progress)} />
        </FlowCard>
        <div style={{ flex: 1, minHeight: 34 }} />
        <FlowCTA tone="green" onClick={handleTextMaker}>{needsMakerToFinish ? `Text ${makerFirstName}: ante up` : `Pester ${makerFirstName} responsibly`}</FlowCTA>
        <FlowSecondary onClick={() => { window.location.href = '/quick-vow'; }}>Make your own vow</FlowSecondary>
        {needsWitnessName && !nameSaved && (
          <FlowCard compact>
            <FlowLabel>Optional</FlowLabel>
            <p style={{ margin: '0 0 10px', color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 800 }}>
              What should {makerFirstName} call you?
            </p>
            <FlowInput
              type="text"
              value={optionalWitnessName}
              onChange={(e) => setOptionalWitnessName(e.target.value)}
              placeholder="Your name"
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={handleSaveWitnessName}
                disabled={!optionalWitnessName.trim() || nameSaving}
                style={{ minHeight: 38, border: 0, borderRadius: 999, background: optionalWitnessName.trim() ? 'var(--uv-gold-bright)' : 'var(--uv-bg-elevated)', color: optionalWitnessName.trim() ? 'var(--uv-text-on-gold)' : 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 850, cursor: optionalWitnessName.trim() && !nameSaving ? 'pointer' : 'not-allowed' }}
              >
                {nameSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setNameSaved(true)}
                style={{ minHeight: 38, borderRadius: 999, border: '1px solid var(--uv-border-soft)', background: 'transparent', color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 750, cursor: 'pointer' }}
              >
                Skip
              </button>
            </div>
          </FlowCard>
        )}
      </FlowShell>
    );
  }

  return (
    <FlowShell>
      <FlowTop />
      <FlowPill>Witness invite</FlowPill>
      <FlowTitle>{makerFirstName === 'Your friend' ? 'Your friend needs you.' : `${makerFirstName} needs you.`}</FlowTitle>
      <FlowSub>They put {stakeDisplay || 'their word'} on a promise. Keep them honest, then call it kept or broken.</FlowSub>
      <VowSummary />
      <FlowJob title="Your job" body={`Accept, keep ${makerFirstName} accountable, and we text you ${verdictWeekday} to call it.`} />
      {error && <ErrorText>{error}</ErrorText>}
      <FlowSpacer />
      <FlowCTA onClick={handleAccept} disabled={busy}>{busy ? 'Accepting...' : `I'm in - hold ${makerFirstName} to it`}</FlowCTA>
    </FlowShell>
  );
}

function ErrorText({ children }: { children: string }) {
  return (
    <div style={{ borderRadius: 12, padding: '12px 14px', marginTop: 10, background: 'rgba(220,38,38,0.1)', color: 'var(--uv-danger)', border: '1px solid var(--uv-danger)', fontFamily: 'var(--uv-font-sans)', fontSize: 14 }}>
      {children}
    </div>
  );
}

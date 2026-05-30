'use client';
import { useState, useRef, useCallback } from 'react';
import { CheckCheck, Share2 } from 'lucide-react';
import {
  FlowCard,
  FlowCTA,
  FlowGrid,
  FlowLabel,
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
  status: string;
  ends_at: string | null;
}

type VerdictChoice = 'kept' | 'broken' | null;
type ViewState = 'choose' | 'confirm' | 'done';

function formatEndDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function stakeDollars(amount: number): string {
  return `$${Math.round(amount / 100)}`;
}

export default function VerdictClient({ vow, token, makerName, targetName, isEarlyCompletion = false }: { vow: Vow; token: string; makerName: string; targetName?: string; isEarlyCompletion?: boolean }) {
  // For challenge vows, the "maker" is the challenger/witness viewing this page,
  // and "targetName" is the person being judged.
  const cleanName = (name: string | undefined, fallback: string) => {
    if (!name) return fallback;
    const digits = name.replace(/\D/g, '');
    return digits.length >= 7 ? fallback : name;
  };
  const judgeName = cleanName(targetName || makerName, 'Your friend');
  const judgeFirstName = judgeName === 'Your friend' ? 'Your friend' : judgeName.split(' ')[0];
  const judgeFirstInline = judgeFirstName === 'Your friend' ? 'your friend' : judgeFirstName;
  const judgeNameInline = judgeName === 'Your friend' ? 'your friend' : judgeName;
  const destinationShort = shortDestinationName(vow.destination);
  const [choice, setChoice] = useState<VerdictChoice>(null);
  const [view, setView] = useState<ViewState>('choose');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [shared, setShared] = useState(false);
  const handleChoose = useCallback((verdict: VerdictChoice) => {
    setChoice(verdict);
    setError('');
    setView('confirm');
  }, []);

  const handleUndo = useCallback(() => {
    setChoice(null);
    setView('choose');
  }, []);

  const handleConfirmDirect = async (verdict: VerdictChoice) => {
    if (!verdict || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');

    try {
      const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-verdict`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ token, verdict }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const detail = data?.error || `HTTP ${res.status}`;
        const msg = detail === 'already_judged' ? 'This vow has already been judged.'
          : detail === 'invalid_token' ? 'Could not find this vow. The link may have expired.'
          : detail === 'invalid_status' ? 'This vow is not ready for a verdict yet.'
          : detail === 'refund_failed' ? 'Payment could not be resolved right now. Please try again in a moment.'
          : typeof detail === 'string' ? detail : 'Could not submit verdict. Please try again.';
        setError(msg);
        setView('choose');
        setBusy(false);
        return;
      }

      if (data?.error) {
        const msg = data.error === 'already_judged' ? 'This vow has already been judged.'
          : typeof data.error === 'string' ? data.error : 'Could not submit verdict. Please try again.';
        setError(msg);
        setView('choose');
        setBusy(false);
        return;
      }

      setView('done');
    } catch {
      setError('Network error. Please check your connection and try again.');
      setView('choose');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  // ─── DONE STATE ───
  if (view === 'done') {
    const isKept = choice === 'kept';
    const outcomeUrl = `https://unbreakablevow.app/outcome/${vow.id}`;

    const handleShareOutcome = async () => {
      const isZeroStake = vow.stake_amount === 0;
      const text = isKept
        ? isZeroStake
          ? `Vow kept: "${vow.refined_text}" \u2014 word honored.`
          : `Vow kept: "${vow.refined_text}" \u2014 $${vow.stake_amount / 100} protected.`
        : isZeroStake
          ? `Vow broken: "${vow.refined_text}" \u2014 the record stands.`
          : `Vow broken: "${vow.refined_text}" \u2014 $${vow.stake_amount / 100} to ${vow.destination}.`;

      if (navigator.share) {
        try {
          await navigator.share({ text, url: outcomeUrl });
          return;
        } catch {}
      }

      await navigator.clipboard.writeText(`${text}\n${outcomeUrl}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    };

    return (
      <FlowShell center tone={isKept ? 'success' : 'danger'}>
        <FlowTop action="Make a vow" onAction={() => { window.location.href = '/quick-vow'; }} />
        <div style={{ width: 68, height: 68, borderRadius: '50%', display: 'grid', placeItems: 'center', marginBottom: 16, color: isKept ? 'var(--uv-success)' : 'var(--uv-danger)', background: isKept ? 'rgba(82,214,154,.08)' : 'rgba(248,113,113,.08)', border: `1px solid ${isKept ? 'rgba(82,214,154,.18)' : 'rgba(248,113,113,.2)'}`, fontFamily: 'var(--uv-font-sans)', fontSize: 31, fontWeight: 900 }}>
          {isKept ? '✓' : '$'}
        </div>
        <FlowStamp>Verdict submitted</FlowStamp>
        <FlowTitle small center>You called it<br/><span style={{ color: isKept ? 'var(--uv-success)' : 'var(--uv-danger)' }}>{isKept ? 'kept.' : 'broken.'}</span></FlowTitle>
        <FlowSub center>
          {isKept
            ? `${judgeName} just got the news. ${vow.stake_amount > 0 ? 'Wallet untouched. Honor intact.' : ''}`
            : `${judgeName} knows. ${vow.stake_amount > 0 ? `${stakeDollars(vow.stake_amount)} will be donated to ${vow.destination}.` : ''}`}
        </FlowSub>
        <FlowCard>
          <FlowLabel>The record</FlowLabel>
          <FlowVow quote>{vow.refined_text}</FlowVow>
          <FlowGrid
            left={{ label: 'Outcome', value: isKept ? 'Kept' : 'Broken', sub: isKept ? 'word honored' : 'honesty noted', tone: isKept ? 'green' : 'red' }}
            right={{ label: 'Stake', value: vow.stake_amount > 0 ? stakeDollars(vow.stake_amount) : 'Word', sub: isKept ? 'untouched' : `to ${vow.destination || 'the record'}`, tone: 'gold' }}
          />
        </FlowCard>
        <FlowSpacer />
        <FlowCTA onClick={() => { window.location.href = '/cast'; }}>Challenge {judgeName} to do it again</FlowCTA>
        <FlowSecondary onClick={() => { window.location.href = '/quick-vow'; }}>Make your own vow</FlowSecondary>
        <button onClick={handleShareOutcome} style={{ marginTop: 12, border: 0, background: 'none', color: shared ? 'var(--uv-success)' : 'var(--uv-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 750, cursor: 'pointer' }}>
          {shared ? <CheckCheck style={{ width: 15, height: 15 }} /> : <Share2 style={{ width: 15, height: 15 }} />}
          {shared ? 'Copied' : 'Share outcome'}
        </button>
      </FlowShell>
    );
  }

  // ─── CONFIRM STATE ───
  if (view === 'confirm') {
    const isKept = choice === 'kept';
    return (
      <FlowShell center tone={isKept ? 'success' : 'danger'}>
        <FlowTop action="Back" onAction={handleUndo} />
        <FlowStamp>Final check</FlowStamp>
        <FlowTitle small center>
          Call this vow<br/>
          <span style={{ color: isKept ? 'var(--uv-success)' : 'var(--uv-danger)' }}>{isKept ? 'kept?' : 'broken?'}</span>
        </FlowTitle>
        <FlowSub center>
          This closes the vow and sends the outcome to {judgeFirstInline}.
        </FlowSub>
        <FlowCard>
          <FlowLabel>The vow</FlowLabel>
          <FlowVow quote>{vow.refined_text}</FlowVow>
          <FlowGrid
            left={{ label: 'Your verdict', value: isKept ? 'Kept' : 'Broken', sub: isKept ? 'word honored' : 'record it', tone: isKept ? 'green' : 'red' }}
            right={{ label: 'Stake', value: vow.stake_amount > 0 ? stakeDollars(vow.stake_amount) : 'Word', sub: isKept ? 'untouched' : `to ${destinationShort || 'the cause'}`, tone: 'gold' }}
          />
        </FlowCard>
        {error && <ErrorText>{error}</ErrorText>}
        <FlowSpacer />
        <FlowCTA tone={isKept ? 'green' : 'red'} onClick={() => handleConfirmDirect(choice)} disabled={busy}>
          {busy ? 'Submitting...' : isKept ? 'Submit kept' : 'Submit broken'}
        </FlowCTA>
        <FlowSecondary onClick={handleUndo}>Change verdict</FlowSecondary>
      </FlowShell>
    );
  }

  // ─── CHOOSE STATE ───
  return (
    <FlowShell center>
      <FlowTop action="Back to vow" onAction={() => { window.location.href = `/w/${token}`; }} />
        <FlowStamp>{isEarlyCompletion ? 'Early release' : 'Verdict day'}</FlowStamp>
        <FlowTitle small center>
          {isEarlyCompletion
          ? <>{judgeFirstName} says<br/><span style={{ color: 'var(--uv-gold-bright)' }}>they did it.</span></>
          : <>{judgeFirstName}&apos;s vow<br/>is <span style={{ color: 'var(--uv-gold-bright)' }}>up.</span></>}
      </FlowTitle>
      {isEarlyCompletion && (
        <FlowSub center>If you are sure, release them early. Their wallet stays untouched and the vow closes.</FlowSub>
      )}
      <FlowCard hot compact={!isEarlyCompletion}>
        <FlowLabel>The vow</FlowLabel>
        <FlowVow quote>{vow.refined_text}</FlowVow>
        <FlowGrid
          left={{ label: 'On the line', value: vow.stake_amount > 0 ? stakeDollars(vow.stake_amount) : 'Word', sub: destinationShort ? `${destinationShort} if broken` : 'accountability', tone: 'gold' }}
          right={{ label: isEarlyCompletion ? 'Due' : 'Ended', value: isEarlyCompletion ? formatEndDate(vow.ends_at).split(',')[0] || 'Soon' : 'Today', sub: formatEndDate(vow.ends_at) || 'verdict link' }}
        />
      </FlowCard>

      {isEarlyCompletion ? (
        <>
          <FlowCard>
            <FlowLabel>Before you release</FlowLabel>
            <FlowVow quote>Did they actually finish?</FlowVow>
            <p style={{ color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)', fontSize: 12, lineHeight: 1.35, margin: 0, textAlign: 'left' }}>
              Check if you need to. Early release is final.
            </p>
          </FlowCard>
          <FlowSpacer />
          <FlowCTA tone="green" onClick={() => handleChoose('kept')} disabled={busy}>Yes, release {judgeFirstName}</FlowCTA>
          <FlowSecondary onClick={() => { window.location.href = `/w/${token}`; }}>Not yet - keep vow open</FlowSecondary>
          <button
            type="button"
            onClick={() => {
              const body = encodeURIComponent('Hey - checking before I release you early. Did you finish the vow?');
              window.location.href = `sms:&body=${body}`;
            }}
            style={{ marginTop: 12, border: 0, background: 'none', color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)', fontSize: 12, cursor: 'pointer' }}
          >
            Need proof? Open Messages with {judgeNameInline}.
          </button>
        </>
      ) : (
        <>
          <FlowStamp>Your call</FlowStamp>
          <FlowTitle small center>Did {judgeFirstInline} keep<br/><span style={{ color: 'var(--uv-gold-bright)' }}>their word?</span></FlowTitle>
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
            <VerdictButton label="Yes" sub="Kept it" tone="green" onClick={() => handleChoose('kept')} disabled={busy} />
            <VerdictButton label="No" sub="Broke it" tone="red" onClick={() => handleChoose('broken')} disabled={busy} />
          </div>
          <FlowSpacer />
          <button
            type="button"
            onClick={() => {
              const body = encodeURIComponent('Hey - just checking before I submit my verdict. Did you keep it?');
              window.location.href = `sms:&body=${body}`;
            }}
            style={{ border: 0, background: 'none', color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', fontSize: 13, cursor: 'pointer', padding: 0 }}
          >
            Need to check? Open Messages with {judgeNameInline}.
          </button>
          <p style={{ color: 'var(--uv-text-dim)', margin: '6px 0 0', fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 13 }}>
            Be honest. They are counting on it.
          </p>
        </>
      )}

      {/* Error toast */}
      {error && (
        <div style={{ position: 'fixed', bottom: 24, left: 16, right: 16, zIndex: 50, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 400, borderRadius: 'var(--uv-radius-2xl)', padding: 16, backgroundColor: 'rgba(220,38,38,0.1)', border: '1px solid var(--uv-danger)' }}>
            <p style={{ fontSize: 14, textAlign: 'center', color: 'var(--uv-danger)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>{error}</p>
          </div>
        </div>
      )}
    </FlowShell>
  );
}

function VerdictButton({ label, sub, tone, onClick, disabled }: { label: string; sub: string; tone: 'green' | 'red'; onClick: () => void; disabled?: boolean }) {
  const color = tone === 'green' ? 'var(--uv-success)' : 'var(--uv-danger)';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 122,
        borderRadius: 18,
        border: `1.5px solid ${color}`,
        background: 'var(--uv-bg-card)',
        color: 'var(--uv-text)',
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? .5 : 1,
      }}
    >
      <span>
        <strong style={{ display: 'block', fontFamily: 'var(--uv-font-serif)', fontSize: 24, fontWeight: 600, color, marginBottom: 7 }}>{label}</strong>
        <span style={{ display: 'block', color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase' }}>{sub}</span>
      </span>
    </button>
  );
}

function ErrorText({ children }: { children: string }) {
  return (
    <div style={{ borderRadius: 12, padding: '12px 14px', marginTop: 10, background: 'rgba(220,38,38,0.1)', color: 'var(--uv-danger)', border: '1px solid var(--uv-danger)', fontFamily: 'var(--uv-font-sans)', fontSize: 14 }}>
      {children}
    </div>
  );
}

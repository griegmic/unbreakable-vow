'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, DollarSign, Share2, CheckCheck, Undo2 } from 'lucide-react';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { SecondaryButton } from '@/components/uv/SecondaryButton';
import { OathCheckbox } from '@/components/uv/OathCheckbox';
import { Card } from '@/components/uv/Card';

interface Vow {
  id: string;
  refined_text: string;
  stake_amount: number;
  destination: string;
  witness_name: string;
  status: string;
}

type VerdictChoice = 'kept' | 'broken' | null;
type ViewState = 'choose' | 'confirm' | 'done';

export default function VerdictClient({ vow, token, makerName, targetName }: { vow: Vow; token: string; makerName: string; targetName?: string }) {
  // For challenge vows, the "maker" is the challenger/witness viewing this page,
  // and "targetName" is the person being judged.
  const judgeName = targetName || makerName;
  const [choice, setChoice] = useState<VerdictChoice>(null);
  const [view, setView] = useState<ViewState>('choose');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [shared, setShared] = useState(false);
  const [pendingVerdict, setPendingVerdict] = useState<VerdictChoice>(null);
  const [toastProgress, setToastProgress] = useState(100);
  const [truthSworn, setTruthSworn] = useState(false);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleConfirmRef = useRef<(v: VerdictChoice) => Promise<void>>(null!);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleChoose = useCallback((verdict: VerdictChoice) => {
    // Clear any previous timers
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setChoice(verdict);
    setPendingVerdict(verdict);
    setError('');
    setToastProgress(100);

    // Start countdown
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / 3000) * 100);
      setToastProgress(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 50);

    undoTimeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      undoTimeoutRef.current = null;
      setPendingVerdict(null);
      setView('confirm');
      if (verdict) handleConfirmRef.current(verdict);
    }, 3000);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoTimeoutRef.current) { clearTimeout(undoTimeoutRef.current); undoTimeoutRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setPendingVerdict(null);
    setChoice(null);
    setToastProgress(100);
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
          : detail === 'refund_failed' ? 'Refund could not be processed right now. Please try again in a moment.'
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
  handleConfirmRef.current = handleConfirmDirect;

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
      <RitualScreen variant={isKept ? 'outcome-kept' : 'outcome-broken'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
            UNBREAKABLE VOW
          </span>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isKept ? 'rgba(82,214,154,0.12)' : 'rgba(220,38,38,0.12)',
              }}
            >
              {isKept ? (
                <Check style={{ width: 32, height: 32, color: 'var(--uv-success)' }} />
              ) : (
                <DollarSign style={{ width: 32, height: 32, color: 'var(--uv-danger)' }} />
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 style={{ fontSize: 26, fontWeight: 600, fontFamily: 'var(--uv-font-serif)', color: 'var(--uv-text)', margin: 0 }}>
              {isKept ? 'You called it kept.' : 'You called it broken.'}
            </h1>
            <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
              {isKept
                ? `${judgeName} just got the news.`
                : `${judgeName} knows.`
              }
            </p>
            {!isKept && vow.stake_amount > 0 && (
              <p style={{ fontSize: 14, color: 'var(--uv-text-dim)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
                ${vow.stake_amount / 100} will be donated to {vow.destination}.
              </p>
            )}
            {isKept && vow.stake_amount > 0 && (
              <p style={{ fontSize: 14, color: 'var(--uv-text-dim)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
                Their ${vow.stake_amount / 100} comes back.
              </p>
            )}
          </div>

          {/* Share outcome */}
          <button
            onClick={handleShareOutcome}
            style={{
              width: '100%',
              minHeight: 48,
              borderRadius: 'var(--uv-radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              backgroundColor: 'var(--uv-bg-card)',
              border: '1px solid var(--uv-border-strong)',
              cursor: 'pointer',
              transition: 'transform 120ms',
            }}
          >
            {shared ? (
              <>
                <CheckCheck style={{ width: 16, height: 16, color: 'var(--uv-success)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-success)', fontFamily: 'var(--uv-font-sans)' }}>Copied!</span>
              </>
            ) : (
              <>
                <Share2 style={{ width: 16, height: 16, color: 'var(--uv-text-muted)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>Share the outcome</span>
              </>
            )}
          </button>

          {/* Growth CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <a href="/create" style={{ textDecoration: 'none' }}>
              <PrimaryButton>Make your own vow &rarr;</PrimaryButton>
            </a>
            <div style={{ textAlign: 'center' }}>
              <a
                href={targetName ? '/cast' : `/?ref=witness&from=${encodeURIComponent(makerName)}`}
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--uv-gold)', textDecoration: 'none', fontFamily: 'var(--uv-font-sans)' }}
              >
                Dare {judgeName} &rarr;
              </a>
            </div>
          </div>
        </div>
      </RitualScreen>
    );
  }

  // ─── CONFIRM (submitting) STATE ───
  if (view === 'confirm') {
    return (
      <RitualScreen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
            UNBREAKABLE VOW
          </span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '2px solid var(--uv-gold)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'uv-spin 600ms linear infinite',
                }}
              />
              <style>{`@keyframes uv-spin{to{transform:rotate(360deg)}}`}</style>
              <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>Submitting verdict...</p>
              {error && (
                <div style={{ borderRadius: 12, padding: 12, backgroundColor: 'rgba(220,38,38,0.1)', border: '1px solid var(--uv-danger)' }}>
                  <p style={{ fontSize: 14, textAlign: 'center', color: 'var(--uv-danger)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </RitualScreen>
    );
  }

  // ─── CHOOSE STATE ───
  return (
    <RitualScreen variant="ceremony">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
          VERDICT TIME
        </span>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, fontFamily: 'var(--uv-font-serif)', color: 'var(--uv-text)', margin: 0, lineHeight: 1.2 }}>
            Did {judgeName} keep it?
          </h1>
          <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
            {vow.stake_amount > 0 ? `$${vow.stake_amount / 100} rides on your honesty.` : "Be honest. That's the whole point."}
          </p>
        </div>

        {/* Vow text in gold italic */}
        <Card>
          <p style={{ fontSize: 18, fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontWeight: 500, color: 'var(--uv-gold)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            &ldquo;{vow.refined_text}&rdquo;
          </p>
          {vow.stake_amount > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--uv-border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)' }}>At stake</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>${vow.stake_amount / 100}</span>
            </div>
          )}
        </Card>

        {/* Oath checkbox */}
        <OathCheckbox
          checked={truthSworn}
          onChange={setTruthSworn}
          label="I'll tell the truth."
        />

        {/* Verdict choice cards */}
        <button
          onClick={() => handleChoose('kept')}
          disabled={busy || !truthSworn}
          style={{
            width: '100%',
            borderRadius: 'var(--uv-radius-2xl)',
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            textAlign: 'left',
            backgroundColor: 'var(--uv-bg-card)',
            border: `1.5px solid var(--uv-success)`,
            cursor: !truthSworn ? 'not-allowed' : 'pointer',
            opacity: !truthSworn ? 0.5 : 1,
            transition: 'transform 120ms, opacity 120ms',
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(82,214,154,0.12)' }}>
            <Check style={{ width: 24, height: 24, color: 'var(--uv-success)' }} />
          </div>
          <div>
            <span style={{ fontSize: 17, fontWeight: 600, display: 'block', color: 'var(--uv-success)', fontFamily: 'var(--uv-font-serif)' }}>Kept.</span>
            <span style={{ fontSize: 13, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
              {vow.stake_amount === 0
                ? 'They did it.'
                : `They did it. Their $${vow.stake_amount / 100} comes back.`}
            </span>
          </div>
        </button>

        <button
          onClick={() => handleChoose('broken')}
          disabled={busy || !truthSworn}
          style={{
            width: '100%',
            borderRadius: 'var(--uv-radius-2xl)',
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            textAlign: 'left',
            backgroundColor: 'var(--uv-bg-card)',
            border: `1.5px solid var(--uv-danger)`,
            cursor: !truthSworn ? 'not-allowed' : 'pointer',
            opacity: !truthSworn ? 0.5 : 1,
            transition: 'transform 120ms, opacity 120ms',
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(220,38,38,0.12)' }}>
            <DollarSign style={{ width: 24, height: 24, color: 'var(--uv-danger)' }} />
          </div>
          <div>
            <span style={{ fontSize: 17, fontWeight: 600, display: 'block', color: 'var(--uv-danger)', fontFamily: 'var(--uv-font-serif)' }}>Broken.</span>
            <span style={{ fontSize: 13, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
              {vow.stake_amount === 0
                ? "They didn't."
                : `They didn't. Their $${vow.stake_amount / 100} goes to ${vow.destination}.`}
            </span>
          </div>
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--uv-text-faint)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
          Your verdict is final.
        </p>
      </div>

      {/* Undo toast */}
      {pendingVerdict && (
        <div style={{ position: 'fixed', bottom: 24, left: 16, right: 16, zIndex: 50, display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              borderRadius: 'var(--uv-radius-2xl)',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              backgroundColor: 'var(--uv-bg-elev)',
              border: '1px solid var(--uv-border-strong)',
              boxShadow: 'var(--uv-shadow-xl)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-text)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
                Your verdict:{' '}
                <span style={{ color: pendingVerdict === 'kept' ? 'var(--uv-success)' : 'var(--uv-danger)' }}>
                  {pendingVerdict === 'kept' ? 'Kept' : 'Broken'}
                </span>
              </p>
              <div style={{ marginTop: 8, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: 'var(--uv-bg-card)' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: 2,
                    transition: 'width 100ms linear',
                    width: `${toastProgress}%`,
                    backgroundColor: pendingVerdict === 'kept' ? 'var(--uv-success)' : 'var(--uv-danger)',
                  }}
                />
              </div>
            </div>
            <button
              onClick={handleUndo}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 12,
                backgroundColor: 'var(--uv-bg-card)',
                border: '1px solid var(--uv-border-strong)',
                cursor: 'pointer',
                transition: 'transform 120ms',
              }}
            >
              <Undo2 style={{ width: 14, height: 14, color: 'var(--uv-text-muted)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>Undo</span>
            </button>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && !pendingVerdict && (
        <div style={{ position: 'fixed', bottom: 24, left: 16, right: 16, zIndex: 50, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 400, borderRadius: 'var(--uv-radius-2xl)', padding: 16, backgroundColor: 'rgba(220,38,38,0.1)', border: '1px solid var(--uv-danger)' }}>
            <p style={{ fontSize: 14, textAlign: 'center', color: 'var(--uv-danger)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>{error}</p>
          </div>
        </div>
      )}
    </RitualScreen>
  );
}

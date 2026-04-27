'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Check, DollarSign, Share2, CheckCheck, Undo2 } from 'lucide-react';
import { RitualCard, GoldCTA, OutlinedGoldCTA, EyebrowTag, FrauncesH1, FrauncesSub, Stamp } from '@/components/primitives';

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

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'soon';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function formatEndDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
  const judgeNameInline = judgeName === 'Your friend' ? 'your friend' : judgeName;
  const [choice, setChoice] = useState<VerdictChoice>(null);
  const [view, setView] = useState<ViewState>('choose');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [shared, setShared] = useState(false);
  const [pendingVerdict, setPendingVerdict] = useState<VerdictChoice>(null);
  const [toastProgress, setToastProgress] = useState(100);
  // Checkbox removed per V6 mock (no "I'll tell the truth" gate). Buttons always enabled.
  const truthSworn = true;
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleConfirmRef = useRef<(v: VerdictChoice) => Promise<void>>(null!);
  const EscapeBar = () => (
    <div style={{
      position: 'absolute', top: 18, left: 20, right: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
      gap: 16, zIndex: 2,
    }}>
      <Link
        href={`/w/${token}`}
        style={{
          color: 'var(--uv-text-muted)', textDecoration: 'none',
          fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 700,
        }}
      >
        &larr; Back to vow
      </Link>
    </div>
  );

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
      <div style={{ position: 'relative', minHeight: "100dvh", background: "var(--uv-bg)", backgroundImage: "radial-gradient(ellipse at 50% 30%, rgba(200,155,60,0.06), var(--uv-bg) 70%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 36px 40px", textAlign: "center" }}>
        <EscapeBar />
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
            <Link href="/cast" style={{ textDecoration: 'none' }}>
              <button style={{ width: "100%", height: 62, borderRadius: 14, border: "none", background: "linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold) 60%, var(--uv-gold-deep))", color: "var(--uv-text-on-gold)", fontFamily: "var(--uv-font-sans)", fontSize: 17, fontWeight: 800, cursor: "pointer" }}>Challenge {judgeName} to do it again</button>
            </Link>
            <div style={{ textAlign: 'center' }}>
              <Link
                href="/quick-vow"
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--uv-gold)', textDecoration: 'none', fontFamily: 'var(--uv-font-sans)' }}
              >
                Make your own vow &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── CONFIRM (submitting) STATE ───
  if (view === 'confirm') {
    return (
      <div style={{ position: 'relative', minHeight: '100dvh', background: 'var(--uv-bg)', backgroundImage: 'radial-gradient(ellipse at 50% 30%, rgba(200,155,60,0.06), var(--uv-bg) 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 36px 40px', textAlign: 'center' }}>
        <EscapeBar />
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
      </div>
    );
  }

  // ─── CHOOSE STATE ───
  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: 'var(--uv-bg)', backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(200,155,60,0.06), var(--uv-bg) 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 36px 40px' }}>
      <EscapeBar />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <EyebrowTag tone="gold">UNBREAKABLE VOW</EyebrowTag>

        {/* "— VERDICT DAY —" stamp per mock */}
        <div style={{ textAlign: 'center', fontFamily: 'var(--uv-font-sans)', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--uv-text-dim)' }}>
          {isEarlyCompletion ? '— Early release —' : '— Verdict day —'}
        </div>

        {/* H1 per mock: "Joey's vow / is up." with forced line break */}
        <div style={{ textAlign: 'center' }}>
          <FrauncesH1 italic size="page">
            {isEarlyCompletion ? (
              <>{judgeName} says<br/>it&apos;s <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>done.</em></>
            ) : (
              <>{judgeName}&apos;s vow<br/>is <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>up.</em></>
            )}
          </FrauncesH1>
        </div>

        {isEarlyCompletion && (
          <div style={{
            borderRadius: 16,
            border: '1px solid var(--uv-gold-line)',
            background: 'rgba(215,169,70,0.08)',
            padding: '14px 16px',
            textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontFamily: 'var(--uv-font-sans)', fontSize: 14.5, lineHeight: 1.45, color: 'var(--uv-text-muted)' }}>
              Release them only if you&apos;re sure. Your tap closes the vow.
            </p>
          </div>
        )}

        {/* Vow card with stamp header + 2-col meta per mock */}
        <RitualCard>
          <div style={{ textAlign: 'center', fontFamily: 'var(--uv-font-sans)', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--uv-text-dim)', marginBottom: 8 }}>
            — The Vow —
          </div>
          <p style={{ fontSize: 18, fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontWeight: 500, color: 'var(--uv-gold)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            &ldquo;{vow.refined_text}&rdquo;
          </p>
          {vow.stake_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--uv-border-soft)' }}>
              <div>
                <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--uv-text-dim)', marginBottom: 4 }}>On the line</div>
                <div style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 18, fontWeight: 500, color: 'var(--uv-text)' }}>${vow.stake_amount / 100}</div>
                <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 11, color: 'var(--uv-text-dim)' }}>to {vow.destination}, if broken</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--uv-text-dim)', marginBottom: 4 }}>{isEarlyCompletion ? 'Deadline' : 'Vow ended'}</div>
                <div style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 18, fontWeight: 500, color: 'var(--uv-text)' }}>{formatRelativeTime(vow.ends_at)}</div>
                <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 11, color: 'var(--uv-text-dim)', fontStyle: 'italic' }}>{formatEndDate(vow.ends_at)}</div>
              </div>
            </div>
          )}
        </RitualCard>

        {/* No "I'll tell the truth" checkbox — mock doesn't have it. Verdict buttons are unguarded. */}

        {isEarlyCompletion ? (
          <>
            <div style={{ textAlign: 'center', fontFamily: 'var(--uv-font-sans)', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--uv-text-dim)' }}>
              Your call
            </div>

            <div style={{ textAlign: 'center' }}>
              <FrauncesH1 italic size="page">Did {judgeNameInline} actually <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>finish?</em></FrauncesH1>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => handleChoose('kept')}
                disabled={busy || !truthSworn}
                style={{
                  minHeight: 58,
                  borderRadius: 999,
                  border: 'none',
                  background: 'linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold) 60%, var(--uv-gold-deep))',
                  color: 'var(--uv-text-on-gold)',
                  cursor: !truthSworn ? 'not-allowed' : 'pointer',
                  opacity: !truthSworn ? 0.5 : 1,
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 17,
                  fontWeight: 800,
                }}
              >
                Yes, release {judgeName}
              </button>
              <Link
                href={`/w/${token}`}
                style={{
                  minHeight: 48,
                  borderRadius: 999,
                  border: '1px solid var(--uv-border-strong)',
                  background: 'var(--uv-bg-card)',
                  color: 'var(--uv-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Not yet - keep vow open
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'center' }}>
              <button
                onClick={() => {
                  const body = encodeURIComponent(`Hey - checking before I release you early. Did you finish the vow?`);
                  window.location.href = `sms:&body=${body}`;
                }}
                style={{ background: 'none', border: 'none', fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-text-muted)', cursor: 'pointer', padding: 0 }}
              >
                Need proof? <span style={{ color: 'var(--uv-gold)', fontWeight: 500 }}>Open Messages with {judgeNameInline}</span>
              </button>
              <p style={{ fontSize: 13, color: 'var(--uv-text-faint)', margin: 0, fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic' }}>
                Early release is final. Be sure.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* "YOUR CALL" section header per mock */}
            <div style={{ textAlign: 'center', fontFamily: 'var(--uv-font-sans)', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--uv-text-dim)' }}>
              Your call
            </div>

            <div style={{ textAlign: 'center' }}>
              <FrauncesH1 italic size="page">Did {judgeNameInline} keep <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>their word?</em></FrauncesH1>
            </div>

            {/* Verdict buttons — side-by-side per mock (~120px tall each) */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => handleChoose('kept')}
                disabled={busy || !truthSworn}
                style={{
                  flex: 1,
                  minHeight: 120,
                  borderRadius: 18,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: 'var(--uv-bg-card)',
                  border: '1.5px solid var(--uv-success)',
                  cursor: !truthSworn ? 'not-allowed' : 'pointer',
                  opacity: !truthSworn ? 0.5 : 1,
                  transition: 'transform 120ms',
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--uv-success)', fontFamily: 'var(--uv-font-serif)' }}>Yes</span>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)' }}>Kept it</span>
              </button>

              <button
                onClick={() => handleChoose('broken')}
                disabled={busy || !truthSworn}
                style={{
                  flex: 1,
                  minHeight: 120,
                  borderRadius: 18,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: 'var(--uv-bg-card)',
                  border: '1.5px solid var(--uv-danger)',
                  cursor: !truthSworn ? 'not-allowed' : 'pointer',
                  opacity: !truthSworn ? 0.5 : 1,
                  transition: 'transform 120ms',
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--uv-danger)', fontFamily: 'var(--uv-font-serif)' }}>No</span>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)' }}>Broke it</span>
              </button>
            </div>

            {/* Footer per mock: "Open Messages" link + "Be honest" */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'center' }}>
              <button
                onClick={() => {
                  if (makerName) {
                    const body = encodeURIComponent(`Hey - just checking before I submit my verdict. Did you keep it?`);
                    window.location.href = `sms:&body=${body}`;
                  }
                }}
                style={{ background: 'none', border: 'none', fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-text-muted)', cursor: 'pointer', padding: 0 }}
              >
                Need to check? <span style={{ color: 'var(--uv-gold)', fontWeight: 500 }}>Open Messages with {judgeNameInline}</span>
              </button>
              <p style={{ fontSize: 13, color: 'var(--uv-text-faint)', margin: 0, fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic' }}>
                Be honest. They&apos;re counting on it.
              </p>
            </div>
          </>
        )}
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
              backgroundColor: 'var(--uv-bg-elevated)',
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
    </div>
  );
}

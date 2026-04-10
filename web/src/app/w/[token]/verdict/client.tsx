'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, DollarSign, Sparkles, Share2, CheckCheck, Undo2 } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, FadeUp, HeaderBadge } from '@/components/ui';

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
          : typeof detail === 'string' ? detail : 'Something went wrong.';
        setError(msg);
        setView('choose');
        setBusy(false);
        return;
      }

      if (data?.error) {
        const msg = data.error === 'already_judged' ? 'This vow has already been judged.'
          : typeof data.error === 'string' ? data.error : 'Something went wrong.';
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

  if (view === 'done') {
    const isKept = choice === 'kept';
    const outcomeUrl = `https://unbreakablevow.app/outcome/${vow.id}`;

    const handleShareOutcome = async () => {
      const isZeroStake = vow.stake_amount === 0;
      const text = isKept
        ? isZeroStake
          ? `Vow kept: "${vow.refined_text}" — word honored.`
          : `Vow kept: "${vow.refined_text}" — $${vow.stake_amount / 100} protected.`
        : isZeroStake
          ? `Vow broken: "${vow.refined_text}" — the record stands.`
          : `Vow broken: "${vow.refined_text}" — $${vow.stake_amount / 100} to ${vow.destination}.`;

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
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>
        <FadeUp delay={0.1}>
          <div className="flex justify-center mt-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center animate-scale-in"
              style={{ backgroundColor: isKept ? 'var(--success-muted)' : 'var(--warm-amber-muted)' }}
            >
              {isKept ? (
                <Check className="w-8 h-8" style={{ color: 'var(--success)' }} />
              ) : (
                <DollarSign className="w-8 h-8" style={{ color: 'var(--warm-amber)' }} />
              )}
            </div>
          </div>
        </FadeUp>
        <FadeUp delay={0.15}>
          <TitleBlock
            title={isKept ? 'Verdict: Kept.' : 'Verdict: Broken.'}
            subtitle={isKept
              ? vow.stake_amount === 0
                ? 'The vow was honored.'
                : 'The vow was honored. Their money stays safe.'
              : vow.stake_amount === 0
                ? 'The vow was broken. The record stands.'
                : `$${vow.stake_amount / 100} will be donated to ${vow.destination}.`
            }
          />
        </FadeUp>
        <FadeUp delay={0.2}>
          <p className="text-center text-[14px]" style={{ color: 'var(--text-muted)' }}>
            Thank you for being an honest witness.
          </p>
        </FadeUp>

        {/* Share outcome */}
        <FadeUp delay={0.25}>
          <button
            onClick={handleShareOutcome}
            className="w-full rounded-[14px] min-h-[48px] flex items-center justify-center gap-2.5 transition-transform active:scale-[0.975]"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border-strong)',
            }}
          >
            {shared ? (
              <>
                <CheckCheck className="w-4 h-4" style={{ color: 'var(--success)' }} />
                <span className="text-[14px] font-semibold" style={{ color: 'var(--success)' }}>Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-[14px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Share the outcome</span>
              </>
            )}
          </button>
        </FadeUp>

        {/* Reciprocity CTA */}
        <FadeUp delay={0.35}>
          <div className="flex flex-col gap-2">
            <TitleBlock
              title="Your turn."
              subtitle={`Make a vow and pick ${makerName} to hold you accountable.`}
            />
            <a
              href={`https://unbreakablevow.app/?ref=witness&from=${encodeURIComponent(makerName)}`}
              className="w-full rounded-[18px] min-h-[56px] flex items-center justify-center transition-transform active:scale-[0.975]"
              style={{
                background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
                boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
              }}
            >
              <span className="text-[15px] font-extrabold tracking-[0.2px]" style={{ color: '#0B0D11' }}>
                Make my vow
              </span>
            </a>
          </div>
        </FadeUp>
      </RitualScreen>
    );
  }

  if (view === 'confirm') {
    // Submitting state
    return (
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
            <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>Submitting verdict...</p>
            {error && (
              <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--danger-muted)' }}>
                <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>{error}</p>
              </div>
            )}
          </div>
        </div>
      </RitualScreen>
    );
  }

  return (
    <RitualScreen>
      <FadeUp><HeaderBadge /></FadeUp>

      <FadeUp delay={0.05}>
        <TitleBlock
          title={targetName ? `Did ${targetName} keep the vow?` : 'Did they keep it?'}
          subtitle="Be honest. That's the whole point."
        />
      </FadeUp>

      <FadeUp delay={0.1}>
        <RitualCard>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
            <span className="text-[11px] font-bold tracking-[1.3px] uppercase" style={{ color: 'var(--gold)' }}>THE VOW</span>
          </div>
          <p className="text-[17px] font-serif font-medium" style={{ color: 'var(--text)' }}>{vow.refined_text}</p>
          {vow.stake_amount > 0 ? (
            <>
              <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>At stake</span>
                <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>${vow.stake_amount / 100}</span>
              </div>
            </>
          ) : (
            <>
              <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>At stake</span>
                <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>Accountability only</span>
              </div>
            </>
          )}
        </RitualCard>
      </FadeUp>

      {/* Verdict buttons */}
      <FadeUp delay={0.15}>
        <button
          onClick={() => handleChoose('kept')}
          disabled={busy}
          className="w-full rounded-[22px] p-5 flex items-center gap-4 text-left transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          style={{ backgroundColor: 'var(--success-muted)', border: '1.5px solid rgba(82,214,154,0.3)' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(82,214,154,0.2)' }}>
            <Check className="w-6 h-6" style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <span className="text-[17px] font-semibold block" style={{ color: 'var(--success)' }}>Vow kept</span>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {vow.stake_amount === 0
                ? 'They did what they said.'
                : `They did what they said. $${vow.stake_amount / 100} stays safe.`}
            </span>
          </div>
        </button>
      </FadeUp>

      <FadeUp delay={0.2}>
        <button
          onClick={() => handleChoose('broken')}
          disabled={busy}
          className="w-full rounded-[22px] p-5 flex items-center gap-4 text-left transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          style={{ backgroundColor: 'var(--warm-amber-muted)', border: '1.5px solid var(--warm-amber-border)' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(212,162,79,0.2)' }}>
            <DollarSign className="w-6 h-6" style={{ color: 'var(--warm-amber)' }} />
          </div>
          <div>
            <span className="text-[17px] font-semibold block" style={{ color: 'var(--warm-amber)' }}>Vow broken</span>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {vow.stake_amount === 0
                ? 'The vow was broken.'
                : `$${vow.stake_amount / 100} to ${vow.destination}.`}
            </span>
          </div>
        </button>
      </FadeUp>

      <FadeUp delay={0.25}>
        <p className="text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Your honesty is what makes this work.
        </p>
      </FadeUp>

      {/* Undo toast */}
      {pendingVerdict && (
        <div className="fixed bottom-6 left-4 right-4 z-50 flex justify-center">
          <div
            className="w-full max-w-[400px] rounded-2xl p-4 flex items-center gap-3 animate-slide-up"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                Submitting: <span style={{ color: pendingVerdict === 'kept' ? 'var(--success)' : 'var(--warm-amber)' }}>
                  {pendingVerdict === 'kept' ? 'Vow Kept' : 'Vow Broken'}
                </span>
              </p>
              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-100 ease-linear"
                  style={{
                    width: `${toastProgress}%`,
                    backgroundColor: pendingVerdict === 'kept' ? 'var(--success)' : 'var(--warm-amber)',
                  }}
                />
              </div>
            </div>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl transition-transform active:scale-95"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Undo2 className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Undo</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 left-4 right-4 z-50 flex justify-center">
          <div className="w-full max-w-[400px] rounded-2xl p-4" style={{ backgroundColor: 'var(--danger-muted)', border: '1px solid var(--danger)' }}>
            <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        </div>
      )}
    </RitualScreen>
  );
}

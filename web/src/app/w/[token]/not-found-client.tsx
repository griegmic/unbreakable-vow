'use client';
import { useState, useEffect, useRef } from 'react';
import { Clock, Sparkles } from 'lucide-react';
import { getVowByWitnessToken } from './actions';
import WitnessInviteClient from './client';

const MAX_RETRIES = 30;
const RETRY_INTERVAL = 3000;

export default function WitnessNotFound({ token }: { token: string }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof getVowByWitnessToken>>>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const restartPolling = () => {
    setGaveUp(false);
    setRetryCount(0);
    setRetryKey((k) => k + 1);
  };

  useEffect(() => {
    const tryFetch = async () => {
      const data = await getVowByWitnessToken(token);

      if (data && data.vow.status !== 'draft') {
        setResult(data);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      if (data && data.vow.status === 'draft') {
        setResult(data);
      }

      setRetryCount((c) => {
        if (c + 1 >= MAX_RETRIES) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setGaveUp(true);
        }
        return c + 1;
      });
    };

    intervalRef.current = setInterval(tryFetch, RETRY_INTERVAL);
    tryFetch();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, retryKey]);

  // Vow is sealed/active — hand off to the real witness client
  if (result && result.vow.status !== 'draft') {
    return (
      <WitnessInviteClient
        vow={result.vow}
        token={token}
        makerName={result.makerName}
        makerPhone={result.makerPhone}
      />
    );
  }

  // Draft found — show "sealing in progress" or "abandoned" state
  if (result && result.vow.status === 'draft') {
    const makerFirstName = result.makerName === 'Your friend'
      ? 'Your friend'
      : result.makerName.split(' ')[0];

    // Polling timed out and vow is still a draft — maker likely abandoned
    if (gaveUp) {
      return (
        <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
          <div className="text-center px-6 flex flex-col items-center gap-5 max-w-[340px]">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(212,162,79,0.1)', border: '1.5px solid rgba(212,162,79,0.2)' }}
            >
              <Clock className="w-7 h-7" style={{ color: 'var(--gold)' }} />
            </div>

            <h2 className="text-xl font-serif font-bold" style={{ color: 'var(--text)' }}>
              Not sealed yet
            </h2>

            <p className="text-[15px] leading-[22px]" style={{ color: 'var(--text-secondary)' }}>
              {makerFirstName} hasn&apos;t finished setting up their vow yet. Ask them to resend the link when they&apos;re ready.
            </p>

            <button
              onClick={restartPolling}
              className="mt-1 px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'rgba(212,162,79,0.12)', border: '1px solid rgba(212,162,79,0.25)', color: 'var(--gold)' }}
            >
              Check again
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center px-6 flex flex-col items-center gap-5 max-w-[340px]">
          {/* Animated seal ring */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              border: '2px solid var(--gold)',
              boxShadow: '0 0 30px rgba(212,162,79,0.2)',
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}
          >
            <Sparkles className="w-8 h-8" style={{ color: 'var(--gold)' }} />
          </div>

          <h2 className="text-xl font-serif font-bold" style={{ color: 'var(--text)' }}>
            {makerFirstName} is sealing a vow
          </h2>

          {/* Show the actual vow text */}
          <div
            className="w-full rounded-[14px] px-4 py-3"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
          >
            <p className="text-[16px] font-serif font-medium leading-[24px]" style={{ color: 'var(--text)' }}>
              &ldquo;{result.vow.refined_text}&rdquo;
            </p>
            {result.vow.stake_amount > 0 && (
              <p className="text-[13px] mt-2" style={{ color: 'var(--gold)' }}>
                ${Math.round(result.vow.stake_amount / 100)} on the line
              </p>
            )}
          </div>

          <p className="text-[14px] leading-[20px]" style={{ color: 'var(--text-secondary)' }}>
            They picked you as their witness. This page will update the moment they seal it.
          </p>

          <div
            className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
          />

          <style>{`
            @keyframes pulse-glow {
              0%, 100% { box-shadow: 0 0 20px rgba(212,162,79,0.15); }
              50% { box-shadow: 0 0 40px rgba(212,162,79,0.3); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (gaveUp) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center px-6 flex flex-col items-center gap-4">
          <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: 'var(--text)' }}>Vow not found</h1>
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
            This link may have expired or is invalid. Ask the vow maker to send it again.
          </p>
          <button
            onClick={restartPolling}
            className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'rgba(212,162,79,0.12)', border: '1px solid rgba(212,162,79,0.25)', color: 'var(--gold)' }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // No vow found yet — friendly waiting state
  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center px-6 flex flex-col items-center gap-4 max-w-[320px]">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(212,162,79,0.12)', border: '1px solid rgba(212,162,79,0.2)' }}
        >
          <Clock className="w-6 h-6" style={{ color: 'var(--gold)' }} />
        </div>
        <h2 className="text-xl font-serif font-bold" style={{ color: 'var(--text)' }}>
          Almost ready
        </h2>
        <p className="text-[15px] leading-[22px]" style={{ color: 'var(--text-secondary)' }}>
          Your friend is still setting up their vow. This page will update automatically.
        </p>
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin mt-2"
          style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
        />
      </div>
    </div>
  );
}

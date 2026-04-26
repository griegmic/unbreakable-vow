'use client';
import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
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

      // Any vow found (including draft) — stop polling, hand off to invite client
      if (data) {
        setResult(data);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
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

  // Vow found (any status) — hand off to the real witness client.
  // Draft/sealed vows show the full accept/decline page so witnesses
  // can accept while warm, before the maker finishes sealing.
  if (result) {
    return (
      <WitnessInviteClient
        vow={result.vow}
        token={token}
        makerName={result.makerName}
        makerPhone={result.makerPhone}
      />
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
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--uv-font-sans)' }}>
          Your friend sent you a vow.
        </h2>
        <p className="text-[15px] leading-[22px]" style={{ color: 'var(--text-secondary)' }}>
          They&apos;re still finishing the stake. Keep this open and the invite will appear automatically.
        </p>
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin mt-2"
          style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
        />
      </div>
    </div>
  );
}

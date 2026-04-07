'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import WitnessInviteClient from './client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_RETRIES = 3;
const RETRY_INTERVAL = 2000;

export default function WitnessNotFound({ token }: { token: string }) {
  const [vow, setVow] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tryFetch = async () => {
      const { data } = await supabase
        .from('vows')
        .select('*')
        .eq('witness_invite_token', token)
        .single();

      if (data) {
        setVow(data);
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
  }, [token]);

  if (vow) {
    return <WitnessInviteClient vow={vow} token={token} makerName="Your friend" makerPhone={null} />;
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
            onClick={() => { setGaveUp(false); setRetryCount(0); }}
            className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'rgba(212,162,79,0.12)', border: '1px solid rgba(212,162,79,0.25)', color: 'var(--gold)' }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center px-6 flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
        />
        <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
          Loading vow…
        </p>
      </div>
    </div>
  );
}

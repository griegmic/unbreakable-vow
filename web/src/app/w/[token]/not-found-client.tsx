'use client';
import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import WitnessInviteClient from './client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_RETRIES = 15;
const RETRY_INTERVAL = 3000;

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

  // Friendly pending state — the vow maker may still be completing payment
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

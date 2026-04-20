'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { SecondaryButton } from '@/components/uv/SecondaryButton';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

const FEED_ROWS = [
  { text: 'Gym 3x this week', amount: 50 },
  { text: 'Out of bed by 8am, 7 days', amount: 10 },
  { text: 'No alcohol, 2 weeks', amount: 25 },
  { text: 'No texting my ex, 30 days', amount: 75 },
  { text: 'Delete TikTok for a week', amount: 25 },
];

// ─── Ceremony ───────────────────────────────────────────────────────────────

function CeremonyOverlay({ onComplete }: { onComplete: () => void }) {
  // 0=dark, 1=accusation, 2=punchline, 3=exiting
  const [phase, setPhase] = useState(0);
  const [exiting, setExiting] = useState(false);

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const finish = useCallback(() => {
    try { localStorage.setItem('uv_ceremony_seen', '1'); } catch {}
    setExiting(true);
    setTimeout(() => onComplete(), 600);
  }, [onComplete]);

  useEffect(() => {
    const f = reducedMotion ? 0.15 : 1;
    const timers = [
      setTimeout(() => setPhase(1), 500 * f),      // show accusation
      setTimeout(() => setPhase(2), 3500 * f),      // show "It was free."
      setTimeout(() => finish(), 7000 * f),          // auto-exit
    ];
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion, finish]);

  const fade = (visible: boolean): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(8px)',
    filter: visible ? 'blur(0)' : 'blur(4px)',
    transition: reducedMotion
      ? 'opacity 100ms'
      : 'opacity 1s cubic-bezier(0.19,1,0.22,1), transform 1s cubic-bezier(0.19,1,0.22,1), filter 1s cubic-bezier(0.19,1,0.22,1)',
  });

  return (
    <div
      onClick={finish}
      role="dialog"
      aria-live="polite"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#050403',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 600ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 30%, #050403 75%)',
      }} />

      {/* Gold ember */}
      <div style={{
        position: 'absolute', top: '45%', left: '50%',
        width: 300, height: 300,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,168,74,0.12) 0%, transparent 65%)',
        opacity: phase >= 1 ? 1 : 0,
        filter: 'blur(50px)',
        transition: 'opacity 2s ease',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        maxWidth: 340, padding: '0 24px',
      }}>
        {/* Accusation — one block */}
        <p style={{
          ...fade(phase >= 1 && phase < 2),
          fontFamily: 'var(--uv-font-serif)',
          fontSize: 'clamp(20px, 5.5vw, 26px)',
          fontWeight: 400,
          color: 'rgba(245,240,228,0.85)',
          textAlign: 'center',
          lineHeight: 1.45,
          margin: 0,
          position: phase >= 2 ? 'absolute' : 'relative',
        }}>
          Every promise you&apos;ve ever broken had one thing in common.
        </p>

        {/* Punchline */}
        <p style={{
          ...fade(phase >= 2),
          fontFamily: 'var(--uv-font-serif)',
          fontSize: 'clamp(28px, 8vw, 38px)',
          fontWeight: 500,
          color: 'var(--uv-gold)',
          textAlign: 'center',
          lineHeight: 1.2,
          margin: 0,
          textShadow: phase >= 2 ? '0 0 40px rgba(212,168,74,0.25)' : 'none',
        }}>
          It was free.
        </p>
      </div>

      {/* Skip hint */}
      <span style={{
        position: 'absolute', bottom: '10%',
        fontFamily: 'var(--uv-font-sans)', fontSize: 11,
        color: 'var(--uv-text-faint)', letterSpacing: '0.5px',
        opacity: phase >= 1 ? 0.3 : 0,
        transition: 'opacity 1s',
      }}>
        tap anywhere
      </span>
    </div>
  );
}

// ─── Landing ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading, session } = useAuth();
  const [showCeremony, setShowCeremony] = useState(false);
  const [checked, setChecked] = useState(false);

  // Check ceremony on mount
  useEffect(() => {
    try {
      if (localStorage.getItem('uv_ceremony_seen') !== '1') {
        setShowCeremony(true);
      }
    } catch {}
    setChecked(true);
  }, []);

  // Authenticated users: check for in-progress vow first, then dashboard
  useEffect(() => {
    if (loading || !isAuthenticated || !session) return;

    // FIRST: if user has an in-progress vow, send to /seal
    try {
      const stored = localStorage.getItem('unbreakable-vow-flow');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.rawInput) {
          router.replace('/seal');
          return;
        }
      }
    } catch {}

    // Then check return paths
    try {
      const cookieMatch = document.cookie.match(/(?:^|;\s*)auth_return_path=([^;]*)/);
      if (cookieMatch) {
        const cookiePath = decodeURIComponent(cookieMatch[1]);
        document.cookie = 'auth_return_path=; path=/; max-age=0';
        if (cookiePath && cookiePath !== '/') {
          router.replace(cookiePath);
          return;
        }
      }
    } catch {}
    try {
      const returnPath = localStorage.getItem('auth-return-path');
      if (returnPath) {
        localStorage.removeItem('auth-return-path');
        router.replace(returnPath);
        return;
      }
    } catch {}
    try {
      const sessionReturn = sessionStorage.getItem('auth-return-path');
      if (sessionReturn) {
        sessionStorage.removeItem('auth-return-path');
        router.replace(sessionReturn);
        return;
      }
    } catch {}

    // If user has an in-progress vow, send them to /seal to finish
    try {
      const stored = localStorage.getItem('unbreakable-vow-flow');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.rawInput) {
          router.replace('/seal');
          return;
        }
      }
    } catch {}

    // Otherwise dashboard
    router.replace('/dashboard');
  }, [isAuthenticated, loading, router, session]);

  // Show spinner while redirecting authenticated users
  if (!loading && isAuthenticated) {
    return (
      <RitualScreen>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{
            width: 32, height: 32,
            border: '2px solid var(--uv-gold)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'uv-spin 600ms linear infinite',
          }} />
          <style>{`@keyframes uv-spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </RitualScreen>
    );
  }

  // Wait for ceremony check
  if (!checked) return null;

  if (showCeremony) {
    return <CeremonyOverlay onComplete={() => setShowCeremony(false)} />;
  }

  return (
    <RitualScreen>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <div style={{
          width: 18, height: 18, background: 'var(--uv-gold)', borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 7, height: 7, background: 'var(--uv-bg)', transform: 'rotate(45deg)',
          }} />
        </div>
        <span style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 500,
          letterSpacing: '1.5px', color: 'var(--uv-gold)', textTransform: 'uppercase' as const,
        }}>
          UNBREAKABLE VOW
        </span>
      </div>

      {/* Hero */}
      <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <h1 style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 48, fontWeight: 400,
          color: 'var(--uv-text)', lineHeight: 1.0, letterSpacing: '-0.5px', margin: 0,
        }}>
          You say a lot.
        </h1>
        <h1 style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 48, fontWeight: 400,
          fontStyle: 'italic', color: 'var(--uv-gold)', lineHeight: 1.0,
          letterSpacing: '-0.5px', margin: '4px 0 0',
        }}>
          This time vow it.
        </h1>
        <p style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 16, color: 'var(--uv-text)',
          marginTop: 20, lineHeight: 1.5, maxWidth: 340,
        }}>
          Put $$ on a goal. A friend decides if you pulled it off.
        </p>
      </div>

      {/* Live feed */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 11, fontWeight: 500, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const, color: 'var(--uv-text-faint)',
            fontFamily: 'var(--uv-font-sans)',
          }}>
            THIS WEEK
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--uv-success)',
              display: 'inline-block', animation: 'goldDotPulse 2s infinite',
            }} />
            <span style={{
              fontSize: 11, color: 'var(--uv-success)', fontFamily: 'var(--uv-font-sans)',
              fontWeight: 500,
            }}>
              Live
            </span>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          {FEED_ROWS.map((row, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: i < FEED_ROWS.length - 1 ? '1px solid var(--uv-border)' : 'none',
            }}>
              <span style={{ fontSize: 15, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
                {row.text}
              </span>
              <span style={{ fontSize: 15, color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)', fontWeight: 500 }}>
                ${row.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* CTAs — no auth gate, /create handles it at /seal */}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', paddingBottom: 16 }}>
        <PrimaryButton onClick={() => router.push('/create')}>Make your vow →</PrimaryButton>
        <SecondaryButton onClick={() => router.push('/cast')}>Dare a friend →</SecondaryButton>
      </div>
    </RitualScreen>
  );
}

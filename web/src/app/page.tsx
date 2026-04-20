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
  const [screen, setScreen] = useState<1 | 2>(1);
  const [line1, setLine1] = useState(false);
  const [line2, setLine2] = useState(false);
  const [line3, setLine3] = useState(false);
  const [skipReady, setSkipReady] = useState(false);
  const [fading, setFading] = useState(false);

  // Screen 2 states
  const [s2Line1, setS2Line1] = useState(false);
  const [s2Line2, setS2Line2] = useState(false);
  const [s2Sub, setS2Sub] = useState(false);
  const [s2Cta, setS2Cta] = useState(false);

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Screen 1 staggered entrance
  useEffect(() => {
    if (screen !== 1) return;
    const t1 = setTimeout(() => setLine1(true), 200);
    const t2 = setTimeout(() => setLine2(true), 800);
    const t3 = setTimeout(() => setLine3(true), 1400);
    const tSkip = setTimeout(() => setSkipReady(true), 600);

    // Auto-advance 3.2s after line 3 settles
    autoAdvanceRef.current = setTimeout(() => {
      goToScreen2();
    }, 1400 + 3200);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(tSkip);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [screen]);

  // Screen 2 staggered entrance
  useEffect(() => {
    if (screen !== 2) return;
    const t1 = setTimeout(() => setS2Line1(true), 200);
    const t2 = setTimeout(() => setS2Line2(true), 800);
    const t3 = setTimeout(() => setS2Sub(true), 1600);
    const t4 = setTimeout(() => setS2Cta(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [screen]);

  const goToScreen2 = useCallback(() => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setFading(true);
    setTimeout(() => {
      setFading(false);
      setScreen(2);
    }, 400);
  }, []);

  const finish = useCallback(() => {
    try { localStorage.setItem('uv_ceremony_seen', '1'); } catch {}
    setFading(true);
    setTimeout(() => onComplete(), 400);
  }, [onComplete]);

  const handleTap = () => {
    if (screen === 1) goToScreen2();
  };

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const fadeStyle = (visible: boolean): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
    filter: visible ? 'blur(0)' : 'blur(6px)',
    transition: reducedMotion
      ? 'opacity 100ms ease'
      : 'opacity 600ms cubic-bezier(0.19,1,0.22,1), transform 600ms cubic-bezier(0.19,1,0.22,1), filter 600ms cubic-bezier(0.19,1,0.22,1)',
  });

  return (
    <div
      onClick={handleTap}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--uv-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        cursor: screen === 1 ? 'pointer' : 'default',
        opacity: fading ? 0 : 1,
        transition: 'opacity 400ms ease',
      }}
    >
      {/* Skip button */}
      <button
        onClick={(e) => { e.stopPropagation(); if (skipReady) finish(); }}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '8px 16px',
          background: 'none',
          border: 'none',
          cursor: skipReady ? 'pointer' : 'default',
          opacity: skipReady ? 0.5 : 0,
          transition: 'opacity 300ms',
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 12,
          color: 'var(--uv-text-faint)',
          minWidth: 44,
          minHeight: 44,
        }}
      >
        Skip →
      </button>

      {screen === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, maxWidth: 340 }}>
          <h1 style={{
            ...fadeStyle(line1),
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 36,
            fontWeight: 400,
            color: 'var(--uv-text)',
            textAlign: 'center',
            lineHeight: 1.15,
            margin: 0,
          }}>
            Every promise
          </h1>
          <h1 style={{
            ...fadeStyle(line2),
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 36,
            fontWeight: 400,
            color: 'var(--uv-text)',
            textAlign: 'center',
            lineHeight: 1.15,
            margin: '4px 0',
          }}>
            you've ever broken
          </h1>
          <h1 style={{
            ...fadeStyle(line3),
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 36,
            fontWeight: 400,
            color: 'var(--uv-text)',
            textAlign: 'center',
            lineHeight: 1.15,
            margin: 0,
          }}>
            had one thing in common.
          </h1>
        </div>
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, maxWidth: 340 }}
        >
          <span style={{
            ...fadeStyle(s2Line1),
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 36,
            fontWeight: 400,
            color: 'var(--uv-text)',
            textAlign: 'center',
          }}>
            It was
          </span>
          <span style={{
            ...fadeStyle(s2Line2),
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 56,
            fontWeight: 400,
            fontStyle: 'italic',
            color: 'var(--uv-gold)',
            textAlign: 'center',
            lineHeight: 1.0,
            marginTop: 4,
          }}>
            free.
          </span>
          <p style={{
            ...fadeStyle(s2Sub),
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 15,
            color: 'var(--uv-text-muted)',
            textAlign: 'center',
            maxWidth: 320,
            lineHeight: 1.55,
            marginTop: 24,
          }}>
            An Unbreakable Vow — a vow to be better, sworn to a friend. Break it, and you'll pay.
          </p>
          <div style={{ ...fadeStyle(s2Cta), marginTop: 32, width: '100%', maxWidth: 320 }}>
            <PrimaryButton onClick={finish}>Begin →</PrimaryButton>
          </div>
        </div>
      )}

      {/* Ambient gold glow */}
      <div style={{
        position: 'absolute',
        top: -100,
        right: -80,
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--uv-gold-glow) 0%, transparent 70%)',
        opacity: 0.4,
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />
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

  // Authenticated users go to dashboard (not seal, not live — always dashboard)
  useEffect(() => {
    if (loading || !isAuthenticated || !session) return;

    // Honor auth return paths (from OAuth callbacks)
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

    // Always go to dashboard — it handles empty state itself
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

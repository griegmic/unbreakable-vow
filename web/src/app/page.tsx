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
  const [phase, setPhase] = useState(0); // 0=dark, 1-4=lines, 5=pause, 6=screen2
  const [skipReady, setSkipReady] = useState(false);
  const [exiting, setExiting] = useState(false);

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const dur = reducedMotion ? 200 : undefined;
    // Phase 0: pure darkness for 800ms — let the void breathe
    const timers = [
      setTimeout(() => setPhase(1), dur ?? 800),    // gold ember appears
      setTimeout(() => setPhase(2), dur ?? 2000),    // line 1
      setTimeout(() => setPhase(3), dur ?? 3200),    // line 2
      setTimeout(() => setPhase(4), dur ?? 4600),    // line 3
      setTimeout(() => setSkipReady(true), dur ?? 1500),
      setTimeout(() => setPhase(5), dur ?? 7200),    // pause — weight
      setTimeout(() => setPhase(6), dur ?? 8400),    // screen 2: revelation
      setTimeout(() => {                              // auto-dismiss after revelation settles
        try { localStorage.setItem('uv_ceremony_seen', '1'); } catch {}
        setExiting(true);
        setTimeout(() => onComplete(), 600);
      }, dur ?? 12500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion, onComplete]);

  const finish = useCallback(() => {
    try { localStorage.setItem('uv_ceremony_seen', '1'); } catch {}
    setExiting(true);
    setTimeout(() => onComplete(), 600);
  }, [onComplete]);

  const advance = () => {
    if (phase < 5) setPhase(5);
    else if (phase === 5) setPhase(6);
  };

  const slow = (visible: boolean, delay = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(12px)',
    filter: visible ? 'blur(0)' : 'blur(8px)',
    transition: reducedMotion
      ? 'opacity 100ms ease'
      : `opacity 1s cubic-bezier(0.19,1,0.22,1) ${delay}ms, transform 1s cubic-bezier(0.19,1,0.22,1) ${delay}ms, filter 1s cubic-bezier(0.19,1,0.22,1) ${delay}ms`,
  });

  return (
    <div
      onClick={advance}
      role="dialog"
      aria-live="polite"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#050403',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: phase < 6 ? 'pointer' : 'default',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 600ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Atmospheric layers */}

      {/* Deep vignette — always on */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 30%, #050403 75%)',
      }} />

      {/* Gold ember — breathes in from center, very slow */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%',
        width: 400, height: 400,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,168,74,0.15) 0%, rgba(212,168,74,0.04) 40%, transparent 70%)',
        opacity: phase >= 1 ? 1 : 0,
        filter: 'blur(40px)',
        transition: 'opacity 2s ease',
        pointerEvents: 'none',
        animation: phase >= 1 ? 'ceremonyBreath 6s ease-in-out infinite' : 'none',
      }} />

      {/* Faint gold particles — tiny dots drifting up */}
      {phase >= 2 && !reducedMotion && (
        <>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${20 + (i * 8.5)}%`,
              bottom: -10,
              width: 2, height: 2,
              borderRadius: '50%',
              background: 'var(--uv-gold)',
              opacity: 0.3 + (i % 3) * 0.15,
              animation: `particleRise ${4 + (i % 3) * 2}s ease-in-out ${i * 0.7}s infinite`,
              pointerEvents: 'none',
            }} />
          ))}
        </>
      )}

      {/* Skip */}
      <button
        onClick={(e) => { e.stopPropagation(); if (skipReady) finish(); }}
        style={{
          position: 'absolute', top: 20, right: 20,
          padding: '10px 16px', background: 'none', border: 'none',
          cursor: skipReady ? 'pointer' : 'default',
          opacity: skipReady ? 0.3 : 0,
          transition: 'opacity 1s',
          fontFamily: 'var(--uv-font-sans)', fontSize: 12,
          color: 'var(--uv-text-faint)', letterSpacing: '0.5px',
          minWidth: 44, minHeight: 44,
        }}
      >
        skip
      </button>

      {phase < 6 ? (
        /* ─── SCREEN 1: The Accusation ─── */
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 0, maxWidth: 360, position: 'relative', zIndex: 1,
          opacity: phase === 5 ? 0 : 1,
          transition: 'opacity 800ms ease',
        }}>
          <span style={{
            ...slow(phase >= 2),
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 'clamp(32px, 8vw, 42px)',
            fontWeight: 400,
            color: '#f5f0e4',
            textAlign: 'center',
            lineHeight: 1.15,
          }}>
            Every promise
          </span>
          <span style={{
            ...slow(phase >= 3),
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 'clamp(32px, 8vw, 42px)',
            fontWeight: 400,
            color: '#f5f0e4',
            textAlign: 'center',
            lineHeight: 1.15,
            marginTop: 4,
          }}>
            you&apos;ve ever broken
          </span>
          <span style={{
            ...slow(phase >= 4),
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 'clamp(32px, 8vw, 42px)',
            fontWeight: 400,
            color: '#f5f0e4',
            textAlign: 'center',
            lineHeight: 1.15,
            marginTop: 4,
          }}>
            had one thing in common.
          </span>
        </div>
      ) : (
        /* ─── SCREEN 2: The Orb ─── */
        <div
          onClick={(e) => { e.stopPropagation(); finish(); }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center',
            position: 'relative', zIndex: 1, cursor: 'pointer',
          }}
        >
          {/* The dark orb */}
          <div style={{
            ...slow(true, 0),
            width: 'min(82vw, 380px)',
            height: 'min(82vw, 380px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 42%, #1a1510 0%, #0e0c08 55%, #080705 100%)',
            boxShadow: '0 0 100px rgba(212,168,74,0.06), 0 0 200px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 36px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Subtle inner light */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'radial-gradient(circle at 50% 35%, rgba(212,168,74,0.05) 0%, transparent 55%)',
              pointerEvents: 'none',
            }} />

            <span style={{
              ...slow(true, 400),
              fontFamily: 'var(--uv-font-serif)',
              fontSize: 'clamp(19px, 5vw, 24px)',
              fontWeight: 400,
              fontStyle: 'italic',
              color: 'var(--uv-gold)',
              textAlign: 'center',
              position: 'relative',
            }}>
              An Unbreakable Vow —
            </span>

            <span style={{
              ...slow(true, 900),
              fontFamily: 'var(--uv-font-serif)',
              fontSize: 'clamp(17px, 4.5vw, 21px)',
              fontWeight: 400,
              color: 'rgba(245,240,228,0.75)',
              textAlign: 'center',
              lineHeight: 1.55,
              marginTop: 14,
              position: 'relative',
            }}>
              a vow to be better,<br />sworn to a friend.
            </span>

            <span style={{
              ...slow(true, 1500),
              fontFamily: 'var(--uv-font-serif)',
              fontSize: 'clamp(17px, 4.5vw, 21px)',
              fontWeight: 500,
              fontStyle: 'italic',
              color: 'var(--uv-gold)',
              textAlign: 'center',
              marginTop: 20,
              position: 'relative',
              textShadow: '0 0 30px rgba(212,168,74,0.2)',
            }}>
              Break it, and you&apos;ll pay.
            </span>
          </div>

          {/* Hint below */}
          <span style={{
            ...slow(true, 2200),
            marginTop: 32,
            fontFamily: 'var(--uv-font-sans)', fontSize: 11,
            color: 'var(--uv-text-faint)', letterSpacing: '0.5px',
            opacity: 0.5,
          }}>
            tap to continue
          </span>
        </div>
      )}

      {/* Breathing + particle keyframes */}
      <style>{`
        @keyframes ceremonyBreath {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
        }
        @keyframes particleRise {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.1; }
          100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
        }
      `}</style>
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

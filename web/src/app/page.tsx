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
  // Phases: 0=void, 1=ember, 2=line1, 3=line2, 4=line3,
  //         5=long pause, 6="free." alone, 7=orb grows around it, 8=auto-exit
  const [phase, setPhase] = useState(0);
  const [skipReady, setSkipReady] = useState(false);
  const [exiting, setExiting] = useState(false);

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const f = reducedMotion ? 0.15 : 1;
    const timers = [
      setTimeout(() => setPhase(1), 400 * f),      // ember
      setTimeout(() => setPhase(2), 1000 * f),      // "Every promise"
      setTimeout(() => setPhase(3), 2000 * f),      // "you've ever broken"
      setTimeout(() => setPhase(4), 3100 * f),      // "had one thing in common."
      setTimeout(() => setSkipReady(true), 800 * f),
      setTimeout(() => setPhase(5), 4600 * f),      // brief pause
      setTimeout(() => setPhase(6), 5400 * f),      // "free."
      setTimeout(() => setPhase(7), 6800 * f),      // orb
      setTimeout(() => {                             // auto-exit
        try { localStorage.setItem('uv_ceremony_seen', '1'); } catch {}
        setExiting(true);
        setTimeout(() => onComplete(), 600);
      }, 10000 * f),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion, onComplete]);

  const finish = useCallback(() => {
    try { localStorage.setItem('uv_ceremony_seen', '1'); } catch {}
    setExiting(true);
    setTimeout(() => onComplete(), 600);
  }, [onComplete]);

  const advance = () => {
    if (phase < 5) setPhase(5);      // skip to silence
    else if (phase === 5) setPhase(6); // skip to "free."
    else if (phase === 6) setPhase(7); // skip to orb
    else finish();                     // exit
  };

  const slow = (visible: boolean, delay = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(14px)',
    filter: visible ? 'blur(0)' : 'blur(8px)',
    transition: reducedMotion
      ? 'opacity 100ms ease'
      : `opacity 1.2s cubic-bezier(0.19,1,0.22,1) ${delay}ms, transform 1.2s cubic-bezier(0.19,1,0.22,1) ${delay}ms, filter 1.2s cubic-bezier(0.19,1,0.22,1) ${delay}ms`,
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

      {/* Particles — only during orb phase */}
      {phase >= 7 && !reducedMotion && (
        <>
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${15 + (i * 6.5)}%`,
              bottom: -10,
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              borderRadius: '50%',
              background: 'var(--uv-gold)',
              opacity: 0.2 + (i % 4) * 0.1,
              animation: `particleRise ${5 + (i % 3) * 2.5}s ease-in-out ${i * 0.5}s infinite`,
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
          opacity: skipReady ? 0.25 : 0,
          transition: 'opacity 1.5s',
          fontFamily: 'var(--uv-font-sans)', fontSize: 11,
          color: 'var(--uv-text-faint)', letterSpacing: '1px',
          minWidth: 44, minHeight: 44,
        }}
      >
        skip
      </button>

      {/* ─── THE ACCUSATION (phases 2-4) ─── */}
      <div style={{
        position: 'absolute',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 0, maxWidth: 360, zIndex: 2,
        opacity: phase >= 2 && phase <= 4 ? 1 : 0,
        transition: 'opacity 1s ease',
        pointerEvents: 'none',
      }}>
        <span style={{
          ...slow(phase >= 2),
          fontFamily: 'var(--uv-font-serif)',
          fontSize: 'clamp(30px, 8vw, 40px)',
          fontWeight: 400,
          color: '#f5f0e4',
          textAlign: 'center',
          lineHeight: 1.2,
        }}>
          Every promise
        </span>
        <span style={{
          ...slow(phase >= 3),
          fontFamily: 'var(--uv-font-serif)',
          fontSize: 'clamp(30px, 8vw, 40px)',
          fontWeight: 400,
          color: '#f5f0e4',
          textAlign: 'center',
          lineHeight: 1.2,
          marginTop: 6,
        }}>
          you&apos;ve ever broken
        </span>
        <span style={{
          ...slow(phase >= 4),
          fontFamily: 'var(--uv-font-serif)',
          fontSize: 'clamp(30px, 8vw, 40px)',
          fontWeight: 400,
          color: '#f5f0e4',
          textAlign: 'center',
          lineHeight: 1.2,
          marginTop: 6,
        }}>
          had one thing in common.
        </span>
      </div>

      {/* ─── THE WORD: "free." (phase 6) ─── */}
      <span style={{
        position: phase >= 7 ? 'absolute' : 'relative',
        top: phase >= 7 ? '38%' : undefined,
        zIndex: 3,
        fontFamily: 'var(--uv-font-serif)',
        fontSize: phase >= 7 ? 'clamp(22px, 5vw, 28px)' : 'clamp(64px, 16vw, 88px)',
        fontWeight: 400,
        fontStyle: 'italic',
        color: 'var(--uv-gold)',
        textAlign: 'center',
        lineHeight: 1,
        opacity: phase >= 6 ? 1 : 0,
        textShadow: phase >= 6 ? '0 0 60px rgba(212,168,74,0.3)' : 'none',
        transition: reducedMotion ? 'opacity 100ms' : `opacity 1.5s cubic-bezier(0.19,1,0.22,1), font-size 1.5s cubic-bezier(0.19,1,0.22,1), top 1.5s cubic-bezier(0.19,1,0.22,1)`,
        letterSpacing: phase >= 7 ? '0' : '-2px',
      }}>
        {phase >= 7 ? (
          <>It was <em>free.</em></>
        ) : (
          <>free.</>
        )}
      </span>

      {/* ─── THE ORB (phase 7) — grows around "free." ─── */}
      {phase >= 7 && (
        <div style={{
          position: 'absolute', zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            ...slow(true, 0),
            width: 'min(82vw, 380px)',
            height: 'min(82vw, 380px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 42%, #1a1510 0%, #0e0c08 55%, #080705 100%)',
            boxShadow: '0 0 120px rgba(212,168,74,0.06), 0 0 200px rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Inner glow */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'radial-gradient(circle at 50% 30%, rgba(212,168,74,0.06) 0%, transparent 50%)',
              pointerEvents: 'none',
            }} />

            <span style={{
              ...slow(true, 200),
              fontFamily: 'var(--uv-font-serif)',
              fontSize: 'clamp(17px, 4.5vw, 22px)',
              fontWeight: 400,
              fontStyle: 'italic',
              color: 'var(--uv-gold)',
              textAlign: 'center',
              position: 'relative',
              marginTop: 24,
            }}>
              An Unbreakable Vow —
            </span>

            <span style={{
              ...slow(true, 800),
              fontFamily: 'var(--uv-font-serif)',
              fontSize: 'clamp(16px, 4vw, 20px)',
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
              fontSize: 'clamp(16px, 4vw, 20px)',
              fontWeight: 500,
              fontStyle: 'italic',
              color: 'var(--uv-gold)',
              textAlign: 'center',
              marginTop: 20,
              position: 'relative',
              textShadow: '0 0 30px rgba(212,168,74,0.15)',
            }}>
              Break it, and you&apos;ll pay.
            </span>
          </div>
        </div>
      )}

      {/* Tap hint — only on orb */}
      {phase >= 7 && (
        <span style={{
          ...slow(true, 2000),
          position: 'absolute', bottom: '12%', zIndex: 3,
          fontFamily: 'var(--uv-font-sans)', fontSize: 11,
          color: 'var(--uv-text-faint)', letterSpacing: '1px',
          opacity: 0.35,
        }}>
          tap to continue
        </span>
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

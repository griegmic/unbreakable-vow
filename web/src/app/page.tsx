'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen, FrauncesH1, FrauncesSub, GoldCTA } from '@/components/primitives';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';
import { AuthModal } from '@/components/auth-modal';
import { inferDeadline, analyzeVow } from '@/lib/vow-logic';

const STARTER_CHIPS = [
  'Gym 3x this week',
  'No alcohol, 2 weeks',
  'Delete TikTok for a week',
];

// ─── Ceremony ───────────────────────────────────────────────────────────────
// 3-line oath overlay. Show-once (localStorage). ~2.7s staggered fade-in.

function CeremonyOverlay({ onComplete }: { onComplete: () => void }) {
  const [line1Visible, setLine1Visible] = useState(false);
  const [line2Visible, setLine2Visible] = useState(false);
  const [line3Visible, setLine3Visible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const finish = useCallback(() => {
    try { localStorage.setItem('uv_ceremony_seen', '1'); } catch {}
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const t = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      timersRef.current.push(id);
      return id;
    };

    if (reducedMotion) {
      // Reduced motion: all lines immediately, CTA after 500ms
      t(0, () => {
        setLine1Visible(true);
        setLine2Visible(true);
        setLine3Visible(true);
      });
      t(500, () => setCtaVisible(true));
    } else {
      // Full sequence: ~2.7s
      // 0.0s — line 1 fades in (400ms ease-out)
      t(0, () => setLine1Visible(true));
      // 1.0s — line 2 fades in
      t(1000, () => setLine2Visible(true));
      // 2.0s — line 3 fades in
      t(2000, () => setLine3Visible(true));
      // 2.4s — CTA fades in
      t(2400, () => setCtaVisible(true));
    }

    return () => timersRef.current.forEach(clearTimeout);
  }, [reducedMotion]);

  const lineBase: React.CSSProperties = {
    fontFamily: 'var(--uv-font-serif)',
    fontSize: 31,
    fontWeight: 400,
    color: 'var(--uv-gold)',
    textAlign: 'center',
    lineHeight: 1.35,
    margin: 0,
    transition: reducedMotion ? 'none' : 'opacity 400ms ease-out',
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--uv-bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* ─── Oath lines ─── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 10,
        padding: '0 24px',
      }}>
        <p style={{ ...lineBase, opacity: line1Visible ? 1 : 0 }}>
          I do solemnly swear
        </p>
        <p style={{ ...lineBase, opacity: line2Visible ? 1 : 0 }}>
          to keep my word this week.
        </p>
        <p style={{
          ...lineBase,
          fontStyle: 'italic',
          fontSize: 24,
          color: 'var(--uv-text-muted)',
          opacity: line3Visible ? 1 : 0,
        }}>
          or else.
        </p>
      </div>

      {/* ─── CTA anchored to bottom ─── */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: '0 24px',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        opacity: ctaVisible ? 1 : 0,
        transition: reducedMotion ? 'none' : 'opacity 400ms ease-out',
        pointerEvents: ctaVisible ? 'auto' : 'none',
      }}>
        <GoldCTA
          label="I swear it →"
          onPress={finish}
        />
      </div>
    </div>
  );
}

// ─── Helper: parse duration patterns inferDeadline doesn't handle ──────────
function parseDuration(input: string): Date | null {
  const lower = input.toLowerCase();
  const now = new Date();

  // "N week(s)" / "N day(s)" / "N month(s)"
  const match = lower.match(/(\d+)\s*(week|day|month)s?/);
  if (match) {
    const n = parseInt(match[1], 10);
    const unit = match[2];
    const d = new Date(now);
    if (unit === 'week') d.setDate(d.getDate() + n * 7);
    else if (unit === 'day') d.setDate(d.getDate() + n);
    else if (unit === 'month') d.setMonth(d.getMonth() + n);
    d.setHours(23, 59, 59, 0);
    return d;
  }

  return null;
}

function getSmartDeadline(text: string): Date {
  // Try inferDeadline from vow-logic first
  const inferred = inferDeadline(text);
  if (inferred) return inferred;

  // Try duration patterns (e.g. "2 weeks", "30 days")
  const duration = parseDuration(text);
  if (duration) return duration;

  // Default: 7 days from now
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 59, 0);
  return d;
}

function isVagueVow(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 3) return true;
  const analysis = analyzeVow(trimmed);
  return analysis.type === 'vague';
}

// ─── Landing ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading, session } = useAuth();
  const { setRawInput, setDeadline } = useVowFlow();
  const [showCeremony, setShowCeremony] = useState(false);
  const [checked, setChecked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Input state
  const [inputText, setInputText] = useState('');
  const [deadlineDate, setDeadlineDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 59, 0);
    return d;
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Update deadline when input text changes
  useEffect(() => {
    if (!inputText.trim()) return;
    const smart = getSmartDeadline(inputText);
    const frame = requestAnimationFrame(() => setDeadlineDate(smart));
    return () => cancelAnimationFrame(frame);
  }, [inputText]);

  // Check ceremony on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        if (localStorage.getItem('uv_ceremony_seen') !== '1') {
          setShowCeremony(true);
        }
      } catch {}
      setChecked(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Authenticated users: check for in-progress vow first, then dashboard
  useEffect(() => {
    if (loading || !isAuthenticated || !session) return;

    try {
      const raw = sessionStorage.getItem('uv-post-seal-target') || localStorage.getItem('uv-post-seal-target');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id && Date.now() - Number(parsed.ts || 0) < 5 * 60 * 1000) {
          sessionStorage.removeItem('uv-post-seal-target');
          localStorage.removeItem('uv-post-seal-target');
          router.replace(`/vow/${parsed.id}?sealed=1`);
          return;
        }
      }
    } catch {}

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

    // Otherwise dashboard
    router.replace('/dashboard');
  }, [isAuthenticated, loading, router, session]);

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    setRawInput(inputText.trim());
    setDeadline(deadlineDate.toISOString());
    const vague = isVagueVow(inputText.trim());
    router.push(vague ? '/refine' : '/stake');
  };

  const handleChipTap = (chip: string) => {
    setInputText(chip);
    inputRef.current?.focus();
  };

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
    <RitualScreen variant="utility">
      <style>{`
        body:has(.uv-home-shell) { overflow: hidden; }
        .uv-home-shell {
          height: calc(100dvh - 48px);
          max-height: calc(100dvh - 48px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .uv-home-main {
          min-height: 0;
          overflow: hidden;
          flex: 1;
        }
        @media (max-height: 700px) {
          .uv-home-brand { margin-bottom: 14px !important; }
          .uv-home-subtitle { margin-top: 12px !important; margin-bottom: 18px !important; }
          .uv-home-input-card { padding: 12px 14px !important; }
          .uv-home-examples { margin-top: 16px !important; }
          .uv-home-third-example { display: none !important; }
        }
      `}</style>
      <div className="uv-home-shell">
        <div className="uv-home-main">
      {/* ─── Progress + auth ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, marginTop: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 600,
            color: 'var(--uv-text-muted)', fontFeatureSettings: '"tnum"',
          }}>
            1 / 5
          </span>
          <div style={{
            height: 3,
            flex: 1,
            maxWidth: 210,
            borderRadius: 999,
            background: 'var(--uv-bg-elevated)',
            overflow: 'hidden',
          }}>
            <div style={{ width: '20%', height: '100%', borderRadius: 999, background: 'var(--uv-gold)' }} />
          </div>
        </div>
        <button
          onClick={() => setShowAuth(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' as const,
            color: 'var(--uv-text-dim)', fontWeight: 500,
            fontFamily: 'var(--uv-font-sans)', padding: '12px 0 12px 12px',
            margin: '-12px 0 -12px -12px',
          }}
        >
          Sign in
        </button>
      </div>

      {/* ─── Brand mark ─── */}
      <div className="uv-home-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{
          width: 22, height: 22,
          border: '1px solid var(--uv-gold)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: 'rotate(45deg)',
          flexShrink: 0,
        }}>
          <div style={{ width: 6, height: 6, background: 'var(--uv-gold)' }} />
        </div>
        <span style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 15, fontWeight: 500,
          letterSpacing: '0.01em', color: 'var(--uv-text)',
        }}>
          Unbreakable{' '}
          <em style={{ color: 'var(--uv-gold)', fontStyle: 'italic', fontWeight: 400 }}>Vow</em>
        </span>
      </div>

      {/* ─── H1 ─── */}
      <FrauncesH1 size="hero">
        Make a vow.
        <br />
        <span style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>Mean it.</span>
      </FrauncesH1>

      {/* ─── Subtitle ─── */}
      <div className="uv-home-subtitle" style={{ marginTop: 18, marginBottom: 26 }}>
        <FrauncesSub>
          <span style={{ maxWidth: 360, display: 'block' }}>
            <strong style={{ color: 'var(--uv-text)', fontWeight: 500 }}>Flake and lose it all.</strong>{' '}
            Stake real cash on your word. Your friend judges. No mercy.
          </span>
        </FrauncesSub>
      </div>

      {/* ─── Input field ─── */}
      <style>{`.uv-home-input::placeholder { font-style: italic; opacity: 0.5; }`}</style>
      <div
        className="uv-home-input-card"
        style={{
          background: 'rgba(31,27,22,0.72)',
          border: '1px solid var(--uv-border-strong)',
          borderRadius: 18,
          padding: '14px 16px',
          boxShadow: inputText.trim() ? '0 0 0 1px var(--uv-gold-line), 0 18px 48px rgba(0,0,0,0.2)' : 'none',
          transition: 'box-shadow 180ms ease, border-color 180ms ease',
        }}
      >
        <div style={{
          fontSize: 10,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--uv-text-faint)',
          fontWeight: 600,
          fontFamily: 'var(--uv-font-sans)',
          marginBottom: 8,
        }}>
          I vow to
        </div>
        <input
          ref={inputRef}
          type="text"
          className="uv-home-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Run every morning this week"
          style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 23, fontWeight: 400,
            color: 'var(--uv-text)',
            background: 'transparent',
            border: 'none',
            padding: '2px 0 4px', width: '100%', outline: 'none',
            letterSpacing: '-0.005em',
          }}
        />
      </div>

      {/* ─── Starter chips ─── */}
      <div className="uv-home-examples" style={{
        fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase' as const,
        color: 'var(--uv-text-dim)', marginTop: 20, marginBottom: 10, fontWeight: 500,
        fontFamily: 'var(--uv-font-sans)',
      }}>
        Or start here
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 }}>
        {STARTER_CHIPS.map((chip, index) => (
          <button
            key={chip}
            className={index === 2 ? 'uv-home-third-example' : undefined}
            onClick={() => handleChipTap(chip)}
            style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 500,
              color: 'var(--uv-text-muted)', background: 'transparent',
              border: '1px solid var(--uv-border-soft)', borderRadius: 9999,
              padding: '11px 15px', letterSpacing: '-0.005em',
              cursor: 'pointer',
              maxWidth: '100%',
              textAlign: 'left',
            }}
          >
            {chip}
          </button>
        ))}
      </div>
        </div>

      {/* ─── Footer ─── */}
      <div style={{
        paddingTop: 14,
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
        background: 'var(--uv-bg)',
        display: 'flex',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
        <button
          onClick={handleSubmit}
          disabled={!inputText.trim()}
          style={{
            background: inputText.trim()
              ? 'linear-gradient(180deg, #F4ECDB 0%, #D8AE4E 100%)'
              : 'linear-gradient(180deg, rgba(244,236,219,0.58) 0%, rgba(216,174,78,0.38) 100%)',
            color: inputText.trim() ? '#090806' : 'rgba(9,8,6,0.58)',
            border: inputText.trim() ? '1px solid rgba(244,237,224,0.7)' : '1px solid rgba(244,237,224,0.22)',
            borderRadius: 14,
            height: 60,
            padding: '0 18px',
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 16,
            fontWeight: 750,
            letterSpacing: '0',
            boxShadow: inputText.trim()
              ? '0 18px 46px rgba(216,174,78,0.24), inset 0 1px 0 rgba(255,255,255,0.45)'
              : '0 10px 30px rgba(216,174,78,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            cursor: 'pointer',
            opacity: 1,
            transition: 'transform 0.12s ease, opacity 0.2s ease',
          }}
          onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'; }}
          onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          Next &rarr;
        </button>
        <div style={{
          textAlign: 'center', fontSize: 11, color: 'var(--uv-text-dim)',
          marginTop: 14, fontFamily: 'var(--uv-font-sans)',
        }}>
          <strong style={{ fontWeight: 600, color: 'var(--uv-text)' }}>60 seconds</strong>
          <span style={{ color: 'var(--uv-text-muted)', margin: '0 6px' }}>&middot;</span>
          No password
        </div>
        </div>
      </div>
      </div>

      <AuthModal
        visible={showAuth}
        onDismiss={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
      />
    </RitualScreen>
  );
}

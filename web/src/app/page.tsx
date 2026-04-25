'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen, FrauncesH1, FrauncesSub } from '@/components/primitives';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';
import { AuthModal } from '@/components/auth-modal';
import { inferDeadline, analyzeVow } from '@/lib/vow-logic';

const STARTER_CHIPS = [
  'Gym 3x this week',
  'No texting my ex',
  'Dry, 2 weeks',
];

// ─── Ceremony ───────────────────────────────────────────────────────────────
// Ceremony uses raw hex (#050403) — intentionally darker than --uv-bg for
// cinematic effect. rgba(212,168,74,...) glow values tuned for that specific
// black. Not tokenized — one-shot overlay with no reuse path.

function CeremonyOverlay({ onComplete }: { onComplete: () => void }) {
  // 0=dark, 1=page1 (accusation + "it was free"), 2=page2 (logo), 3=exit
  const [phase, setPhase] = useState(0);
  const [exiting, setExiting] = useState(false);

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const finish = useCallback(() => {
    try { localStorage.setItem('uv_ceremony_seen', '1'); } catch {}
    setExiting(true);
    setTimeout(() => onComplete(), 500);
  }, [onComplete]);

  useEffect(() => {
    const f = reducedMotion ? 0.15 : 1;
    const timers = [
      setTimeout(() => setPhase(1), 300 * f),       // page 1 fades in
      setTimeout(() => setPhase(2), 3800 * f),       // page 2 (logo)
      setTimeout(() => finish(), 6000 * f),           // auto-exit
    ];
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion, finish]);

  const fade = (visible: boolean, delay = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(6px)',
    transition: reducedMotion
      ? 'opacity 100ms'
      : `opacity 0.8s cubic-bezier(0.19,1,0.22,1) ${delay}ms, transform 0.8s cubic-bezier(0.19,1,0.22,1) ${delay}ms`,
  });

  return (
    <div
      onClick={() => { if (phase === 1) setPhase(2); else finish(); }}
      role="dialog"
      aria-live="polite"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#050403',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 500ms ease',
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
        transition: 'opacity 1.5s ease',
        pointerEvents: 'none',
      }} />

      {/* ─── PAGE 1: Accusation + punchline ─── */}
      <div style={{
        position: 'absolute', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        maxWidth: 340, padding: '0 24px',
        opacity: phase === 1 ? 1 : 0,
        transition: 'opacity 0.6s ease',
        pointerEvents: phase === 1 ? 'auto' : 'none',
      }}>
        <p style={{
          ...fade(phase >= 1),
          fontFamily: 'var(--uv-font-serif)',
          fontSize: 'clamp(18px, 5vw, 22px)',
          fontWeight: 400,
          color: 'rgba(245,240,228,0.7)',
          textAlign: 'center',
          lineHeight: 1.5,
          margin: '0 0 20px',
        }}>
          Every promise you&apos;ve ever broken had one thing in common.
        </p>
        <p style={{
          ...fade(phase >= 1, 600),
          fontFamily: 'var(--uv-font-serif)',
          fontSize: 'clamp(32px, 9vw, 44px)',
          fontWeight: 500,
          color: 'var(--uv-gold)',
          textAlign: 'center',
          lineHeight: 1.1,
          margin: 0,
          textShadow: '0 0 40px rgba(212,168,74,0.25)',
        }}>
          It was free.
        </p>
      </div>

      {/* ─── PAGE 2: Logo ─── */}
      <div style={{
        position: 'absolute', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 16,
        opacity: phase === 2 ? 1 : 0,
        transform: phase === 2 ? 'scale(1)' : 'scale(0.95)',
        transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.19,1,0.22,1)',
        pointerEvents: phase === 2 ? 'auto' : 'none',
      }}>
        {/* Gold diamond logo mark */}
        <div style={{
          width: 36, height: 36, background: 'var(--uv-gold)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 14, height: 14, background: '#050403', transform: 'rotate(45deg)',
          }} />
        </div>
        <h1 style={{
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '3px',
          textTransform: 'uppercase' as const,
          color: 'var(--uv-gold)',
          margin: 0,
        }}>
          UNBREAKABLE VOW
        </h1>
      </div>

      {/* Skip hint */}
      <span style={{
        position: 'absolute', bottom: '10%',
        fontFamily: 'var(--uv-font-sans)', fontSize: 11,
        color: 'var(--uv-text-faint)', letterSpacing: '0.5px',
        opacity: phase >= 1 ? 0.25 : 0,
        transition: 'opacity 1s',
      }}>
        tap anywhere
      </span>
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

function formatVerdictDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getThisSunday(): Date {
  const now = new Date();
  const d = new Date(now);
  const diff = 7 - d.getDay();
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  d.setHours(23, 59, 59, 0);
  return d;
}

// ─── Date preset pills ────────────────────────────────────────────────────
type PresetKey = 'sunday' | '1week' | '30days' | 'pick';

interface DatePreset {
  key: PresetKey;
  label: string;
  getDate: () => Date;
}

const DATE_PRESETS: DatePreset[] = [
  { key: 'sunday', label: 'This Sunday', getDate: getThisSunday },
  { key: '1week', label: '1 week', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(23, 59, 59, 0); return d; } },
  { key: '30days', label: '30 days', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 30); d.setHours(23, 59, 59, 0); return d; } },
];

// ─── Landing ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading, session } = useAuth();
  const { setRawInput, setDeadline, shouldSkipRefine } = useVowFlow();
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
  const [showDatePresets, setShowDatePresets] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update deadline when input text changes
  useEffect(() => {
    if (!inputText.trim()) return;
    const smart = getSmartDeadline(inputText);
    setDeadlineDate(smart);
  }, [inputText]);

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
      {/* ─── Brand header ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 36, marginTop: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Diamond seal */}
          <div style={{
            width: 24, height: 24,
            border: '1px solid var(--uv-gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: 'rotate(45deg)',
          }}>
            <div style={{
              width: 6, height: 6,
              background: 'var(--uv-gold)',
            }} />
          </div>
          {/* Wordmark */}
          <span style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 15, fontWeight: 500,
            letterSpacing: '0.01em', color: 'var(--uv-text)',
          }}>
            Unbreakable{' '}
            <em style={{ color: 'var(--uv-gold)', fontStyle: 'italic', fontWeight: 400 }}>Vow</em>
          </span>
        </div>
        {/* Sign in */}
        <button
          onClick={() => setShowAuth(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' as const,
            color: 'var(--uv-text-dim)', fontWeight: 500,
            fontFamily: 'var(--uv-font-sans)', padding: 0,
          }}
        >
          Sign in
        </button>
      </div>

      {/* ─── H1 ─── */}
      <FrauncesH1 size="hero">
        Make a vow.
        <br />
        <span style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>Mean it.</span>
      </FrauncesH1>

      {/* ─── Subtitle ─── */}
      <div style={{ marginTop: 18 }}>
        <FrauncesSub>
          <span style={{ maxWidth: 320, display: 'block' }}>
            <strong style={{ color: 'var(--uv-text)', fontWeight: 500 }}>Flake and lose it all.</strong>{' '}
            Stake real cash on your word. Your friend judges. No mercy.
          </span>
        </FrauncesSub>
      </div>

      {/* ─── Input label ─── */}
      <div style={{
        fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 13,
        color: 'var(--uv-gold)', marginTop: 24, marginBottom: 8,
        letterSpacing: '0.01em',
      }}>
        I vow to&hellip;
      </div>

      {/* ─── Input field ─── */}
      <style>{`.uv-home-input::placeholder { font-style: italic; opacity: 0.5; }`}</style>
      <input
        ref={inputRef}
        type="text"
        className="uv-home-input"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        placeholder="no phone after 10pm"
        style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 26, fontWeight: 400,
          color: 'var(--uv-text)',
          background: 'transparent',
          border: 'none', borderBottom: '1px solid var(--uv-gold-line)',
          padding: '4px 0 12px', width: '100%', outline: 'none',
          letterSpacing: '-0.005em',
        }}
      />

      {/* ─── Verdict date pill (hidden until user types) ─── */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        marginTop: 16,
        padding: '8px 14px 8px 12px',
        border: '1px solid var(--uv-gold-line)',
        background: 'var(--uv-gold-soft)',
        borderRadius: 9999,
        fontFamily: 'var(--uv-font-serif)', fontSize: 13,
        color: 'var(--uv-text)',
        letterSpacing: '-0.005em',
        opacity: inputText.trim() ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: inputText.trim() ? 'auto' as const : 'none' as const,
      }}>
        {/* Gold dot with glow */}
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--uv-gold)',
          boxShadow: '0 0 6px var(--uv-gold)',
          flexShrink: 0,
        }} />
        <span style={{
          color: 'var(--uv-text-muted)', fontStyle: 'italic', fontWeight: 400,
        }}>
          Verdict by
        </span>
        <span style={{
          color: 'var(--uv-text)', fontWeight: 500,
        }}>
          {formatVerdictDate(deadlineDate)}
        </span>
        <button
          onClick={() => setShowDatePresets(!showDatePresets)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: 'var(--uv-text-dim)', fontStyle: 'italic', fontSize: 11.5,
            borderLeft: '1px solid var(--uv-border-soft)',
            paddingLeft: 10, marginLeft: 2,
            fontFamily: 'var(--uv-font-serif)',
          }}
        >
          change
        </button>
      </div>

      {/* ─── Date preset pills (toggled by "change") ─── */}
      {showDatePresets && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10,
        }}>
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => {
                setDeadlineDate(preset.getDate());
                setShowDatePresets(false);
                setShowDatePicker(false);
              }}
              style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 400,
                color: 'var(--uv-text)', background: 'var(--uv-bg-card)',
                border: '1px solid var(--uv-border-soft)', borderRadius: 9999,
                padding: '9px 13px', letterSpacing: '-0.005em',
                cursor: 'pointer',
              }}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 400,
              color: 'var(--uv-text)', background: 'var(--uv-bg-card)',
              border: '1px solid var(--uv-border-soft)', borderRadius: 9999,
              padding: '9px 13px', letterSpacing: '-0.005em',
              cursor: 'pointer',
            }}
          >
            Pick date
          </button>
        </div>
      )}

      {/* Native date picker (shown when "Pick date" is tapped) */}
      {showDatePicker && showDatePresets && (
        <input
          type="date"
          value={deadlineDate.toISOString().split('T')[0]}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => {
            const d = new Date(e.target.value + 'T23:59:59');
            if (!isNaN(d.getTime())) {
              setDeadlineDate(d);
              setShowDatePresets(false);
              setShowDatePicker(false);
            }
          }}
          style={{
            marginTop: 8,
            fontFamily: 'var(--uv-font-sans)', fontSize: 14,
            color: 'var(--uv-text)', background: 'var(--uv-bg-card)',
            border: '1px solid var(--uv-border-soft)', borderRadius: 8,
            padding: '10px 12px', outline: 'none',
            colorScheme: 'dark',
          }}
        />
      )}

      {/* ─── Starter chips ─── */}
      <div style={{
        fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase' as const,
        color: 'var(--uv-text-dim)', marginTop: 18, marginBottom: 10, fontWeight: 500,
        fontFamily: 'var(--uv-font-sans)',
      }}>
        Tap one to start
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {STARTER_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => handleChipTap(chip)}
            style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 400,
              color: 'var(--uv-text)', background: 'var(--uv-bg-card)',
              border: '1px solid var(--uv-border-soft)', borderRadius: 9999,
              padding: '9px 13px', letterSpacing: '-0.005em',
              cursor: 'pointer',
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* ─── Footer ─── */}
      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={handleSubmit}
          disabled={!inputText.trim()}
          style={{
            background: 'var(--uv-text)',
            color: 'var(--uv-bg)',
            border: 'none',
            borderRadius: 14,
            padding: 17,
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: '0.01em',
            boxShadow: '0 0 40px rgba(244,237,224,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            cursor: 'pointer',
            opacity: inputText.trim() ? 1 : 0.4,
            transition: 'transform 0.12s ease, opacity 0.2s ease',
          }}
          onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'; }}
          onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          Make my vow &rarr;
        </button>
        <div style={{
          textAlign: 'center', fontSize: 11, color: 'var(--uv-text-dim)',
          marginTop: 14, fontFamily: 'var(--uv-font-sans)',
        }}>
          <strong style={{ fontWeight: 600, color: 'var(--uv-text)' }}>60 seconds</strong>
          <span style={{ color: 'var(--uv-text-muted)', margin: '0 6px' }}>&middot;</span>
          No signup
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

'use client';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoldCTA } from '@/components/primitives';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { antiCauses } from '@/lib/vow-logic';

/**
 * Outcome screens — Vow Kept
 *
 * M11: Charity destination — trophy, "You actually did it.", receipt, "Share your win →"
 * M11B: Cause-you-hate — shield, "Crisis averted.", saved-line, receipt, "Tell everyone →"
 *
 * Bier-audit: ONE gold primary CTA + ONE text-link secondary (max).
 * Canonical mocks: m11-vow-kept-charity.html, m11b-vow-kept-cause-you-hate.html
 */

// ── Bespoke SVG glyphs from canonical mocks ──

function TrophyGlyph() {
  return (
    <div style={{
      position: 'relative',
      width: 96, height: 96,
      marginBottom: 24,
    }}>
      {/* Halo */}
      <div style={{
        position: 'absolute', inset: -32,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,182,86,0.26), transparent 62%)',
      }} />
      {/* Trophy */}
      <div style={{
        position: 'relative', width: 96, height: 96,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        filter: 'drop-shadow(0 14px 28px rgba(200,155,60,0.35))',
      }}>
        <svg viewBox="0 0 64 64" width="80" height="80" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="tg1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F2C766"/>
              <stop offset="50%" stopColor="#E8B656"/>
              <stop offset="100%" stopColor="#8B6820"/>
            </linearGradient>
            <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C89B3C"/>
              <stop offset="100%" stopColor="#8B6820"/>
            </linearGradient>
          </defs>
          <path d="M18 8 h28 v18 c0 9 -6 16 -14 16 s-14 -7 -14 -16 z"
                fill="url(#tg1)" stroke="#5C4514" strokeWidth="0.6"/>
          <path d="M18 12 c-6 0 -8 4 -8 8 c0 6 4 9 8 9" fill="none" stroke="url(#tg2)" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M46 12 c6 0 8 4 8 8 c0 6 -4 9 -8 9" fill="none" stroke="url(#tg2)" strokeWidth="2.2" strokeLinecap="round"/>
          <ellipse cx="32" cy="9" rx="14" ry="2" fill="#5C4514" opacity="0.45"/>
          <rect x="29" y="42" width="6" height="6" fill="url(#tg2)"/>
          <path d="M20 48 h24 v3 h-24 z" fill="url(#tg2)"/>
          <path d="M16 51 h32 v5 c0 1 -1 2 -2 2 h-28 c-1 0 -2 -1 -2 -2 z" fill="url(#tg1)" stroke="#5C4514" strokeWidth="0.5"/>
          <path d="M32 18 l1.5 4.5 h4.7 l-3.8 2.8 l1.5 4.5 l-3.9 -2.8 l-3.9 2.8 l1.5 -4.5 l-3.8 -2.8 h4.7 z"
                fill="#5C4514" opacity="0.55"/>
        </svg>
      </div>
    </div>
  );
}

function ShieldGlyph() {
  return (
    <div style={{
      position: 'relative',
      width: 104, height: 104,
      marginBottom: 22,
    }}>
      {/* Halo */}
      <div style={{
        position: 'absolute', inset: -34,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,182,86,0.22), transparent 60%), radial-gradient(circle, rgba(200,68,58,0.10), transparent 64%)',
      }} />
      {/* Shield */}
      <div style={{
        position: 'relative', width: 104, height: 104,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        filter: 'drop-shadow(0 16px 28px rgba(180,80,40,0.30))',
      }}>
        <svg viewBox="0 0 80 96" width="84" height="100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sg-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F2C766"/>
              <stop offset="55%" stopColor="#E8B656"/>
              <stop offset="100%" stopColor="#8B6820"/>
            </linearGradient>
            <linearGradient id="sg-red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D8584C"/>
              <stop offset="100%" stopColor="#8C2D26"/>
            </linearGradient>
            <linearGradient id="sg-gold-line" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8B656"/>
              <stop offset="100%" stopColor="#8B6820"/>
            </linearGradient>
          </defs>
          <path d="M40 2 L72 10 L72 50 C72 70 56 84 40 92 C24 84 8 70 8 50 L8 10 Z"
                fill="url(#sg-gold)" stroke="#5C4514" strokeWidth="0.8"/>
          <path d="M40 9 L66 15.5 L66 50 C66 66 53 78 40 84.5 C27 78 14 66 14 50 L14 15.5 Z"
                fill="url(#sg-red)" stroke="#5C4514" strokeWidth="0.5"/>
          <path d="M14 32 L66 32 L66 40 L14 40 Z"
                fill="url(#sg-gold)" stroke="#5C4514" strokeWidth="0.4"/>
          <path d="M37 18 L43 18 L43 28 L53 28 L53 34 L43 34 L43 50 L37 50 L37 34 L27 34 L27 28 L37 28 Z"
                fill="url(#sg-gold-line)" opacity="0.95"/>
          <path d="M40 56 L42.5 63 L50 63 L44 67.5 L46.5 75 L40 70.5 L33.5 75 L36 67.5 L30 63 L37.5 63 Z"
                fill="url(#sg-gold-line)"/>
          <path d="M40 9 L66 15.5 L66 18 L40 12 L14 18 L14 15.5 Z"
                fill="#F2C766" opacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

function FlameIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size + 2} viewBox="0 0 12 14" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 0 c1.5 3 4 4 4 7.5 c0 3.5 -2 5.5 -4 5.5 s-4 -2 -4 -5.5 c0 -2 1 -3 2 -3.5 c0 1 0 2 1 2.5 c0 -2 0 -4 1 -6 z"
            fill="#E8B656"/>
    </svg>
  );
}

function BanGlyph() {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="6" fill="none" stroke="#C8443A" strokeWidth="1.6"/>
      <line x1="2.8" y1="2.8" x2="11.2" y2="11.2" stroke="#C8443A" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function isAntiCause(destination: string): boolean {
  return antiCauses.some(c => destination.toLowerCase().includes(c.toLowerCase()));
}

// ── Confetti dots (static, subtle gold particles per M11 mock) ──
const CONFETTI_DOTS = [
  { top: 90, left: 64, w: 4, h: 4, opacity: 0.55 },
  { top: 132, left: 312, w: 5, h: 2, opacity: 0.55, borderRadius: 1 },
  { top: 178, left: 48, w: 3, h: 3, opacity: 0.55 },
  { top: 102, left: 248, w: 5, h: 5, opacity: 0.4 },
  { top: 218, left: 332, w: 3, h: 3, opacity: 0.5 },
  { top: 64, left: 168, w: 4, h: 4, opacity: 0.35 },
  { top: 200, left: 90, w: 3, h: 3, opacity: 0.4 },
  { top: 156, left: 358, w: 4, h: 4, opacity: 0.45 },
];

function VowKeptContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { session } = useAuth();

  const vowText = params.get('text') || 'Your vow';
  const amount = params.get('amount') || '0';
  const destination = params.get('destination') || '';
  const witnessName = params.get('witness') || 'Your witness';
  const stakeDollars = parseInt(amount) || 0;
  const isAnti = isAntiCause(destination);
  const isZeroStake = stakeDollars === 0;

  // Streak fetch
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchStats = async () => {
      const { data } = await supabase.from('vows')
        .select('verdict, verdict_at')
        .eq('user_id', session.user.id)
        .not('verdict', 'is', null)
        .order('verdict_at', { ascending: false });
      if (!data) return;
      let s = 0;
      for (const v of data) {
        if (v.verdict === 'kept') s++;
        else break;
      }
      setStreak(s);
    };
    fetchStats();
  }, [session?.user?.id]);

  // Share handler
  const handleShare = useCallback(async () => {
    const text = isAnti
      ? `I just kept a vow and saved $${stakeDollars} from going to ${destination}. I'm on a roll.`
      : `I just kept a vow on @unbreakablevow. My word is gold.`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
    }
  }, [isAnti, stakeDollars, destination]);

  // Background gradient per variant
  const bgImage = isAnti
    ? 'radial-gradient(ellipse 700px 460px at 50% 26%, rgba(232,182,86,0.16), transparent 62%), radial-gradient(ellipse 540px 320px at 50% 26%, rgba(200,68,58,0.10), transparent 62%), radial-gradient(ellipse 900px 480px at 50% 100%, rgba(200,155,60,0.05), transparent 70%)'
    : 'radial-gradient(ellipse 700px 500px at 50% 28%, rgba(232,182,86,0.18), transparent 62%), radial-gradient(ellipse 900px 480px at 50% 100%, rgba(200,155,60,0.05), transparent 70%)';

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--uv-bg)',
      backgroundImage: bgImage,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: isAnti ? '60px 28px 28px' : '70px 28px 28px',
      textAlign: 'center',
      position: 'relative',
    }}>
      {/* Confetti dots — charity variant only */}
      {!isAnti && (
        <div style={{ position: 'absolute', pointerEvents: 'none', inset: 0 }}>
          {CONFETTI_DOTS.map((dot, i) => (
            <span key={i} style={{
              position: 'absolute',
              top: dot.top, left: dot.left,
              width: dot.w, height: dot.h,
              borderRadius: dot.borderRadius ?? '50%',
              background: 'var(--uv-gold-bright)',
              opacity: dot.opacity,
              display: 'block',
            }} />
          ))}
        </div>
      )}

      {/* Hero glyph */}
      <div className="animate-seal-pop-in">
        {isAnti ? <ShieldGlyph /> : <TrophyGlyph />}
      </div>

      {/* H1 */}
      <h1 style={{
        fontFamily: 'var(--uv-font-serif)',
        fontSize: isAnti ? 38 : 36,
        fontWeight: 500,
        fontStyle: 'italic',
        fontVariationSettings: '"opsz" 144',
        lineHeight: 1.04,
        letterSpacing: '-0.02em',
        color: 'var(--uv-text)',
        margin: 0,
        marginBottom: isAnti ? 10 : 12,
      }}>
        {isAnti ? 'Crisis averted.' : 'You actually did it.'}
      </h1>

      {/* M11B: Saved line */}
      {isAnti && !isZeroStake && (
        <div style={{
          fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontStyle: 'italic',
          fontSize: 24, lineHeight: 1.18, letterSpacing: '-0.01em',
          color: 'var(--uv-gold-bright)',
          marginBottom: 12,
        }}>
          You saved ${stakeDollars} from <span style={{ color: '#E8B656', textShadow: '0 0 18px rgba(200,68,58,0.3)' }}>{destination}</span>.
        </div>
      )}

      {/* Sub */}
      <div style={{
        fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontWeight: 400,
        fontSize: isAnti ? 14.5 : 16, lineHeight: 1.45,
        color: 'var(--uv-text-muted)',
        marginBottom: isAnti ? 22 : 24,
        maxWidth: 300,
      }}>
        {isAnti ? (
          <>
            {witnessName} confirmed.<br/>
            Not a single dollar left your wallet.
          </>
        ) : (
          <>
            {witnessName} confirmed.<br/>
            Your word is <b style={{ color: 'var(--uv-text)', fontWeight: 500, fontStyle: 'italic' }}>gold</b>.
          </>
        )}
      </div>

      {/* Receipt card */}
      <div style={{
        width: '100%',
        background: 'var(--uv-bg-card)',
        border: '1px solid var(--uv-border-soft)',
        borderRadius: 14,
        padding: '16px 18px 14px',
        marginBottom: isAnti ? 18 : 20,
        position: 'relative',
        textAlign: 'left',
      }}>
        {/* Top gold line */}
        <div style={{
          position: 'absolute', top: 0, left: 22, right: 22, height: 1,
          background: 'linear-gradient(90deg, transparent, var(--uv-gold-line), transparent)',
        }} />

        {/* Label */}
        <div style={{
          fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase' as const,
          color: 'var(--uv-text-dim)', fontWeight: 500, marginBottom: 8,
        }}>
          — The Receipt —
        </div>

        {/* Vow text */}
        <div style={{
          fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontWeight: 400,
          fontSize: 16, lineHeight: 1.25, color: 'var(--uv-text)',
          marginBottom: isAnti ? 10 : 12,
        }}>
          {vowText}
        </div>

        {/* Money row */}
        {!isZeroStake && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0',
            borderTop: '1px dashed var(--uv-border-soft)',
          }}>
            <span style={{
              fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-dim)', fontWeight: 500,
            }}>Money</span>
            <span style={{
              fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 14,
              color: '#4ade80', fontFeatureSettings: '"tnum"',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ${stakeDollars} returned
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 14, height: 14, borderRadius: '50%',
                background: 'rgba(74,222,128,0.12)',
                color: '#4ade80', fontSize: 9, fontWeight: 700,
              }}>&#10003;</span>
            </span>
          </div>
        )}

        {/* Saved from row — M11B only */}
        {isAnti && !isZeroStake && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0',
            borderTop: '1px dashed var(--uv-border-soft)',
          }}>
            <span style={{
              fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-dim)', fontWeight: 500,
            }}>Saved from</span>
            <span style={{
              fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 13.5,
              color: 'var(--uv-text)', fontFeatureSettings: '"tnum"',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {destination}
              <BanGlyph />
            </span>
          </div>
        )}

        {/* Streak row */}
        {streak !== null && streak > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0',
            borderTop: '1px dashed var(--uv-border-soft)',
          }}>
            <span style={{
              fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-dim)', fontWeight: 500,
            }}>Streak</span>
            <span style={{
              fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 14,
              color: 'var(--uv-text)', fontFeatureSettings: '"tnum"',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <FlameIcon />
              {streak} vows kept
            </span>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Primary CTA */}
      <div style={{ width: '100%' }}>
        {isAnti ? (
          <GoldCTA
            label={`Tell everyone you saved $${stakeDollars} from ${destination} →`}
            onPress={handleShare}
          />
        ) : (
          <GoldCTA label="Share your win →" onPress={handleShare} />
        )}
      </div>

      {/* Secondary — single text link */}
      <div style={{
        display: 'flex', flexDirection: 'column' as const, gap: 10,
        marginTop: 18, marginBottom: 16,
      }}>
        <button
          onClick={() => router.push('/cast')}
          style={{
            background: 'none', border: 'none',
            fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 500,
            color: 'var(--uv-gold-bright)', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <FlameIcon size={11} />
          Dare a friend
        </button>
      </div>
    </div>
  );
}

export default function VowKeptPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: 'var(--uv-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--uv-gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'uv-spin 600ms linear infinite' }} />
        <style>{`@keyframes uv-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <VowKeptContent />
    </Suspense>
  );
}

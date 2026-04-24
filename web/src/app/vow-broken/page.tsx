'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoldCTA } from '@/components/primitives';
import { antiCauses } from '@/lib/vow-logic';

/**
 * Outcome screens — Vow Broken
 *
 * Charity: broken seal, "You broke it.", receipt, BROKEN stamp, "Make a new vow →"
 * Cause-you-hate: broken seal + red shield overlay, "Brutal. You broke it.",
 *   receipt, "Make a new vow -- let's make this back →", "Post the damage →"
 *
 * Bier-audit: ONE gold primary CTA. Forward motion only.
 * Canonical mocks: vow-broken-charity.html, vow-broken-cause-you-hate.html
 */

// ── Bespoke SVG glyphs from canonical mocks ──

function BrokenSealGlyph() {
  return (
    <div style={{
      position: 'relative', width: 96, height: 96,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      filter: 'drop-shadow(0 12px 24px rgba(40,30,15,0.4))',
    }}>
      <svg viewBox="0 0 96 96" width="96" height="96" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bs-gold" cx="35%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#B8954A"/>
            <stop offset="40%" stopColor="#A88840"/>
            <stop offset="80%" stopColor="#7A5C1A"/>
            <stop offset="100%" stopColor="#4F3A0E"/>
          </radialGradient>
        </defs>
        <path d="M48 6 a42 42 0 0 0 -36 60 l30 -16 l-2 -16 l8 -10 l4 -8 z"
              fill="url(#bs-gold)" stroke="#3A2C0C" strokeWidth="0.8" transform="translate(-3 0)"/>
        <path d="M48 6 a42 42 0 0 1 36 60 l-30 -16 l2 -16 l-8 -10 l-4 -8 z"
              fill="url(#bs-gold)" stroke="#3A2C0C" strokeWidth="0.8" transform="translate(3 0)"/>
        <path d="M12 66 a42 42 0 0 0 30 24 l8 -22 l-12 -10 l-6 8 l-12 8 z"
              fill="url(#bs-gold)" stroke="#3A2C0C" strokeWidth="0.8" transform="translate(-2 2)"/>
        <path d="M84 66 a42 42 0 0 1 -30 24 l-8 -22 l12 -10 l6 8 l12 8 z"
              fill="url(#bs-gold)" stroke="#3A2C0C" strokeWidth="0.8" transform="translate(2 2)"/>
        <path d="M44 4 L48 22 L42 36 L52 50 L46 64 L52 88"
              fill="none" stroke="#1A1205" strokeWidth="2" strokeLinecap="round" strokeLinejoin="miter"/>
      </svg>
    </div>
  );
}

function BrokenSealWithShieldGlyph() {
  return (
    <div style={{
      position: 'relative',
      width: 108, height: 108,
      marginBottom: 22,
    }}>
      {/* Broken seal */}
      <div style={{
        position: 'relative', width: 96, height: 96,
        margin: '0 auto',
        filter: 'drop-shadow(0 12px 24px rgba(140,40,30,0.4))',
      }}>
        <svg viewBox="0 0 96 96" width="96" height="96" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="bs2-gold" cx="35%" cy="28%" r="70%">
              <stop offset="0%" stopColor="#B8954A"/>
              <stop offset="40%" stopColor="#A88840"/>
              <stop offset="80%" stopColor="#7A5C1A"/>
              <stop offset="100%" stopColor="#4F3A0E"/>
            </radialGradient>
          </defs>
          <path d="M48 6 a42 42 0 0 0 -36 60 l30 -16 l-2 -16 l8 -10 l4 -8 z"
                fill="url(#bs2-gold)" stroke="#3A2C0C" strokeWidth="0.8" transform="translate(-3 0)"/>
          <path d="M48 6 a42 42 0 0 1 36 60 l-30 -16 l2 -16 l-8 -10 l-4 -8 z"
                fill="url(#bs2-gold)" stroke="#3A2C0C" strokeWidth="0.8" transform="translate(3 0)"/>
          <path d="M12 66 a42 42 0 0 0 30 24 l8 -22 l-12 -10 l-6 8 l-12 8 z"
                fill="url(#bs2-gold)" stroke="#3A2C0C" strokeWidth="0.8" transform="translate(-2 2)"/>
          <path d="M84 66 a42 42 0 0 1 -30 24 l-8 -22 l12 -10 l6 8 l12 8 z"
                fill="url(#bs2-gold)" stroke="#3A2C0C" strokeWidth="0.8" transform="translate(2 2)"/>
          <path d="M44 4 L48 22 L42 36 L52 50 L46 64 L52 88"
                fill="none" stroke="#1A1205" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      {/* Red shield overlay */}
      <svg style={{
        position: 'absolute',
        bottom: -6, right: -6,
        width: 44, height: 50,
        filter: 'drop-shadow(0 4px 10px rgba(200,68,58,0.45))',
      }} viewBox="0 0 44 50" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rsh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D8584C"/>
            <stop offset="100%" stopColor="#8C2D26"/>
          </linearGradient>
        </defs>
        <path d="M22 1 L42 6 L42 26 C42 36 33 44 22 48 C11 44 2 36 2 26 L2 6 Z"
              fill="url(#rsh)" stroke="#5A1F1A" strokeWidth="0.8"/>
        <circle cx="22" cy="22" r="9" fill="none" stroke="#FFE2DD" strokeWidth="2"/>
        <line x1="15" y1="15" x2="29" y2="29" stroke="#FFE2DD" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function isAntiCause(destination: string): boolean {
  return antiCauses.some(c => destination.toLowerCase().includes(c.toLowerCase()));
}

function VowBrokenContent() {
  const router = useRouter();
  const params = useSearchParams();

  const vowText = params.get('text') || 'Your vow';
  const amount = params.get('amount') || '0';
  const destination = params.get('destination') || 'charity';
  const witnessName = params.get('witness') || 'Your witness';
  const streakParam = params.get('streak');
  const stakeDollars = parseInt(amount) || 0;
  const isAnti = isAntiCause(destination);
  const isZeroStake = stakeDollars === 0;
  const streakEndedAt = streakParam ? parseInt(streakParam) : null;

  // Background gradient per variant
  const bgImage = isAnti
    ? 'radial-gradient(ellipse 700px 480px at 50% 26%, rgba(200,68,58,0.18), transparent 64%), radial-gradient(ellipse 800px 500px at 50% 100%, rgba(140,45,38,0.10), transparent 70%)'
    : 'radial-gradient(ellipse 700px 480px at 50% 28%, rgba(160,82,72,0.10), transparent 64%), radial-gradient(ellipse 800px 500px at 50% 100%, rgba(200,155,60,0.04), transparent 70%)';

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--uv-bg)',
      backgroundImage: bgImage,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: isAnti ? '70px 28px 28px' : '84px 28px 28px',
      textAlign: 'center',
    }}>
      {/* Hero glyph */}
      <div style={{ marginBottom: isAnti ? 0 : 22 }}>
        {isAnti ? <BrokenSealWithShieldGlyph /> : <BrokenSealGlyph />}
      </div>

      {/* H1 — mock order: heading FIRST, then sub, then receipt, then stamp */}
      <h1 style={{
        fontFamily: 'var(--uv-font-serif)',
        fontSize: isAnti ? 38 : 36,
        fontWeight: 500,
        fontStyle: 'italic',
        fontVariationSettings: '"opsz" 144',
        lineHeight: 1.05,
        letterSpacing: isAnti ? '-0.025em' : '-0.02em',
        color: 'var(--uv-text)',
        margin: 0,
        marginBottom: 12,
      }}>
        {isAnti ? 'Brutal. You broke it.' : 'You broke it.'}
      </h1>

      {/* Sub */}
      <div style={{
        fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontWeight: 400,
        fontSize: isAnti ? 17 : 16, lineHeight: isAnti ? 1.4 : 1.45,
        color: 'var(--uv-text-muted)',
        marginBottom: isAnti ? 26 : 26,
        maxWidth: 320,
      }}>
        {isAnti && !isZeroStake ? (
          <>
            <b style={{ color: 'var(--uv-text)', fontWeight: 500, fontStyle: 'italic' }}>${stakeDollars}</b> just went to{' '}
            <b style={{
              color: '#C8443A', fontWeight: 600, fontStyle: 'italic',
              textShadow: '0 0 16px rgba(200,68,58,0.32)',
            }}>{destination}</b>.
          </>
        ) : (
          <>
            {witnessName} confirmed.<br/>
            {isZeroStake
              ? 'The record stands.'
              : <>The ${stakeDollars} is on its way to <span style={{ color: 'var(--uv-gold)', fontWeight: 500, fontStyle: 'italic' }}>{destination}</span>.</>
            }
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
        marginBottom: 22,
        position: 'relative',
        textAlign: 'left',
      }}>
        {/* Top line — red for broken, stronger red for anti */}
        <div style={{
          position: 'absolute', top: 0, left: 22, right: 22, height: 1,
          background: isAnti
            ? 'linear-gradient(90deg, transparent, rgba(200,68,58,0.40), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(160,82,72,0.32), transparent)',
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
          marginBottom: 10,
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
              fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 13.5,
              color: 'var(--uv-text)', fontFeatureSettings: '"tnum"',
            }}>
              ${stakeDollars}{' '}
              <span style={{ color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)', margin: '0 4px' }}>&rarr;</span>{' '}
              <span style={{
                color: isAnti ? '#C8443A' : 'var(--uv-gold)',
                fontStyle: 'italic',
                fontWeight: isAnti ? 600 : 500,
                textShadow: isAnti ? '0 0 14px rgba(200,68,58,0.28)' : 'none',
              }}>{destination}</span>
            </span>
          </div>
        )}

        {/* Streak row */}
        {streakEndedAt !== null && streakEndedAt > 0 && (
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
              fontFamily: 'var(--uv-font-serif)', fontWeight: 400, fontSize: 13.5,
              color: 'var(--uv-text-muted)', fontStyle: 'italic',
              fontFeatureSettings: '"tnum"',
            }}>
              Streak ended at {streakEndedAt}
            </span>
          </div>
        )}
      </div>

      {/* BROKEN stamp — positioned AFTER receipt per mock */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '4px 16px',
        border: '1.5px solid #A05248',
        borderRadius: 4,
        color: '#A05248',
        fontFamily: 'var(--uv-font-serif)', fontWeight: 600,
        fontSize: 16, letterSpacing: '0.18em',
        transform: 'rotate(-3deg)',
        marginBottom: 26,
      }}>
        BROKEN
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Primary CTA — forward motion */}
      <div style={{ width: '100%', marginBottom: isAnti ? 14 : 16 }}>
        <GoldCTA
          label={isAnti ? "Make a new vow \u2014 let's make this back \u2192" : "Make a new vow \u2192"}
          onPress={() => router.push('/')}
        />
      </div>

      {/* Secondary — anti-cause only: "Post the damage →" */}
      {isAnti && (
        <div style={{
          display: 'flex', flexDirection: 'column' as const, gap: 10,
        }}>
          <button
            onClick={async () => {
              const text = `I broke my vow. $${stakeDollars} just went to ${destination}. Don't be like me.`;
              if (navigator.share) {
                try { await navigator.share({ text }); } catch {}
              } else {
                await navigator.clipboard.writeText(text);
              }
            }}
            style={{
              background: 'none', border: 'none',
              fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 500,
              color: 'var(--uv-text-muted)', cursor: 'pointer', padding: 0,
              textAlign: 'center',
            }}
          >
            Post the damage &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

export default function VowBrokenPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: 'var(--uv-bg)' }} />
    }>
      <VowBrokenContent />
    </Suspense>
  );
}

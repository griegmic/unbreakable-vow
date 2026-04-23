'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FrauncesH1, FrauncesSub, GoldCTA, RitualCard, Stamp } from '@/components/primitives';
import { antiCauses } from '@/lib/vow-logic';

/**
 * Outcome screens — Vow Broken
 *
 * §5.3: Charity destination — broken seal, "You broke it.", "Make a new vow →"
 * §5.4: Cause-you-hate — broken seal + red shield, "Brutal. You broke it.",
 *        "Make a new vow — let's make this back →"
 *
 * Bier-audit: ONE gold primary CTA. No secondary. Forward motion only.
 * KILLED: "View your record" — redemption is the only path.
 *
 * Tone: honest, not punishing. "Friend who witnessed you miss, acknowledging it."
 * The product respects the user's decision and offers immediate forward motion.
 *
 * Canonical mocks: vow-broken-charity.html, vow-broken-cause-you-hate.html
 */

// ── Bespoke hero glyphs (swap-ready) ──

function BrokenSealGlyph() {
  return (
    <div style={{
      width: 80, height: 80, borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 30%, var(--uv-gold), var(--uv-gold-deep) 70%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: 0.6,
      boxShadow: '0 0 16px rgba(200,155,60,0.15)',
      position: 'relative',
    }}>
      {/* Crack line */}
      <div style={{
        position: 'absolute', width: 2, height: 50, background: 'var(--uv-bg)',
        transform: 'rotate(25deg)', borderRadius: 1,
      }} />
      <span style={{ color: 'var(--uv-text-on-gold)', fontSize: 28, fontWeight: 600, fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', position: 'relative' }}>UV</span>
    </div>
  );
}

function BrokenSealWithShield() {
  return (
    <div style={{ position: 'relative', width: 80, height: 80 }}>
      <BrokenSealGlyph />
      {/* Red shield overlay — double sting */}
      <div style={{
        position: 'absolute', bottom: -4, right: -4,
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--uv-danger)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '3px solid var(--uv-bg)',
        fontSize: 14,
      }}>
        <span>🛡️</span>
      </div>
    </div>
  );
}

function isAntiCause(destination: string): boolean {
  return antiCauses.some(c => destination.toLowerCase().includes(c.toLowerCase()));
}

function VowBrokenContent() {
  const router = useRouter();
  const params = useSearchParams();

  // Data from URL params (existing pattern preserved)
  const vowText = params.get('text') || 'Your vow';
  const amount = params.get('amount') || '0';
  const destination = params.get('destination') || 'charity';
  const witnessName = params.get('witness') || 'Your witness';
  const stakeDollars = parseInt(amount) || 0;
  const isAnti = isAntiCause(destination);
  const isZeroStake = stakeDollars === 0;

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--uv-bg)',
      backgroundImage: 'radial-gradient(ellipse at 50% 30%, rgba(248,113,113,0.06), var(--uv-bg) 70%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '100px 36px 40px', textAlign: 'center',
    }}>
      {/* Hero glyph */}
      <div style={{ marginBottom: 32 }}>
        {isAnti ? <BrokenSealWithShield /> : <BrokenSealGlyph />}
      </div>

      {/* Stamp */}
      <div style={{ marginBottom: 24 }}>
        <Stamp text="BROKEN" tone="muted-red" />
      </div>

      {/* H1 — honest, not mean */}
      <div style={{ marginBottom: 16 }}>
        <FrauncesH1 italic size="lg">
          {isAnti ? 'Brutal. You broke it.' : 'You broke it.'}
        </FrauncesH1>
      </div>

      {/* Sub */}
      <div style={{ marginBottom: 32, maxWidth: 320 }}>
        {isAnti && !isZeroStake ? (
          <p style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 18, fontWeight: 500,
            color: 'var(--uv-danger)', margin: 0,
          }}>
            ${stakeDollars} just went to <strong style={{ fontWeight: 600 }}>{destination}</strong>.
          </p>
        ) : (
          <FrauncesSub>
            {witnessName} confirmed. {isZeroStake
              ? 'The record stands.'
              : `The $${stakeDollars} is on its way to ${destination}.`
            }
          </FrauncesSub>
        )}
      </div>

      {/* Receipt card */}
      <div style={{ width: '100%', maxWidth: 340, marginBottom: 32 }}>
        <RitualCard compact>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--uv-font-sans)', fontSize: 13 }}>
            <span style={{ color: 'var(--uv-text-dim)' }}>Vow</span>
            <span style={{ color: 'var(--uv-text)', fontStyle: 'italic', fontFamily: 'var(--uv-font-serif)' }}>
              {vowText.length > 30 ? vowText.slice(0, 27) + '...' : vowText}
            </span>
          </div>
          {!isZeroStake && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--uv-font-sans)', fontSize: 13 }}>
              <span style={{ color: 'var(--uv-text-dim)' }}>
                {isAnti ? 'Went to' : 'Destination'}
              </span>
              <span style={{ color: isAnti ? 'var(--uv-danger)' : 'var(--uv-text)', fontWeight: 500 }}>
                ${stakeDollars} → {destination}
              </span>
            </div>
          )}
        </RitualCard>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Primary CTA — Bier-audit: one loud call, forward motion only */}
      <div style={{ width: '100%', maxWidth: 340 }}>
        <GoldCTA
          label={isAnti ? "Make a new vow — let's make this back →" : "Make a new vow →"}
          onPress={() => router.push('/')}
        />
      </div>
      {/* No secondary CTA — per §5.3/5.4: forward motion only */}
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

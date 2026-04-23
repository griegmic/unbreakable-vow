'use client';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FrauncesH1, FrauncesSub, GoldCTA, RitualCard, Stamp } from '@/components/primitives';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { antiCauses } from '@/lib/vow-logic';

/**
 * Outcome screens — Vow Kept
 *
 * M11: Charity destination — trophy, "You actually did it.", "Share your win →"
 * M11B: Cause-you-hate — shield, "Crisis averted.", "Tell everyone you saved $X from [cause] →"
 *
 * Bier-audit decision: ONE gold primary CTA + ONE text-link secondary (max).
 * KILLED: "Make another vow", "View your record", "Donate anyway"
 *
 * Canonical mocks: m11-vow-kept-charity.html, m11b-vow-kept-cause-you-hate.html
 */

// ── Bespoke hero glyphs (swap-ready — replace internals when SVGs arrive) ──

function TrophyGlyph() {
  return (
    <div style={{
      width: 80, height: 80, borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 30%, var(--uv-gold-bright), var(--uv-gold) 60%, var(--uv-gold-deep))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 24px var(--uv-gold-glow)',
      fontSize: 36,
    }}>
      <span style={{ color: 'var(--uv-text-on-gold)' }}>🏆</span>
    </div>
  );
}

function ShieldGlyph() {
  return (
    <div style={{
      width: 80, height: 80, borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 30%, var(--uv-gold-bright), var(--uv-gold) 50%, var(--uv-danger-deep))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 24px var(--uv-gold-glow)',
      fontSize: 36,
    }}>
      <span style={{ color: 'var(--uv-text-on-gold)' }}>🛡️</span>
    </div>
  );
}

function isAntiCause(destination: string): boolean {
  return antiCauses.some(c => destination.toLowerCase().includes(c.toLowerCase()));
}

function VowKeptContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { session } = useAuth();

  // Data from URL params (existing pattern preserved)
  const vowText = params.get('text') || 'Your vow';
  const amount = params.get('amount') || '0';
  const destination = params.get('destination') || '';
  const witnessName = params.get('witness') || 'Your witness';
  const stakeDollars = parseInt(amount) || 0;
  const isAnti = isAntiCause(destination);
  const isZeroStake = stakeDollars === 0;

  // Streak fetch (preserved from existing code)
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

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--uv-bg)',
      backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(200,155,60,0.08), var(--uv-bg) 70%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '100px 36px 40px', textAlign: 'center',
    }}>
      {/* Hero glyph */}
      <div className="animate-seal-pop-in" style={{ marginBottom: 32 }}>
        {isAnti ? <ShieldGlyph /> : <TrophyGlyph />}
      </div>

      {/* H1 */}
      <div style={{ marginBottom: 16 }}>
        <FrauncesH1 italic size="lg">
          {isAnti ? 'Crisis averted.' : 'You actually did it.'}
        </FrauncesH1>
      </div>

      {/* Sub — different for M11 vs M11B */}
      <div style={{ marginBottom: 8, maxWidth: 320 }}>
        {isAnti ? (
          <>
            <p style={{
              fontFamily: 'var(--uv-font-serif)', fontSize: 22, fontWeight: 500,
              color: 'var(--uv-gold-bright)', margin: '0 0 8px',
            }}>
              You saved ${stakeDollars} from {destination}.
            </p>
            <FrauncesSub>
              {witnessName} confirmed. Not a single dollar left your wallet.
            </FrauncesSub>
          </>
        ) : (
          <FrauncesSub>
            {witnessName} confirmed. Your word is gold.
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
              <span style={{ color: 'var(--uv-text-dim)' }}>Money</span>
              <span style={{ color: 'var(--uv-success)', fontWeight: 500 }}>${stakeDollars} returned ✓</span>
            </div>
          )}
          {isAnti && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--uv-font-sans)', fontSize: 13 }}>
              <span style={{ color: 'var(--uv-text-dim)' }}>Saved from</span>
              <span style={{ color: 'var(--uv-danger)', fontWeight: 500 }}>{destination}</span>
            </div>
          )}
          {streak !== null && streak > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--uv-font-sans)', fontSize: 13 }}>
              <span style={{ color: 'var(--uv-text-dim)' }}>Streak</span>
              <span style={{ color: 'var(--uv-gold)', fontWeight: 500 }}>{streak} vows kept</span>
            </div>
          )}
        </RitualCard>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Primary CTA — Bier-audit: one loud call */}
      <div style={{ width: '100%', maxWidth: 340 }}>
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
      <button
        onClick={() => isAnti ? router.push('/') : router.push('/cast')}
        style={{
          marginTop: 18, background: 'none', border: 'none',
          fontFamily: 'var(--uv-font-sans)', fontSize: 13, lineHeight: 1.2,
          color: 'var(--uv-text-dim)', cursor: 'pointer', padding: 0,
        }}
      >
        {isAnti ? 'Make another vow →' : 'Dare a friend'}
      </button>
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

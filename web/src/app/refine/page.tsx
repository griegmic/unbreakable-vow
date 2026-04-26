'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoldCTA, MutedSecondary } from '@/components/primitives';
import { useVowFlow } from '@/providers/vow-flow';
import { generateSuggestion, getContextualSuggestions } from '@/lib/vow-logic';

/**
 * S2 -- Refine nudge (bottom-sheet overlay)
 *
 * Rebuilt to match mock: design-alignment/v1v2/flow/html/02-refine-nudge.html
 *
 * Layout: faux-dimmed home behind + dark backdrop + bottom-positioned sheet.
 * Standalone page styled as a bottom-sheet overlay (not a real overlay on home).
 *
 * Headline override (Joey-approved): "Is this specific enough?"
 * (Mock says "Will Nick know if you did it?" but witness name isn't available here.)
 * Documented in SCREEN-FEATURE-SCOPE.md.
 *
 * State machine: mount -> populate suggestion -> user tightens or keeps -> push /stake
 * All handlers preserved from pre-V6 implementation.
 */

export default function RefinePage() {
  const router = useRouter();
  const { vow, setRefinedText } = useVowFlow();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!vow.rawInput) {
      router.replace('/');
      return;
    }
    setInput(generateSuggestion(vow.rawInput));
    setSuggestions(getContextualSuggestions(vow.rawInput));
  }, [vow.rawInput, router]);

  const handleTighten = () => {
    if (!input.trim()) return;
    setRefinedText(input.trim());
    router.push('/stake');
  };

  const handleKeepAsIs = () => {
    setRefinedText(vow.rawInput);
    router.push('/stake');
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100dvh',
        overflow: 'hidden',
        background: 'var(--uv-bg)',
      }}
    >
      {/* ── Faux home content (dimmed behind) ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '54px 28px',
          opacity: 0.18,
          filter: 'blur(2px)',
          pointerEvents: 'none',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontWeight: 450,
            fontSize: 48,
            lineHeight: 1.04,
            letterSpacing: '-0.015em',
            color: 'var(--uv-text)',
            marginTop: 100,
          }}
        >
          Make a vow.<br />
          <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>Mean it.</em>
        </h1>
        <div
          style={{
            color: 'var(--uv-text-muted)',
            marginTop: 16,
            maxWidth: 320,
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 15,
          }}
        >
          Tell a friend. Put money on it.
        </div>
        <div
          style={{
            marginTop: 36,
            paddingBottom: 12,
            borderBottom: '1px solid var(--uv-gold-line)',
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 21,
            color: 'var(--uv-text)',
          }}
        >
          {vow.rawInput || 'be better'}
        </div>
      </div>

      {/* ── Backdrop overlay ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15,13,10,0.72)',
        }}
      />

      {/* ── Bottom sheet ── */}
      <div
        className="animate-slide-up"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 24,
          background: 'var(--uv-bg-card)',
          border: '1px solid var(--uv-gold-line)',
          borderRadius: 18,
          padding: '28px 26px 26px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            minHeight: 40,
            minWidth: 48,
            border: 'none',
            background: 'transparent',
            color: 'var(--uv-text-muted)',
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 13,
            fontWeight: 650,
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
          }}
        >
          &larr; Back
        </button>
        {/* Drag handle */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 32,
            height: 3,
            borderRadius: 2,
            background: 'var(--uv-border-soft)',
          }}
        />

        {/* ? glyph */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid var(--uv-gold-line)',
            background: 'var(--uv-gold-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--uv-font-serif)',
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--uv-gold)',
            margin: '6px auto 18px',
          }}
        >
          ?
        </div>

        {/* Headline -- Joey override: "Is this specific enough?" */}
        <div
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontWeight: 450,
            fontVariationSettings: '"opsz" 120, "SOFT" 24',
            fontSize: 24,
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            textAlign: 'center',
            marginBottom: 14,
          }}
        >
          Is this specific enough?
        </div>

        {/* Body */}
        <div
          style={{
            fontSize: 13.5,
            lineHeight: 1.5,
            color: 'var(--uv-text-muted)',
            textAlign: 'center',
            margin: '0 4px 8px',
            fontFamily: 'var(--uv-font-sans)',
          }}
        >
          Vows work best when there&rsquo;s no room to argue.
        </div>

        {/* Before / after example */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            margin: '0 auto 22px',
            width: 'fit-content',
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 13.5,
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--uv-text-muted)', opacity: 0.5 }}>&#x2717;</span>
            <span
              style={{
                color: 'var(--uv-text-muted)',
                opacity: 0.5,
                textDecoration: 'line-through',
                fontStyle: 'italic',
              }}
            >
              &ldquo;Get healthier&rdquo;
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--uv-gold)' }}>&#x2713;</span>
            <span
              style={{
                color: 'var(--uv-gold)',
                fontWeight: 600,
              }}
            >
              &ldquo;Run a 5K by Sunday&rdquo;
            </span>
          </div>
        </div>

        {/* Quoted vow */}
        <div
          style={{
            background: 'var(--uv-bg-elevated)',
            borderLeft: '2px solid var(--uv-gold)',
            borderRadius: 2,
            padding: '12px 14px',
            marginBottom: 22,
            fontFamily: 'var(--uv-font-serif)',
            fontStyle: 'italic',
            fontSize: 16,
            color: 'var(--uv-text)',
            lineHeight: 1.4,
          }}
        >
          <span
            style={{
              display: 'block',
              fontFamily: 'var(--uv-font-sans)',
              fontStyle: 'normal',
              fontSize: 9.5,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'var(--uv-gold)',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Your vow
          </span>
          &ldquo;{vow.rawInput}&rdquo;
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <GoldCTA
            label="Tighten it"
            onPress={handleTighten}
            disabled={!input.trim()}
          />
          <MutedSecondary
            label="Keep it as-is"
            onPress={handleKeepAsIs}
          />
        </div>
      </div>
    </div>
  );
}

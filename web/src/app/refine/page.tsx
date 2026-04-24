'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { RitualScreen, FrauncesH1, FrauncesSub, GoldCTA, OutlinedGoldCTA, RadioCard } from '@/components/primitives';
import { useVowFlow } from '@/providers/vow-flow';
import { generateSuggestion, getContextualSuggestions } from '@/lib/vow-logic';

/**
 * S2 · Refine nudge — §3.3
 *
 * Shown when analyzeVow() flags vagueness. Layout per V6 spec:
 *   H1: "Sharpen your vow" (kept per FLAG 1 — spec copy requires witness name)
 *   Raw input as italic Fraunces subject line
 *   Editable sharpened-vow textarea
 *   RadioCards for alternative suggestions
 *   GoldCTA "Use this vow →" / OutlinedGoldCTA "Keep my original"
 *
 * State machine: mount → populate suggestions → user edits/selects → push /stake
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

  const handleSubmit = () => {
    if (!input.trim()) return;
    setRefinedText(input.trim());
    router.push('/stake');
  };

  const handleKeepOriginal = () => {
    setRefinedText(vow.rawInput);
    router.push('/stake');
  };

  return (
    <RitualScreen variant="utility">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
        {/* Back */}
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          style={{
            background: 'none', border: 'none',
            color: 'var(--uv-text-muted)', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--uv-font-sans)',
            padding: '4px 0', alignSelf: 'flex-start',
          }}
        >
          &larr; Back
        </button>

        {/* H1 — kept as-is per FLAG 1 */}
        <FrauncesH1 italic size="lg">Sharpen your vow.</FrauncesH1>

        {/* Raw input — italic Fraunces subject line per FLAG 3 */}
        <div style={{
          background: 'var(--uv-bg-elevated)',
          borderLeft: '2px solid var(--uv-gold)',
          borderRadius: 2,
          padding: '12px 14px',
        }}>
          <span style={{
            fontFamily: 'var(--uv-font-sans)', fontStyle: 'normal',
            fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase' as const,
            color: 'var(--uv-gold)', fontWeight: 500,
            display: 'block', marginBottom: 6,
          }}>
            Your vow
          </span>
          <FrauncesSub>&ldquo;{vow.rawInput}&rdquo;</FrauncesSub>
        </div>

        {/* Editable sharpened vow */}
        <div style={{
          borderRadius: 18, padding: 20,
          display: 'flex', flexDirection: 'column', gap: 10,
          background: 'var(--uv-bg-card)',
          border: '1.5px solid var(--uv-gold-line)',
          boxShadow: '0 0 24px var(--uv-gold-glow)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles style={{ width: 14, height: 14, color: 'var(--uv-gold)' }} />
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 700,
              letterSpacing: '1.3px', textTransform: 'uppercase' as const,
              color: 'var(--uv-gold)',
            }}>
              Sharpened vow
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'transparent', border: 'none', outline: 'none',
              resize: 'vertical',
              fontFamily: 'var(--uv-font-serif)', fontSize: 18,
              lineHeight: '26px', color: 'var(--uv-text)',
            }}
          />
        </div>

        {/* Alternative suggestions as RadioCards per FLAG 2 */}
        {suggestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 12, fontWeight: 500,
              color: 'var(--uv-text-muted)',
            }}>
              Or try one of these
            </span>
            {suggestions.map((s) => (
              <RadioCard
                key={s}
                label={s}
                selected={input === s}
                onPress={() => setInput(s)}
              />
            ))}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: 12 }} />

        {/* CTAs */}
        <GoldCTA
          label="Use this vow →"
          onPress={handleSubmit}
          disabled={!input.trim()}
        />
        <OutlinedGoldCTA
          label="Keep my original"
          onPress={handleKeepOriginal}
        />
      </div>
    </RitualScreen>
  );
}

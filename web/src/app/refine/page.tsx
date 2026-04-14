'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Lightbulb } from 'lucide-react';
import { RitualScreen, BackButton, PrimaryButton, FadeUp } from '@/components/ui';
import { useVowFlow } from '@/providers/vow-flow';
import { generateSuggestion, getContextualSuggestions } from '@/lib/vow-logic';

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
    <RitualScreen
      footer={
        <PrimaryButton label="Use this vow →" onPress={handleSubmit} disabled={!input.trim()} />
      }
    >
      <FadeUp>
        <BackButton />
      </FadeUp>

      <FadeUp delay={0.05}>
        <div className="flex flex-col gap-1">
          <h1 className="text-[32px] font-bold font-serif leading-[36px] tracking-[-0.5px]" style={{ color: 'var(--text)' }}>
            Sharpen your vow
          </h1>
          <p className="text-[15px] leading-[22px]" style={{ color: 'var(--text-secondary)' }}>
            We tightened the wording so your witness knows exactly what to judge.
          </p>
        </div>
      </FadeUp>

      {/* "Before" — small muted reference to what they typed */}
      <FadeUp delay={0.08}>
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold tracking-[0.5px] uppercase shrink-0" style={{ color: 'var(--text-muted)' }}>
            You wrote
          </span>
          <span className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            &ldquo;{vow.rawInput}&rdquo;
          </span>
        </div>
      </FadeUp>

      {/* Hero: the editable sharpened vow */}
      <FadeUp delay={0.14}>
        <div
          className="rounded-[22px] p-5 flex flex-col gap-2.5"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1.5px solid rgba(212,162,79,0.35)',
            boxShadow: '0 0 24px rgba(212,162,79,0.06)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
            <label className="text-[11px] font-bold tracking-[1.3px] uppercase" style={{ color: 'var(--gold)' }}>
              SHARPENED VOW
            </label>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            autoFocus
            className="bg-transparent text-[18px] font-serif outline-none resize-none leading-[26px]"
            style={{ color: 'var(--text)' }}
          />
        </div>
      </FadeUp>

      {/* Alternative suggestions as compact chips */}
      {suggestions.length > 0 && (
        <FadeUp delay={0.2}>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>Or try one of these</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left px-3.5 py-2.5 rounded-full transition-colors"
                  style={{
                    backgroundColor: input === s ? 'rgba(212,162,79,0.10)' : 'var(--surface)',
                    border: `1px solid ${input === s ? 'rgba(212,162,79,0.30)' : 'var(--border)'}`,
                  }}
                >
                  <span
                    className="text-[13px]"
                    style={{ color: input === s ? 'var(--gold-bright)' : 'var(--text-secondary)' }}
                  >
                    {s}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </FadeUp>
      )}

      {/* Escape hatch — text link, not a button */}
      <FadeUp delay={0.25}>
        <button
          onClick={handleKeepOriginal}
          className="text-center w-full py-2"
        >
          <span className="text-[13px] underline decoration-dotted underline-offset-4" style={{ color: 'var(--text-muted)' }}>
            Keep my original
          </span>
        </button>
      </FadeUp>
    </RitualScreen>
  );
}

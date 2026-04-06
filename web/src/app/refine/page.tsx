'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb, Target, Clock, CheckCircle } from 'lucide-react';
import { RitualScreen, BackButton, TitleBlock, RitualCard, VowPreview, PrimaryButton, SecondaryButton, FadeUp } from '@/components/ui';
import { useVowFlow } from '@/providers/vow-flow';
import { generateSuggestion, getContextualSuggestions, analyzeVow } from '@/lib/vow-logic';

export default function RefinePage() {
  const router = useRouter();
  const { vow, setRefinedText } = useVowFlow();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

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
    const analysis = analyzeVow(input.trim());
    if (analysis.type === 'vague') {
      setError('Try adding a number and a time window.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setError('');
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
        <>
          <PrimaryButton label="Use this vow →" onPress={handleSubmit} disabled={!input.trim()} />
          <SecondaryButton label="Keep my original wording" onPress={handleKeepOriginal} />
        </>
      }
    >
      <FadeUp>
        <BackButton />
      </FadeUp>

      <FadeUp delay={0.05}>
        <TitleBlock
          title="Make it stick"
          subtitle="Your witness calls it 'kept' or 'broken' — make it clear."
        />
      </FadeUp>

      <FadeUp delay={0.1}>
        <VowPreview text={vow.rawInput} />
      </FadeUp>

      <FadeUp delay={0.15}>
        <RitualCard>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Strong vows have:</span>
          <div className="flex flex-col gap-2.5">
            {[
              { icon: Target, text: 'A clear action' },
              { icon: CheckCircle, text: 'A finish line' },
              { icon: Clock, text: 'A time window' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--gold)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>
        </RitualCard>
      </FadeUp>

      <FadeUp delay={0.2}>
        <div
          className={`rounded-[22px] p-4 flex flex-col gap-2 ${shake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}
          style={{ backgroundColor: 'var(--surface)', border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}` }}
        >
          <label className="text-[11px] font-bold tracking-[1.3px] uppercase" style={{ color: 'var(--gold)' }}>
            YOUR VOW
          </label>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            rows={3}
            className="bg-transparent text-[17px] outline-none resize-none"
            style={{ color: 'var(--text)' }}
          />
          {error && <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
      </FadeUp>

      {suggestions.length > 0 && (
        <FadeUp delay={0.25}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>Or try one of these</span>
              <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
            </div>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(s); setError(''); }}
                className="text-left p-3.5 rounded-[14px] transition-colors"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <Lightbulb className="w-4 h-4 shrink-0" style={{ color: 'var(--gold)' }} />
                  <span className="text-[14px] font-serif" style={{ color: 'var(--text)' }}>{s}</span>
                </div>
              </button>
            ))}
          </div>
        </FadeUp>
      )}
    </RitualScreen>
  );
}

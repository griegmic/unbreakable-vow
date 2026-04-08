'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, User } from 'lucide-react';
import { RitualScreen, HeaderBadge, PrimaryButton, FadeUp } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';
import { vowExamples, analyzeVow } from '@/lib/vow-logic';

export default function HomePage() {
  const router = useRouter();
  const { setRawInput, setRefinedText } = useVowFlow();
  const { isAuthenticated, loading } = useAuth();
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  if (!loading && isAuthenticated) {
    return (
      <RitualScreen>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
        </div>
      </RitualScreen>
    );
  }

  const handleContinue = () => {
    if (!input.trim()) return;
    setRawInput(input.trim());
    const analysis = analyzeVow(input.trim());
    if (analysis.type === 'already_good' || vowExamples.includes(input.trim())) {
      setRefinedText(input.trim());
      router.push('/stake');
    } else {
      router.push('/refine');
    }
  };

  const handleChip = (example: string) => {
    setInput(example);
  };

  return (
    <RitualScreen
      footer={
        <PrimaryButton
          label="Set the terms"
          onPress={handleContinue}
          disabled={!input.trim()}
        />
      }
    >
      <FadeUp>
        <div className="flex items-center justify-between">
          <HeaderBadge />
          {isAuthenticated && (
            <button
              onClick={() => router.push('/settings')}
              aria-label="Account settings"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:opacity-80"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <User className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        <div className="flex flex-col gap-1 mt-2">
          <h1 className="text-[40px] font-bold font-serif leading-[44px] tracking-[-1px]" style={{ color: 'var(--text)' }}>
            Make a vow.
          </h1>
          <h1
            className="text-[40px] font-bold font-serif leading-[44px] tracking-[-1px]"
            style={{ color: 'var(--gold)', textShadow: '0 0 40px rgba(212,162,79,0.3)' }}
          >
            Mean it.
          </h1>
          <p className="text-[15px] leading-[23px] mt-2 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
            {'Make a vow to a friend. Put money on it.\nBreak it, it goes to charity.'}
          </p>
        </div>
      </FadeUp>

      <FadeUp delay={0.2}>
        <div
          className="rounded-[22px] p-4 flex flex-col gap-3"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 16px 28px rgba(0,0,0,0.26)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
            <span className="text-[11px] font-bold tracking-[1.3px] uppercase" style={{ color: 'var(--gold)' }}>
              YOUR UNBREAKABLE VOW
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleContinue();
              }
            }}
            placeholder="No phone in bed all week"
            rows={2}
            className="bg-transparent text-[17px] outline-none resize-none"
            style={{ color: 'var(--text)' }}
          />
        </div>
      </FadeUp>

      <FadeUp delay={0.3}>
        <div className="flex flex-wrap">
          {vowExamples.map((example) => (
            <button
              key={example}
              onClick={() => handleChip(example)}
              className="px-3.5 py-[11px] rounded-full mr-2 mb-2 transition-colors"
              style={{
                backgroundColor: input === example ? 'rgba(212,162,79,0.12)' : 'var(--surface)',
                border: `1px solid ${input === example ? 'var(--border-strong)' : 'var(--border)'}`,
              }}
            >
              <span
                className="text-[13px] font-medium"
                style={{ color: input === example ? 'var(--gold-bright)' : 'var(--text-secondary)' }}
              >
                {example}
              </span>
            </button>
          ))}
        </div>
      </FadeUp>
    </RitualScreen>
  );
}

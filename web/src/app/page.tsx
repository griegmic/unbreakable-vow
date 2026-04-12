'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { RitualScreen, HeaderBadge, PrimaryButton, FadeUp } from '@/components/ui';
import { AuthModal } from '@/components/auth-modal';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { HamburgerMenu } from '@/components/hamburger-menu';
import { useVowFlow } from '@/providers/vow-flow';
import { vowExamples, analyzeVow } from '@/lib/vow-logic';

export default function HomePage() {
  const router = useRouter();
  const { setRawInput, setRefinedText, setWitnessName } = useVowFlow();
  const { isAuthenticated, loading, session } = useAuth();
  const [input, setInput] = useState('');
  const [isNewFlow, setIsNewFlow] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const inlineAuthRef = useRef(false);

  // Pre-fill witness name from URL params (e.g. /?ref=witness&from=Joey)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromName = params.get('from');
    if (fromName) {
      setWitnessName(decodeURIComponent(fromName));
    }
  }, [setWitnessName]);

  useEffect(() => {
    async function redirectIfAuthenticated() {
      const params = new URLSearchParams(window.location.search);

      // ?new=1 forces a fresh creation flow (used by viral CTAs)
      // ?guided=1 forces the full guided flow for returning users
      if (params.get('new') === '1' || params.get('guided') === '1') {
        localStorage.removeItem('unbreakable-vow-flow');
        setIsNewFlow(true);
        window.history.replaceState({}, '', '/');
        return; // Stay on creation page
      }

      // If we just came from auth, use the stored return path (don't race with handleAuthSuccess)
      try {
        const returnPath = localStorage.getItem('auth-return-path');
        if (returnPath) {
          localStorage.removeItem('auth-return-path');
          router.replace(returnPath);
          return;
        }
      } catch {}

      // Don't redirect to dashboard if user has an in-progress vow creation
      try {
        const flow = localStorage.getItem('unbreakable-vow-flow');
        if (flow) {
          const parsed = JSON.parse(flow);
          if (parsed.rawInput) {
            // Resume the vow flow where they left off
            router.replace(parsed.vowId ? '/live' : parsed.refinedText ? '/stake' : '/refine');
            return;
          }
        }
      } catch {}

      // Check if user has an active vow — if so, go to /live instead of /dashboard
      const { data: activeVow } = await supabase
        .from('vows')
        .select('id')
        .eq('user_id', session!.user.id)
        .in('status', ['sealed', 'active', 'awaiting_verdict'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (activeVow) {
        router.replace('/live');
      } else {
        router.replace('/dashboard');
      }
    }
    if (!loading && isAuthenticated && !inlineAuthRef.current) {
      redirectIfAuthenticated();
    }
  }, [isAuthenticated, loading, router, session]);

  // Show loading spinner only when redirecting (not when ?new=1 keeps us on creation page)
  if (!loading && isAuthenticated && !isNewFlow && !inlineAuthRef.current) {
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
    const trimmed = input.trim();
    setRawInput(trimmed);

    // Determine destination: good vows skip /refine, vague ones go there
    const isGoodVow = analyzeVow(trimmed).type === 'already_good' || vowExamples.includes(trimmed);
    const destination = isGoodVow ? '/stake' : '/refine';

    // If vow is good, also set refinedText so downstream pages have it
    if (isGoodVow) {
      setRefinedText(trimmed);
    }

    // Unauthenticated first-time users: auth → then route to destination
    if (!isAuthenticated) {
      try {
        localStorage.setItem('auth-return-path', destination);
        document.cookie = `auth_return_path=${encodeURIComponent(destination)};path=/;max-age=600;SameSite=Lax`;
      } catch {}
      inlineAuthRef.current = true;
      setShowAuth(true);
      return;
    }

    // Authenticated returning users: go directly
    router.push(destination);
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    inlineAuthRef.current = false;
    // Read the destination we stored before auth
    let dest = '/refine';
    try {
      const stored = localStorage.getItem('auth-return-path');
      if (stored) {
        dest = stored;
        localStorage.removeItem('auth-return-path');
      }
    } catch {}
    router.push(dest);
  };

  const handleChip = (example: string) => {
    setInput(example);
  };

  return (
    <RitualScreen
      footer={
        <PrimaryButton
          label="I'm in"
          onPress={handleContinue}
          disabled={!input.trim()}
        />
      }
    >
      <FadeUp>
        <div className="flex items-center justify-between">
          <HeaderBadge />
          {isAuthenticated && <HamburgerMenu />}
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
        <div className="flex flex-wrap gap-[7px]">
          {vowExamples.map((example) => (
            <button
              key={example}
              onClick={() => handleChip(example)}
              className="px-3 py-2 rounded-full transition-colors"
              style={{
                backgroundColor: input === example ? 'rgba(212,162,79,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${input === example ? 'rgba(212,162,79,0.3)' : 'var(--border)'}`,
              }}
            >
              <span
                className="text-[12px] font-medium"
                style={{ color: input === example ? 'var(--gold-bright)' : 'var(--text-secondary)' }}
              >
                {example}
              </span>
            </button>
          ))}
        </div>
      </FadeUp>

      <AuthModal
        visible={showAuth}
        onDismiss={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
      />
    </RitualScreen>
  );
}

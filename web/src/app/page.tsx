'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { SecondaryButton } from '@/components/uv/SecondaryButton';
import { AuthModal } from '@/components/auth-modal';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { HamburgerMenu } from '@/components/hamburger-menu';
import { useVowFlow } from '@/providers/vow-flow';

const FEED_ROWS = [
  { text: 'Gym 3x this week', amount: 50 },
  { text: 'Out of bed by 8am, 7 days', amount: 10 },
  { text: 'No alcohol, 2 weeks', amount: 25 },
  { text: 'No texting my ex, 30 days', amount: 75 },
  { text: 'Delete TikTok for a week', amount: 25 },
];

function CeremonyOverlay({ onComplete }: { onComplete: () => void }) {
  const [screen, setScreen] = useState<1 | 2>(1);

  if (screen === 1) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'var(--uv-bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          gap: 32,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 36,
            fontWeight: 500,
            color: 'var(--uv-text)',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          Words are cheap.
        </h1>
        <p
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 15,
            color: 'var(--uv-text-muted)',
            textAlign: 'center',
            maxWidth: 280,
            lineHeight: 1.5,
          }}
        >
          You make promises all the time. To yourself. To others. How many have you actually kept?
        </p>
        <PrimaryButton onClick={() => setScreen(2)}>Continue</PrimaryButton>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--uv-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 32,
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--uv-font-serif)',
          fontSize: 36,
          fontWeight: 500,
          color: 'var(--uv-gold)',
          textAlign: 'center',
          lineHeight: 1.2,
          fontStyle: 'italic',
        }}
      >
        This is different.
      </h1>
      <p
        style={{
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 15,
          color: 'var(--uv-text-muted)',
          textAlign: 'center',
          maxWidth: 300,
          lineHeight: 1.5,
        }}
      >
        An Unbreakable Vow has stakes. A witness. A deadline. Break it, and your money goes to charity. Keep it, and you prove you meant it.
      </p>
      <PrimaryButton
        onClick={() => {
          try { localStorage.setItem('uv_ceremony_seen', '1'); } catch {}
          onComplete();
        }}
      >
        I understand
      </PrimaryButton>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { setRawInput, setRefinedText, setWitnessName } = useVowFlow();
  const { isAuthenticated, loading, session } = useAuth();
  const [isNewFlow, setIsNewFlow] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showCeremony, setShowCeremony] = useState(false);
  const inlineAuthRef = useRef(false);

  // Check ceremony on mount
  useEffect(() => {
    try {
      if (localStorage.getItem('uv_ceremony_seen') !== '1') {
        setShowCeremony(true);
      }
    } catch {}
  }, []);

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
        return;
      }

      // If we just came from auth, use the stored return path
      try {
        const cookieMatch = document.cookie.match(/(?:^|;\s*)auth_return_path=([^;]*)/);
        if (cookieMatch) {
          const cookiePath = decodeURIComponent(cookieMatch[1]);
          document.cookie = 'auth_return_path=; path=/; max-age=0';
          if (cookiePath && cookiePath !== '/') {
            router.replace(cookiePath);
            return;
          }
        }
      } catch {}
      try {
        const challengeMatch = document.cookie.match(/(?:^|;\s*)challenge_pending_backup=([^;]*)/);
        if (challengeMatch) {
          const challengeData = decodeURIComponent(challengeMatch[1]);
          const parsed = JSON.parse(challengeData);
          if (parsed.token) {
            localStorage.setItem('challenge-pending-state', challengeData);
            document.cookie = 'challenge_pending_backup=; path=/; max-age=0';
            router.replace(`/c/${parsed.token}`);
            return;
          }
        }
      } catch {}
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
            if (parsed.witnessName && parsed.stake) { router.replace('/seal'); return; }
            if (parsed.refinedText) { router.replace('/stake'); return; }
            router.replace('/refine');
            return;
          }
        }
      } catch {}

      // Check if user has an active vow
      const { data: activeVow } = await supabase
        .from('vows')
        .select('id')
        .eq('user_id', session!.user.id)
        .in('status', ['sealed', 'active', 'awaiting_verdict'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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

  // Loading state while redirecting
  if (!loading && isAuthenticated && !isNewFlow && !inlineAuthRef.current) {
    return (
      <RitualScreen>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '2px solid var(--uv-gold)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'uv-spin 600ms linear infinite',
            }}
          />
          <style>{`@keyframes uv-spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </RitualScreen>
    );
  }

  if (showCeremony) {
    return <CeremonyOverlay onComplete={() => setShowCeremony(false)} />;
  }

  const handleMakeVow = () => {
    if (!isAuthenticated) {
      try {
        localStorage.setItem('auth-return-path', '/create');
        document.cookie = `auth_return_path=${encodeURIComponent('/create')};path=/;max-age=600;SameSite=Lax`;
      } catch {}
      inlineAuthRef.current = true;
      setShowAuth(true);
      return;
    }
    router.push('/create');
  };

  const handleDare = () => {
    if (!isAuthenticated) {
      try {
        localStorage.setItem('auth-return-path', '/cast');
        document.cookie = `auth_return_path=${encodeURIComponent('/cast')};path=/;max-age=600;SameSite=Lax`;
      } catch {}
      inlineAuthRef.current = true;
      setShowAuth(true);
      return;
    }
    router.push('/cast');
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    inlineAuthRef.current = false;
    let dest = '/create';
    try {
      const stored = localStorage.getItem('auth-return-path');
      if (stored) {
        dest = stored;
        localStorage.removeItem('auth-return-path');
      }
    } catch {}
    router.push(dest);
  };

  return (
    <RitualScreen>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <HamburgerMenu />
      </div>

      {/* Hero */}
      <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 42,
            fontWeight: 500,
            color: 'var(--uv-text)',
            lineHeight: 1.1,
            letterSpacing: '-1px',
          }}
        >
          You say a lot.
        </h1>
        <h1
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 42,
            fontWeight: 500,
            fontStyle: 'italic',
            color: 'var(--uv-gold)',
            lineHeight: 1.1,
            letterSpacing: '-1px',
          }}
        >
          This time vow it.
        </h1>
        <p
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 15,
            color: 'var(--uv-text-muted)',
            marginTop: 12,
            lineHeight: 1.5,
          }}
        >
          Put $$ on a goal. A friend decides if you pulled it off.
        </p>
      </div>

      {/* Live feed */}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1.5px',
              textTransform: 'uppercase' as const,
              color: 'var(--uv-text-muted)',
              fontFamily: 'var(--uv-font-sans)',
            }}
          >
            THIS WEEK
          </span>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--uv-status-active)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: 'var(--uv-status-active)',
              fontFamily: 'var(--uv-font-sans)',
              fontWeight: 500,
            }}
          >
            Live
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {FEED_ROWS.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 0',
                borderBottom: i < FEED_ROWS.length - 1 ? '1px solid var(--uv-border-strong)' : 'none',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: 'var(--uv-text)',
                  fontFamily: 'var(--uv-font-sans)',
                }}
              >
                {row.text}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: 'var(--uv-gold)',
                  fontFamily: 'var(--uv-font-sans)',
                  fontWeight: 600,
                }}
              >
                ${row.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <PrimaryButton onClick={handleMakeVow}>Make your vow &rarr;</PrimaryButton>
        <SecondaryButton onClick={handleDare}>Dare a friend &rarr;</SecondaryButton>
      </div>

      <AuthModal
        visible={showAuth}
        onDismiss={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
      />
    </RitualScreen>
  );
}

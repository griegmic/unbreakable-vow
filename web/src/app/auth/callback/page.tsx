'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    (async () => {
      // Dynamic import so supabase is never evaluated during static build
      const { supabase } = await import('@/lib/supabase');

      // Restore vow flow state from cookie → localStorage (Safari wipes localStorage during OAuth)
      try {
        const flowMatch = document.cookie.match(/(?:^|;\s*)vow_flow_backup=([^;]*)/);
        if (flowMatch) {
          const flowData = decodeURIComponent(flowMatch[1]);
          document.cookie = 'vow_flow_backup=; path=/; max-age=0';
          const existing = localStorage.getItem('unbreakable-vow-flow');
          if (!existing || !JSON.parse(existing).rawInput) {
            localStorage.setItem('unbreakable-vow-flow', flowData);
          }
        }
      } catch {}

      // Restore challenge pending state from cookie → localStorage (same Safari issue)
      // Also extract the challenge token to use as a redirect fallback —
      // if auth_return_path cookie AND return_to URL param both fail,
      // this ensures we can still route back to /c/{token}
      try {
        const challengeMatch = document.cookie.match(/(?:^|;\s*)challenge_pending_backup=([^;]*)/);
        if (challengeMatch) {
          const challengeData = decodeURIComponent(challengeMatch[1]);
          // Don't clear the cookie here — let client.tsx consume it as fallback
          localStorage.setItem('challenge-pending-state', challengeData);
          const parsed = JSON.parse(challengeData);
          if (parsed.token && !localStorage.getItem('auth-return-path')) {
            localStorage.setItem('auth-return-path', `/c/${parsed.token}`);
          }
        }
      } catch {}

      // Determine where to send the user after auth.
      // Priority: cookie (survives cross-origin OAuth in Safari)
      //         → URL query param
      //         → localStorage
      //         → vow flow state check
      //         → dashboard
      const redirectTo = (() => {
        // 1. Check cookie (most reliable — survives Safari cross-origin wipes)
        try {
          const match = document.cookie.match(/(?:^|;\s*)auth_return_path=([^;]*)/);
          if (match) {
            const cookiePath = decodeURIComponent(match[1]);
            // Clear the cookie
            document.cookie = 'auth_return_path=; path=/; max-age=0';
            if (cookiePath && cookiePath !== '/') return cookiePath;
          }
        } catch {}

        // 2. Check URL query param
        try {
          const params = new URLSearchParams(window.location.search);
          const urlReturn = params.get('return_to');
          if (urlReturn && urlReturn !== '/') return urlReturn;
        } catch {}

        try {
          // 3. Check localStorage
          const returnPath = localStorage.getItem('auth-return-path');
          localStorage.removeItem('auth-return-path');
          if (returnPath && returnPath !== '/') return returnPath;
        } catch {}

        try {
          // 4. Check sessionStorage (survives same-tab navigation)
          const sessionReturn = sessionStorage.getItem('auth-return-path');
          sessionStorage.removeItem('auth-return-path');
          if (sessionReturn && sessionReturn !== '/') return sessionReturn;
        } catch {}

        try {
          // 5. Check for in-progress vow flow — if user has vow data, send to /seal
          const stored = localStorage.getItem('unbreakable-vow-flow');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.rawInput) return '/seal';
          }
        } catch {}
        return '/dashboard';
      })();

      const handleCallback = async () => {
        // Try PKCE code exchange first (if ?code= present)
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (!exchangeError && data.session) {
              router.replace(redirectTo);
              return;
            }
            if (exchangeError) console.error('[auth/callback] Code exchange failed:', exchangeError.message);
          } catch (e) {
            console.error('[auth/callback] Code exchange threw:', e);
          }
        }

        // Poll for session — handles implicit flow (#access_token) and
        // cases where detectSessionInUrl processes the hash asynchronously
        const maxAttempts = 15;
        for (let i = 0; i < maxAttempts; i++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace(redirectTo);
            return;
          }
          await new Promise(r => setTimeout(r, 500));
        }

        setError('Sign-in timed out. Redirecting...');
        setTimeout(() => router.replace('/'), 2000);
      };

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          router.replace(redirectTo);
        }
      });
      subscription = data.subscription;

      handleCallback();
    })();

    return () => {
      subscription?.unsubscribe();
    };
  }, [router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col items-center gap-4">
        {error ? (
          <p className="text-sm text-center max-w-[280px]" style={{ color: 'var(--danger)' }}>{error}</p>
        ) : (
          <>
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Signing you in...</p>
          </>
        )}
      </div>
    </div>
  );
}

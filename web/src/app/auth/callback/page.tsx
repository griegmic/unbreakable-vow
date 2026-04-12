'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
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
          // 3. Check localStorage (works on desktop, may be cleared on mobile OAuth)
          const returnPath = localStorage.getItem('auth-return-path');
          localStorage.removeItem('auth-return-path');
          if (returnPath && returnPath !== '/') return returnPath;

          // 4. Check for in-progress vow flow
          const stored = localStorage.getItem('unbreakable-vow-flow');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.rawInput) return parsed.refinedText ? '/stake' : '/refine';
          }
        } catch {}
        return '/dashboard';
      })();

      const handleCallback = async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
          timeout = setTimeout(() => router.replace('/dashboard'), 3000);
          return;
        }

        if (session) {
          router.replace(redirectTo);
          return;
        }

        timeout = setTimeout(() => {
          setError('Sign-in timed out. Redirecting...');
          setTimeout(() => router.replace('/dashboard'), 2000);
        }, 5000);
      };

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          clearTimeout(timeout);
          router.replace(redirectTo);
        }
      });
      subscription = data.subscription;

      handleCallback();
    })();

    return () => {
      clearTimeout(timeout);
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

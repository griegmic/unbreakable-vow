'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const handleCallback = async () => {
      // Supabase client auto-parses the hash/query params via detectSessionInUrl
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        timeout = setTimeout(() => router.replace('/'), 3000);
        return;
      }

      if (session) {
        router.replace('/seal');
        return;
      }

      // If no session after a short wait, something went wrong
      timeout = setTimeout(() => {
        setError('Sign-in timed out. Redirecting...');
        setTimeout(() => router.replace('/'), 2000);
      }, 5000);
    };

    // Listen for auth state change (covers the case where session isn't ready yet)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        clearTimeout(timeout);
        router.replace('/seal');
      }
    });

    handleCallback();

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
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

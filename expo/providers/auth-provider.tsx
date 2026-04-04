import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load existing session on mount
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setLoading(false);
    });

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log('[AuthProvider] auth state changed:', _event);
        setSession(newSession);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = !!session;

  return useMemo(
    () => ({ session, isAuthenticated, loading }),
    [session, isAuthenticated, loading]
  );
});

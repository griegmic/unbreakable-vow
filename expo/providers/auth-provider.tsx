import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);

  // Fetch display name from users table
  const fetchDisplayName = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', userId)
        .single();
      if (data?.display_name) {
        setDisplayName(data.display_name);
      }
    } catch {
      // Silently fail — display name is optional
    }
  };

  useEffect(() => {
    // Load existing session on mount
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (existing?.user?.id) {
        fetchDisplayName(existing.user.id);
      }
      setLoading(false);
    });

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log('[AuthProvider] auth state changed:', _event);
        setSession(newSession);
        if (newSession?.user?.id) {
          fetchDisplayName(newSession.user.id);
        } else {
          setDisplayName(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = !!session;

  // Fall back to user_metadata name fields if DB display_name not set
  const resolvedName = displayName
    || session?.user?.user_metadata?.full_name
    || session?.user?.user_metadata?.name
    || null;

  return useMemo(
    () => ({ session, isAuthenticated, loading, displayName: resolvedName }),
    [session, isAuthenticated, loading, resolvedName]
  );
});

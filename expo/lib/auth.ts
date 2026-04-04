import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { supabase } from './supabase';

// Configure Google Sign-In — called once at app startup
GoogleSignin.configure({
  // This is the Web Client ID from Google Cloud Console (NOT the iOS one)
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export interface AuthResult {
  success: boolean;
  error?: string;
  displayName?: string | null;
}

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      return { success: false, error: 'Sign-in cancelled' };
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      return { success: false, error: 'No ID token received' };
    }

    // Exchange Google ID token for Supabase session
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      console.error('[Auth] Supabase signInWithIdToken error:', error);
      return { success: false, error: error.message };
    }

    const user = data.user;
    if (!user) {
      return { success: false, error: 'No user returned' };
    }

    // Upsert user profile in public.users
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      response.data.user.name ||
      null;

    const { error: upsertError } = await supabase.from('users').upsert(
      {
        id: user.id,
        display_name: displayName,
      },
      { onConflict: 'id' }
    );

    if (upsertError) {
      console.error('[Auth] user upsert error:', upsertError);
      // Don't fail sign-in — the user record isn't critical for auth
    }

    return { success: true, displayName };
  } catch (err) {
    if (isErrorWithCode(err)) {
      switch (err.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          return { success: false, error: 'Sign-in cancelled' };
        case statusCodes.IN_PROGRESS:
          return { success: false, error: 'Sign-in already in progress' };
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return { success: false, error: 'Play Services not available' };
        default:
          return { success: false, error: err.message };
      }
    }
    console.error('[Auth] unexpected error:', err);
    return { success: false, error: 'Something went wrong' };
  }
}

export async function signOut(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // May not be signed in with Google
  }
  await supabase.auth.signOut();
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

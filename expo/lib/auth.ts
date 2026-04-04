import Constants from 'expo-constants';

import { supabase } from './supabase';

export interface AuthResult {
  success: boolean;
  error?: string;
  displayName?: string | null;
}

// Google Sign-In requires native modules that are ONLY available in
// custom dev clients or standalone builds (EAS Build / TestFlight).
// In Expo Go and Rork, the native binary doesn't include RNGoogleSignin,
// so requiring the JS wrapper triggers TurboModuleRegistry.getEnforcing()
// which throws an invariant that shows as a red screen even inside try/catch.
//
// Constants.appOwnership:
//   'expo'      → Expo Go (no custom native modules)
//   'standalone' / null → standalone or dev-client build (has native modules)
//
// Constants.executionEnvironment:
//   'storeClient' → Expo Go
//   'standalone'  → production build
//   'bare'        → dev client / bare workflow
const isExpoGo = Constants.appOwnership === 'expo'
  || Constants.executionEnvironment === 'storeClient';

export const GOOGLE_SIGN_IN_AVAILABLE = !isExpoGo;

let _google: typeof import('@react-native-google-signin/google-signin') | null = null;
let googleConfigured = false;

function getGoogle() {
  if (!GOOGLE_SIGN_IN_AVAILABLE) return null;
  if (!_google) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _google = require('@react-native-google-signin/google-signin');
    } catch {
      return null;
    }
  }
  if (!googleConfigured && _google) {
    _google.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
    googleConfigured = true;
  }
  return _google;
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const g = getGoogle();
  if (!g) {
    return { success: false, error: 'Google Sign-In is not available in this environment' };
  }

  try {
    await g.GoogleSignin.hasPlayServices();
    const response = await g.GoogleSignin.signIn();

    if (!g.isSuccessResponse(response)) {
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
    }

    return { success: true, displayName };
  } catch (err: unknown) {
    if (g.isErrorWithCode(err)) {
      switch (err.code) {
        case g.statusCodes.SIGN_IN_CANCELLED:
          return { success: false, error: 'Sign-in cancelled' };
        case g.statusCodes.IN_PROGRESS:
          return { success: false, error: 'Sign-in already in progress' };
        case g.statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return { success: false, error: 'Play Services not available' };
        default:
          return { success: false, error: err.message };
      }
    }
    console.error('[Auth] unexpected error:', err);
    return { success: false, error: 'Something went wrong' };
  }
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export async function sendPhoneOtp(phone: string): Promise<AuthResult> {
  try {
    const e164 = toE164(phone);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    if (error) {
      console.error('[Auth] sendPhoneOtp error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    console.error('[Auth] sendPhoneOtp unexpected:', err);
    return { success: false, error: 'Failed to send code' };
  }
}

export async function verifyPhoneOtp(phone: string, code: string): Promise<AuthResult> {
  try {
    const e164 = toE164(phone);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: code,
      type: 'sms',
    });

    if (error) {
      console.error('[Auth] verifyPhoneOtp error:', error);
      return { success: false, error: error.message };
    }

    const user = data.user;
    if (!user) {
      return { success: false, error: 'No user returned' };
    }

    // Upsert user profile
    const { error: upsertError } = await supabase.from('users').upsert(
      { id: user.id, display_name: e164 },
      { onConflict: 'id' }
    );
    if (upsertError) {
      console.error('[Auth] user upsert error:', upsertError);
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('[Auth] verifyPhoneOtp unexpected:', err);
    return { success: false, error: 'Verification failed' };
  }
}

export async function signOut(): Promise<void> {
  const g = getGoogle();
  if (g) {
    try {
      await g.GoogleSignin.signOut();
    } catch {
      // May not be signed in with Google
    }
  }
  await supabase.auth.signOut();
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

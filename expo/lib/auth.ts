import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';

export interface AuthResult {
  success: boolean;
  error?: string;
  displayName?: string | null;
}

// Google Sign-In requires native modules only available in custom dev clients
// or standalone builds (EAS Build / TestFlight).
// Constants.appOwnership === 'expo' reliably detects Expo Go.
// For all other environments, we try to load the module — if it's not in the
// binary, the require will throw and we catch it gracefully.
// NOTE: We removed the executionEnvironment === 'storeClient' check because
// it was falsely triggering on TestFlight builds.
export const GOOGLE_SIGN_IN_AVAILABLE = (() => {
  if (Constants.appOwnership === 'expo') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const g = require('@react-native-google-signin/google-signin');
    return !!g?.GoogleSignin;
  } catch {
    return false;
  }
})();

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
    const webClientId =
      Constants.expoConfig?.extra?.googleWebClientId ??
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
      '543817344565-tkr5h3jj2fb0bpk8belk3bjk2404bu9b.apps.googleusercontent.com';
    const iosClientId =
      Constants.expoConfig?.extra?.googleIosClientId ??
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
      '543817344565-b2tg6eonrbglhot5rccd87e8vot4b69p.apps.googleusercontent.com';

    console.log(
      '[Auth] GoogleSignin.configure() webClientId=',
      webClientId?.substring(0, 20),
      'iosClientId=',
      iosClientId?.substring(0, 20),
    );

    _google.GoogleSignin.configure({ webClientId, iosClientId });
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
    if (Platform.OS === 'android') {
      await g.GoogleSignin.hasPlayServices();
    }
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
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[Auth] Google Sign-In error:', JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Error ? err : {})), errMsg);

    if (errMsg.includes('nonce')) {
      return { success: false, error: 'Google Sign-In configuration error. Please contact support.' };
    }

    if (g.isErrorWithCode(err)) {
      switch (err.code) {
        case g.statusCodes.SIGN_IN_CANCELLED:
          return { success: false, error: 'Sign-in cancelled' };
        case g.statusCodes.IN_PROGRESS:
          return { success: false, error: 'Sign-in already in progress' };
        case g.statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return { success: false, error: 'Play Services not available' };
        default:
          return { success: false, error: errMsg };
      }
    }
    console.error('[Auth] unexpected error (full object):', err);
    return { success: false, error: errMsg || 'Something went wrong' };
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

export async function sendEmailOtp(email: string): Promise<AuthResult> {
  try {
    console.log('[Auth] sendEmailOtp calling signInWithOtp for:', email.split('@')[0] + '@...');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      console.error('[Auth] sendEmailOtp error:', error.name, error.message, error.status);
      if (error.message?.includes('rate') || error.status === 429) {
        return { success: false, error: 'Too many attempts. Please wait a minute and try again.' };
      }
      if (error.name === 'AuthRetryableFetchError') {
        return { success: false, error: 'Network request failed. Check your connection and try again.' };
      }
      return { success: false, error: error.message };
    }
    console.log('[Auth] sendEmailOtp success');
    return { success: true };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error('[Auth] sendEmailOtp unexpected:', errMsg);
    return { success: false, error: 'Network request failed. Check your connection and try again.' };
  }
}

export async function verifyEmailOtp(email: string, code: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    if (error) {
      console.error('[Auth] verifyEmailOtp error:', error);
      return { success: false, error: error.message };
    }

    const user = data.user;
    if (!user) {
      return { success: false, error: 'No user returned' };
    }

    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      email.split('@')[0] ||
      null;

    const { error: upsertError } = await supabase.from('users').upsert(
      { id: user.id, display_name: displayName },
      { onConflict: 'id' }
    );
    if (upsertError) {
      console.error('[Auth] user upsert error:', upsertError);
    }

    return { success: true, displayName };
  } catch (err: unknown) {
    console.error('[Auth] verifyEmailOtp unexpected:', err);
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

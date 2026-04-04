import { supabase } from './supabase';

export interface AuthResult {
  success: boolean;
  error?: string;
  displayName?: string | null;
}

export const GOOGLE_SIGN_IN_AVAILABLE = false;

export async function signInWithGoogle(): Promise<AuthResult> {
  return { success: false, error: 'Google Sign-In is not available on web' };
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
  await supabase.auth.signOut();
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

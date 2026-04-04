# Prompt 03: Apple Sign-In Auth Flow

## Context
We're adding real authentication to the Unbreakable Vow app. The Supabase client is set up (from Prompt 02). The user has configured Apple Sign-In in Apple Developer portal and linked it to Supabase Auth.

Currently `app/auth.tsx` (93 lines) has three placeholder buttons (Apple, Google, Email) that just call `setAuthenticated(true)` and route to `/seal`. We need real Apple Sign-In.

## What to do

### 1. Install dependencies
```bash
cd expo
npx expo install expo-apple-authentication expo-crypto
```

Add `expo-apple-authentication` to `app.json` plugins if needed.

### 2. Create `expo/lib/auth.ts`
Auth helper that handles the Apple Sign-In flow:

```typescript
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

export async function signInWithApple() {
  // Generate nonce
  const rawNonce = Crypto.getRandomValues(new Uint8Array(32))
    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  // Request Apple credential
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce, // hashed nonce goes to Apple
  });

  if (!credential.identityToken) {
    throw new Error('No identity token returned');
  }

  // Sign in with Supabase — raw nonce goes to Supabase
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce, // raw (unhashed) nonce goes to Supabase
  });

  if (error) throw error;

  // Apple only returns fullName on FIRST sign-in. Capture it.
  if (credential.fullName?.givenName) {
    const displayName = [credential.fullName.givenName, credential.fullName.familyName]
      .filter(Boolean)
      .join(' ');

    // Upsert user profile
    await supabase.from('users').upsert({
      id: data.user.id,
      display_name: displayName,
    });
  } else {
    // Ensure user row exists even without name
    await supabase.from('users').upsert({
      id: data.user.id,
    });
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
```

### 3. Create `expo/providers/auth-provider.tsx`
Auth context provider that wraps the app:

```typescript
// Listens to supabase.auth.onAuthStateChange
// Provides: session, user, loading, signIn, signOut
// On mount: checks existing session
// Auto-creates user profile row on first sign-in
```

Key behavior:
- `loading` starts as `true`, resolves after initial session check
- Exposes `isAuthenticated` boolean
- The provider does NOT handle navigation — screens check auth state themselves

### 4. Modify `app/auth.tsx`
Replace the current placeholder with real Apple Sign-In:

- Remove Google and Email buttons (v1 is Apple only)
- Add `AppleAuthentication.AppleAuthenticationButton` (native Apple button)
- On press: call `signInWithApple()` from `lib/auth.ts`
- On success: call `setAuthenticated(true)` from VowFlow (keep existing behavior) and `router.push('/seal')`
- On error: show error toast (use `Alert.alert` for simplicity)
- Add loading spinner during auth

Keep the existing screen styling and layout. Just swap the button section.

### 5. Modify `app/_layout.tsx`
- Wrap the app with `AuthProvider` (inside `VowFlowProvider`, outside `OathStateProvider`)
- Provider order: `QueryClientProvider → StripeProvider → OathStateProvider → AuthProvider → VowFlowProvider → Stack`

### 6. Modify `app/settings.tsx`
- Wire the "Sign Out" button to actually call `signOut()`
- Show the user's display name if available
- Show "Signed in with Apple" indicator

## Do NOT modify
- `app/index.tsx`
- `app/refine.tsx`
- `constants/unbreakable.ts`
- `providers/vow-flow.tsx`
- `components/vow-ui.tsx`

## Important notes
- The nonce flow is critical: HASHED nonce → Apple, RAW nonce → Supabase. If reversed, auth will silently fail.
- Apple only returns the user's name on the VERY FIRST sign-in. If you miss it, the user has to revoke the app in Settings and re-auth. That's why we capture it immediately.
- `expo-apple-authentication` only works on real iOS devices, not Expo Go. Development testing requires `eas build --profile development`.

import Constants from 'expo-constants';
import React from 'react';

// Always attempt to load StripeProvider — the try/catch handles Expo Go
// gracefully if the native module isn't available.
function StripeWrapperInner({ children }: { children: React.ReactNode }) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { StripeProvider } = require('@stripe/stripe-react-native');

    const publishableKey =
      Constants.expoConfig?.extra?.stripePublishableKey ||
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      '';

    if (!publishableKey) {
      console.warn('[StripeWrapper] No publishable key — payment sheet will fail');
      return <>{children}</>;
    }

    return (
      <StripeProvider
        publishableKey={publishableKey}
        merchantIdentifier="merchant.app.unbreakablevow"
      >
        {children}
      </StripeProvider>
    );
  } catch {
    console.warn('[StripeWrapper] Stripe native module not available — falling back to no-op');
    return <>{children}</>;
  }
}

export const StripeWrapper = StripeWrapperInner;

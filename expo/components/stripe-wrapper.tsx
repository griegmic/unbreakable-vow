import Constants from 'expo-constants';
import React from 'react';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Stripe native module isn't available in Expo Go — use a no-op wrapper there
function NoOpWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function NativeStripeWrapper({ children }: { children: React.ReactNode }) {
  // Dynamic require to avoid crash in Expo Go where native module is missing
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
    console.warn('[StripeWrapper] Stripe native module not available');
    return <>{children}</>;
  }
}

export const StripeWrapper = IS_EXPO_GO ? NoOpWrapper : NativeStripeWrapper;

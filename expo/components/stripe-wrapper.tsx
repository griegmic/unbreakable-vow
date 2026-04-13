import Constants from 'expo-constants';
import React from 'react';
import { Platform } from 'react-native';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

function StripeWrapperInner({ children }: { children: React.ReactNode }) {
  // Expo Go doesn't bundle native Stripe modules — skip entirely
  if (IS_EXPO_GO || Platform.OS === 'web') {
    return <>{children}</>;
  }

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

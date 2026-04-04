import React from 'react';

let StripeProviderComponent: React.ComponentType<{ publishableKey: string; children: React.ReactNode }> | null = null;

try {
  const mod = require('@stripe/stripe-react-native');
  StripeProviderComponent = mod.StripeProvider;
} catch {
  // Native module not available (e.g. Expo Go / Rork preview)
}

export function StripeWrapper({ children }: { children: React.ReactNode }) {
  if (!StripeProviderComponent) {
    return <>{children}</>;
  }

  return (
    <StripeProviderComponent publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      {children}
    </StripeProviderComponent>
  );
}

import { StripeProvider } from '@stripe/stripe-react-native';
import React from 'react';

export function StripeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      {children}
    </StripeProvider>
  );
}

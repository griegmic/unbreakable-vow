import React from 'react';
import { Redirect } from 'expo-router';

import { LiveWebShell } from '@/components/live-web-shell';
import { USE_NATIVE_PERFECT } from '@/lib/native-flags';

export default function WitnessInviteScreen() {
  if (USE_NATIVE_PERFECT) return <Redirect href="/native-perfect/dashboard" />;
  return <LiveWebShell path="/witness-invite" />;
}

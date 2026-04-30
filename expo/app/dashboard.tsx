import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';
import { USE_NATIVE_PERFECT } from '@/lib/native-flags';

import NativeDashboardScreen from './native-dashboard';

export default function DashboardScreen() {
  if (USE_NATIVE_PERFECT) return <NativeDashboardScreen />;
  return <LiveWebShell path="/dashboard" />;
}

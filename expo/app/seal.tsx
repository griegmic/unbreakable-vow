import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';
import { USE_NATIVE_PERFECT } from '@/lib/native-flags';

import NativeSealScreen from './native-seal';

export default function SealScreen() {
  if (USE_NATIVE_PERFECT) return <NativeSealScreen />;
  return <LiveWebShell path="/seal" />;
}

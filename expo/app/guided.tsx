import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';
import { USE_NATIVE_PERFECT } from '@/lib/native-flags';

import NativeGuidedScreen from './native-guided';

export default function GuidedScreen() {
  if (USE_NATIVE_PERFECT) return <NativeGuidedScreen />;
  return <LiveWebShell path="/create" />;
}

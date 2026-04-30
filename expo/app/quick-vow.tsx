import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';
import { USE_NATIVE_PERFECT } from '@/lib/native-flags';

import NativeQuickVowScreen from './native-quick-vow';

export default function QuickVowScreen() {
  if (USE_NATIVE_PERFECT) return <NativeQuickVowScreen />;
  return <LiveWebShell path="/quick-vow" />;
}

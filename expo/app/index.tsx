import { Redirect } from 'expo-router';
import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';
import { USE_NATIVE_PERFECT } from '@/lib/native-flags';

import NativeQuickVowScreen from './native-quick-vow';

export default function NativeRoot() {
  // TEMP: redirect to vow screen (screen 01)
  if (USE_NATIVE_PERFECT) return <Redirect href="/native-perfect/create/vow" />;
  return <LiveWebShell path="/quick-vow" />;
}

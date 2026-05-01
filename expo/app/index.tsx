import { Redirect } from 'expo-router';
import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';
import { USE_NATIVE_PERFECT } from '@/lib/native-flags';

import NativeQuickVowScreen from './native-quick-vow';

export default function NativeRoot() {
  // TEMP: redirect to stake for screen 02 verification
  if (USE_NATIVE_PERFECT) return <Redirect href="/native-perfect/create/stake?rawInput=Run+every+morning+this+week" />;
  return <LiveWebShell path="/quick-vow" />;
}

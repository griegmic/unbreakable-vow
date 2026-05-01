import { Redirect } from 'expo-router';
import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';
import { USE_NATIVE_PERFECT } from '@/lib/native-flags';

import NativeQuickVowScreen from './native-quick-vow';

export default function NativeRoot() {
  // TEMP: redirect to witness for screen 03 testing
  if (USE_NATIVE_PERFECT) return <Redirect href="/native-perfect/create/witness?rawInput=Run+every+morning+this+week&stakeAmount=50&consequence=charity&destination=ALS+Association&deadlineIso=2026-05-08T00:00:00.000Z" />;
  return <LiveWebShell path="/quick-vow" />;
}

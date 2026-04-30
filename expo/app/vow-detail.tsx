import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';
import { USE_NATIVE_PERFECT } from '@/lib/native-flags';

import NativeVowDetailScreen from './native-vow-detail';

export default function VowDetailScreen() {
  const params = useLocalSearchParams<{ vowId?: string; justSealed?: string }>();
  if (USE_NATIVE_PERFECT) return <NativeVowDetailScreen />;
  const sealed = params.justSealed ? '?sealed=1' : '';
  return <LiveWebShell path={params.vowId ? `/vow/${params.vowId}${sealed}` : '/dashboard'} />;
}

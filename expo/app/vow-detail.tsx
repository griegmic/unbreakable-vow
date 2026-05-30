import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';
import { USE_NATIVE_PERFECT } from '@/lib/native-flags';

export default function VowDetailScreen() {
  const params = useLocalSearchParams<{ vowId?: string; justSealed?: string }>();
  if (USE_NATIVE_PERFECT) {
    return <Redirect href={{ pathname: '/native-perfect/vow-detail', params: { vowId: params.vowId || '' } }} />;
  }
  const sealed = params.justSealed ? '?sealed=1' : '';
  return <LiveWebShell path={params.vowId ? `/vow/${params.vowId}${sealed}` : '/dashboard'} />;
}

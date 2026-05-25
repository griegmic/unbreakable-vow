import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';
import { USE_NATIVE_PERFECT } from '@/lib/native-flags';

export default function LiveScreen() {
  const params = useLocalSearchParams<{ vowId?: string; justSealed?: string }>();
  const sealed = params.justSealed ? '?sealed=1' : '';
  if (USE_NATIVE_PERFECT) {
    if (params.vowId) {
      return <Redirect href={{ pathname: '/native-perfect/vow-detail', params: { vowId: params.vowId } }} />;
    }
    return <Redirect href="/native-perfect/dashboard" />;
  }
  return <LiveWebShell path={params.vowId ? `/vow/${params.vowId}${sealed}` : '/dashboard'} />;
}

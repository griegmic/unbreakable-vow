import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';

export default function LiveScreen() {
  const params = useLocalSearchParams<{ vowId?: string; justSealed?: string }>();
  const sealed = params.justSealed ? '?sealed=1' : '';
  return <LiveWebShell path={params.vowId ? `/vow/${params.vowId}${sealed}` : '/dashboard'} />;
}

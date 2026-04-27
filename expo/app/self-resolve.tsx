import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';

export default function SelfResolveScreen() {
  const params = useLocalSearchParams<{ vowId?: string }>();
  return <LiveWebShell path={params.vowId ? `/self-resolve?vowId=${params.vowId}` : '/dashboard'} />;
}

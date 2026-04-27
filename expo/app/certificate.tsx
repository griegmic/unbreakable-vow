import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { LiveWebShell } from '@/components/live-web-shell';

export default function CertificateScreen() {
  const params = useLocalSearchParams<{ vowId?: string }>();
  return <LiveWebShell path={params.vowId ? `/certificate/${params.vowId}` : '/dashboard'} />;
}

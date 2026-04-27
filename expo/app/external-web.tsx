import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';

import { LiveWebShell } from '@/components/live-web-shell';

export default function ExternalWebScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const url = useMemo(() => {
    if (!params.url) return 'https://www.unbreakablevow.app';
    try {
      return decodeURIComponent(params.url);
    } catch {
      return params.url;
    }
  }, [params.url]);

  return <LiveWebShell path={url} />;
}

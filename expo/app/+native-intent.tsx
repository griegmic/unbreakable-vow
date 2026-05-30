import { USE_NATIVE_PERFECT } from '@/lib/native-flags';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  let normalizedPath = path;
  try {
    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path);
      normalizedPath = `${url.pathname}${url.search}`;
    }
  } catch {
    normalizedPath = path;
  }

  const witnessMatch = normalizedPath.match(/^\/w\/([^/?]+)/);
  if (witnessMatch) {
    if (USE_NATIVE_PERFECT) {
      return `/native-perfect/w/${witnessMatch[1]}`;
    }
    return `/external-web?url=${encodeURIComponent(`https://unbreakablevow.app${normalizedPath}`)}`;
  }

  const challengeMatch = normalizedPath.match(/^\/c\/([^/?]+)/);
  if (challengeMatch) {
    return `/external-web?url=${encodeURIComponent(`https://unbreakablevow.app${normalizedPath}`)}`;
  }

  const knownRoutes = [
    '/refine', '/witness', '/stake', '/auth', '/seal', '/sent',
    '/live',
    '/vow-kept', '/vow-broken', '/history', '/settings',
    '/certificate', '/self-resolve', '/challenges', '/crew-invite',
    '/external-web', '/dashboard', '/quick-vow', '/cast', '/vow-detail',
  ];

  if (knownRoutes.some(route => normalizedPath.startsWith(route))) {
    return normalizedPath;
  }

  return '/';
}

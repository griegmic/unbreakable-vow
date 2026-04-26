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

  // Witness and dare acceptor flows intentionally stay on mobile web. If an
  // installed app receives those universal links, hand them back to the browser
  // so cold recipients see the same acquisition/acceptance experience.
  const witnessMatch = normalizedPath.match(/^\/w\/([^/?]+)/);
  if (witnessMatch) {
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

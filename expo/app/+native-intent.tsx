export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  // Handle /w/{token} witness invite URLs — redirect to witness-invite screen with token param
  const witnessMatch = path.match(/^\/w\/([^/?]+)/);
  if (witnessMatch) {
    return `/witness-invite?token=${witnessMatch[1]}`;
  }

  const knownRoutes = [
    '/refine', '/witness', '/stake', '/auth', '/seal', '/sent',
    '/live', '/witness-invite', '/witness-verdict',
    '/vow-kept', '/vow-broken', '/history', '/settings',
    '/certificate', '/self-resolve', '/challenges', '/crew-invite',
  ];

  if (knownRoutes.some(route => path.startsWith(route))) {
    return path;
  }

  return '/';
}

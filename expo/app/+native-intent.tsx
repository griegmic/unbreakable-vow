export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const knownRoutes = [
    '/refine', '/witness', '/stake', '/auth', '/seal', '/sent',
    '/live', '/witness-invite', '/witness-verdict',
    '/vow-kept', '/vow-broken', '/history', '/settings',
  ];

  if (knownRoutes.some(route => path.startsWith(route))) {
    return path;
  }

  return '/';
}

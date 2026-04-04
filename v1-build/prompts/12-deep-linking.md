# Prompt 12: Deep Linking + Native Intent Fix

## Context
Unbreakable Vow app. The `+native-intent.tsx` currently swallows all deep links (redirects everything to `/`). We need deep links to work for:
1. Push notification taps (route to specific screens)
2. Future universal links (when we add a custom domain)

## What to do

### 1. Fix `app/+native-intent.tsx`

```typescript
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  // Known app routes — let them through
  const knownRoutes = [
    '/refine', '/witness', '/stake', '/auth', '/seal', '/sent',
    '/live', '/witness-invite', '/witness-verdict',
    '/vow-kept', '/vow-broken', '/history', '/settings',
  ];

  if (knownRoutes.some(route => path.startsWith(route))) {
    return path;
  }

  // Default to home
  return '/';
}
```

### 2. Update `app.json` for deep link scheme

The scheme is already `rork-app`. For v1, change it to something meaningful:

```json
"scheme": "unbreakablevow"
```

This enables links like `unbreakablevow://live` to open the app to the live screen.

### 3. Push notification deep links

Notifications include a `route` field in their data payload. The notification response listener in `_layout.tsx` (from Prompt 09) already handles this:

```typescript
const data = response.notification.request.content.data;
if (data?.route) {
  router.push(data.route as string);
}
```

No additional changes needed — just ensure the push_queue entries have the correct route values.

## Do NOT modify
- Any other screens
- Backend code

## Important notes
- Universal links (AASA file, custom domain) are a v2 feature. For v1, push notification deep links are sufficient.
- The `initial` parameter in redirectSystemPath tells you if this is the initial app load vs a later navigation. For v1, we don't need to differentiate.

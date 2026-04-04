# Prompt 09: Push Notifications

## Context
Unbreakable Vow app. The vow owner receives push notifications for key events. The witness gets SMS (not push). Push tokens are stored in the `users` table.

## What to do

### 1. Install dependencies
```bash
cd expo
npx expo install expo-notifications expo-device expo-constants
```

### 2. Create `expo/lib/notifications.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenData.data; // looks like "ExponentPushToken[xxxxxx]"
}

export async function savePushToken(token: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.from('users').update({
    push_token: token,
  }).eq('id', session.user.id);
}
```

### 3. Register push token after auth

In the auth flow (after successful Apple Sign-In), register and save the push token:

```typescript
// In auth.tsx or in the AuthProvider, after successful sign-in:
const token = await registerForPushNotifications();
if (token) {
  await savePushToken(token);
}
```

### 4. Add notification listeners in `app/_layout.tsx`

```typescript
import * as Notifications from 'expo-notifications';

// In the root layout component:
useEffect(() => {
  // Handle notification received while app is foregrounded
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });

  // Handle notification tapped
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    // Navigate based on notification data
    if (data?.route) {
      router.push(data.route as string);
    }
  });

  return () => {
    subscription.remove();
    responseSubscription.remove();
  };
}, []);
```

### 5. Push notification events

These are queued in `push_queue` by the cron runner and Edge Functions:

| Event | Title | Body | Route |
|---|---|---|---|
| Vow sealed | "Vow sealed!" | "Your vow is active. ${amount} is on the line." | /live |
| Halfway | "Keep going!" | "You're halfway through your vow: \"{vow_text}\"" | /live |
| Verdict received: kept | "You kept your vow!" | "${amount} is being refunded." | /vow-kept |
| Verdict received: broken | "Vow broken" | "${amount} goes to {destination}." | /vow-broken |
| Auto-resolved | "Vow auto-resolved" | "No verdict received. Your vow was marked as kept. ${amount} refunded." | /vow-kept |

### 6. Queue push notifications from Edge Functions

In `seal-vow`, after successful seal:
```typescript
await supabase.from('push_queue').insert({
  user_id: vow.user_id,
  title: 'Vow sealed!',
  body: `Your vow is active. $${vow.stake_amount / 100} is on the line.`,
  data: { route: '/live' },
  send_after: new Date().toISOString(),
});
```

In `submit-verdict`, after verdict:
```typescript
await supabase.from('push_queue').insert({
  user_id: vow.user_id,
  title: verdict === 'kept' ? 'You kept your vow!' : 'Vow broken',
  body: verdict === 'kept'
    ? `$${vow.stake_amount / 100} is being refunded.`
    : `$${vow.stake_amount / 100} goes to ${vow.destination}.`,
  data: { route: verdict === 'kept' ? '/vow-kept' : '/vow-broken' },
  send_after: new Date().toISOString(),
});
```

## Do NOT modify
- Existing screen layouts or styles
- `constants/unbreakable.ts`
- `providers/vow-flow.tsx`

## Important notes
- Push notifications only work on physical devices, not Expo Go or simulators.
- The Expo Push API (`exp.host/--/api/v2/push/send`) is free and handles APNs/FCM routing.
- Request permission after auth, not on app launch. Don't prompt before the user has context.
- iOS requires the APNs key to be configured in Expo/EAS. This is done during `eas credentials` setup (in MANUAL_SETUP.md step 6).

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { supabase } from './supabase';

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
    console.log('[Notifications] Push requires a physical device');
    await savePushPermissionStatus('denied');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    await savePushPermissionStatus(finalStatus === 'denied' ? 'denied' : 'undetermined');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

  console.log('[Notifications] Push token registered');
  await savePushPermissionStatus('granted');
  return tokenData.data;
}

export async function savePushPermissionStatus(status: 'unknown' | 'granted' | 'denied' | 'undetermined'): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.from('users').update({
    push_permission_status: status,
  } as any).eq('id', session.user.id);
}

export async function savePushToken(token: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.from('users').update({
    push_token: token,
    push_permission_status: 'granted',
  } as any).eq('id', session.user.id);
}

export async function refreshPushTokenIfGranted(): Promise<void> {
  if (!Device.isDevice) return;
  const { status } = await Notifications.getPermissionsAsync();
  await savePushPermissionStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
  if (status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  await savePushToken(tokenData.data);
}

export async function recordNotificationOpened(data: Record<string, unknown>): Promise<void> {
  const vowId = typeof data.vow_id === 'string' ? data.vow_id : typeof data.vowId === 'string' ? data.vowId : null;
  if (!vowId) return;
  await supabase.from('audit_events').insert({
    vow_id: vowId,
    event_type: 'notification_opened',
    actor_type: 'system',
    metadata: {
      route: data.route,
      event: data.event || data.type,
    },
  });
}

export async function recordPushPermissionEvent(
  vowId: string | null | undefined,
  eventType: 'push_permission_prompt_seen' | 'push_permission_granted' | 'push_permission_denied',
): Promise<void> {
  if (!vowId) return;
  await supabase.from('audit_events').insert({
    vow_id: vowId,
    event_type: eventType,
    actor_type: 'maker',
    metadata: {},
  });
}

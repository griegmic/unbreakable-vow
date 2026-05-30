import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { ActionCard } from '@/components/native-perfect/ScreenScaffold';
import { GoldCTA } from '@/components/primitives';
import {
  getPushPermissionStatus,
  recordPushPermissionEvent,
  registerForPushNotifications,
  savePushToken,
  type PushPermissionStatus,
} from '@/lib/notifications';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

type Props = {
  vowId?: string | null;
  compact?: boolean;
};

export function NotificationOptInCard({ vowId, compact = false }: Props) {
  const [status, setStatus] = useState<PushPermissionStatus>('unknown');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getPushPermissionStatus().then(next => {
      if (alive) setStatus(next);
    });
    return () => { alive = false; };
  }, []);

  const enabled = status === 'granted';
  const denied = status === 'denied';

  async function enable() {
    if (busy || enabled) return;
    setBusy(true);
    await recordPushPermissionEvent(vowId, 'push_permission_prompt_seen');
    const token = await registerForPushNotifications();
    if (token) {
      await savePushToken(token);
      await recordPushPermissionEvent(vowId, 'push_permission_granted');
      setStatus('granted');
    } else {
      await recordPushPermissionEvent(vowId, 'push_permission_denied');
      setStatus(await getPushPermissionStatus());
    }
    setBusy(false);
  }

  return (
    <ActionCard
      meta="Alerts"
      title={enabled ? 'Vow alerts are on.' : denied ? 'Push is off on this device.' : 'Keep this vow close.'}
      body={enabled ? 'We will bring back the vow at the moments that matter, and use text only as fallback.' : denied ? 'Key text updates can still reach you when your phone number is saved.' : 'Get the witness reply, last stretch, verdict time, and dare responses without having to remember where to look.'}
      tone={enabled ? 'green' : denied ? 'orange' : 'blue'}
    >
      {!enabled && !denied ? (
        <View style={styles.actions}>
          <GoldCTA label={busy ? 'Turning on...' : compact ? 'Turn on alerts' : 'Turn on vow alerts'} disabled={busy} onPress={enable} />
        </View>
      ) : null}
      {denied ? (
        <View style={styles.deniedRow}>
          <Text style={styles.deniedText}>SMS can cover key moments when your phone number is available. App alerts come back from system settings.</Text>
          <GoldCTA label="Open settings" onPress={() => Linking.openSettings()} />
        </View>
      ) : null}
    </ActionCard>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: 14,
  },
  deniedRow: {
    marginTop: 14,
    gap: 12,
  },
  deniedText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    lineHeight: 18,
    color: uvColors.textNote,
  },
});

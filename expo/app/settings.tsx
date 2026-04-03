import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { Bell, CreditCard, LogOut, Mail, Shield, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BackButton, RitualScreen, TitleBlock } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { useOathState } from '@/providers/oath-state';

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
}

function SettingsRow({ icon, label, description, onPress, trailing }: SettingsRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress?.();
      }}
      testID={`settings-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      {trailing ?? null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { oathToggleEnabled, setOathToggle } = useOathState();

  return (
    <RitualScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackButton />
      <TitleBlock
        title="Settings"
        subtitle="Manage your account and preferences."
      />

      <View style={styles.section}>
        <SettingsRow
          icon={<Mail color={palette.textSecondary} size={18} />}
          label="Account"
          description="Email, sign-in method"
        />
        <SettingsRow
          icon={<CreditCard color={palette.textSecondary} size={18} />}
          label="Payment"
          description="Manage payment methods"
        />
        <SettingsRow
          icon={<Bell color={palette.textSecondary} size={18} />}
          label="Notifications"
          description="Check-ins, verdict alerts"
        />
        <SettingsRow
          icon={<Shield color={palette.textSecondary} size={18} />}
          label="Privacy"
          description="Data and permissions"
        />
      </View>

      <View style={styles.section}>
        <SettingsRow
          icon={<Sparkles color={palette.goldBright} size={18} />}
          label="Show oath on open"
          description="Start each session with the ritual"
          onPress={() => setOathToggle(!oathToggleEnabled)}
          trailing={
            <Switch
              value={oathToggleEnabled}
              onValueChange={(val) => {
                void Haptics.selectionAsync();
                setOathToggle(val);
              }}
              trackColor={{ false: palette.surfaceStrong, true: 'rgba(212,162,79,0.4)' }}
              thumbColor={oathToggleEnabled ? palette.goldBright : palette.textMuted}
              testID="oath-toggle"
            />
          }
        />
      </View>

      <View style={styles.section}>
        <SettingsRow
          icon={<LogOut color={palette.danger} size={18} />}
          label="Sign out"
          description="Log out of your account"
        />
      </View>

      <Text style={styles.version}>Unbreakable Vow v1.0</Text>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  rowDesc: {
    color: palette.textMuted,
    fontSize: 12,
  },
  version: {
    color: palette.textMuted,
    fontSize: 12,
    textAlign: 'center' as const,
    marginTop: 8,
  },
});

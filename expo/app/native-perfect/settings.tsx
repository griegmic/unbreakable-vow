import { router } from 'expo-router';
import React from 'react';

import { NotificationOptInCard } from '@/components/notification-opt-in-card';
import { ActionCard, HeroTitle, NativePerfectScreen } from '@/components/native-perfect/ScreenScaffold';
import { supabase } from '@/lib/supabase';

export default function NativePerfectSettings() {
  return (
    <NativePerfectScreen backTo="/native-perfect/dashboard">
      <HeroTitle title="Settings" accent="& help." body="Account, reminders, payment, and support." />
      <NotificationOptInCard />
      <ActionCard title="Payment method" body="Manage the card or wallet used only if a vow breaks." />
      <ActionCard title="Help" body="Questions, bugs, and recovery paths for vows already on the line." />
      <ActionCard
        title="Sign out"
        body="Leave this device. Your vows stay safe."
        tone="red"
        onPress={async () => {
          await supabase.auth.signOut();
          router.replace('/' as never);
        }}
      />
    </NativePerfectScreen>
  );
}

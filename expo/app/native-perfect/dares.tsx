import { router } from 'expo-router';
import React from 'react';

import { ActionCard, HeroTitle, NativePerfectScreen } from '@/components/native-perfect/ScreenScaffold';
import { GoldCTA } from '@/components/primitives';

export default function NativePerfectDares() {
  return (
    <NativePerfectScreen backTo="/native-perfect/dashboard">
      <HeroTitle title="Dares you" accent="sent." body="See who accepted, who’s stalling, and what needs a resend." />
      <ActionCard meta="Waiting" title="Delete TikTok for a week." body="Sent to Marcus · $50 suggested · pending." tone="orange" />
      <ActionCard meta="Accepted" title="No phone in bed for 7 days." body="Accepted by Ana · $25 at stake · you judge." tone="green" />
      <ActionCard title="Dare someone." body="Send a challenge link. The web flow handles accepting and payment for now.">
        <GoldCTA label="Dare someone →" onPress={() => router.push('/cast' as never)} />
      </ActionCard>
    </NativePerfectScreen>
  );
}

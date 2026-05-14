import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { ActionCard, EmptyState, HeroTitle, NativePerfectScreen } from '@/components/native-perfect/ScreenScaffold';
import { GoldCTA } from '@/components/primitives';
import { getWitnessingVows, type VowRow } from '@/lib/vow-api';

export default function NativePerfectJudging() {
  const [vows, setVows] = useState<VowRow[]>([]);
  useEffect(() => { void getWitnessingVows().then(setVows); }, []);

  return (
    <NativePerfectScreen backTo="/native-perfect/dashboard">
      <HeroTitle title="You’re" accent="judging." body="Verdicts, active watches, and the people counting on you." />
      {vows.length === 0 ? (
        <EmptyState title="No one is leaning on you yet." body="When a friend asks you to witness a vow, it will show up here." />
      ) : vows.map(vow => (
        <ActionCard
          key={vow.id}
          meta={vow.status === 'awaiting_verdict' ? 'Verdict due' : 'Watching'}
          title={vow.refined_text || vow.raw_input}
          body={vow.status === 'awaiting_verdict' ? 'One tap: did they keep it?' : `Verdict ${vow.ends_at ? new Date(vow.ends_at).toLocaleDateString() : 'soon'}.`}
          tone={vow.status === 'awaiting_verdict' ? 'orange' : 'green'}
        >
          {vow.status === 'awaiting_verdict' ? (
            <GoldCTA
              label="Give verdict"
              onPress={() => {
                if (vow.witness_invite_token) {
                  router.push(`/native-perfect/w/${vow.witness_invite_token}` as never);
                }
              }}
            />
          ) : null}
        </ActionCard>
      ))}
    </NativePerfectScreen>
  );
}

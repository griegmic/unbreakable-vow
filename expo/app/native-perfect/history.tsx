import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { ActionCard, EmptyState, HeroTitle, NativePerfectScreen } from '@/components/native-perfect/ScreenScaffold';
import { getRecentVows, type VowRow } from '@/lib/vow-api';

export default function NativePerfectHistory() {
  const [vows, setVows] = useState<VowRow[]>([]);
  useEffect(() => { void getRecentVows(20).then(setVows); }, []);

  return (
    <NativePerfectScreen backTo="/native-perfect/dashboard">
      <HeroTitle title="Past" accent="vows." body="Kept, broken, resolved. Receipts for your word." />
      {vows.length === 0 ? (
        <EmptyState title="No history yet." body="Resolved vows will land here after the verdict." />
      ) : vows.map(vow => (
        <ActionCard
          key={vow.id}
          meta={vow.status.toUpperCase()}
          title={vow.refined_text || vow.raw_input}
          body={vow.status === 'kept' ? 'You kept your word.' : vow.status === 'broken' ? `Stake went to ${vow.destination}.` : 'Resolved.'}
          tone={vow.status === 'kept' ? 'green' : vow.status === 'broken' ? 'red' : 'gold'}
          onPress={() => router.push({ pathname: '/native-perfect/vow-detail', params: { vowId: vow.id } } as never)}
        />
      ))}
    </NativePerfectScreen>
  );
}

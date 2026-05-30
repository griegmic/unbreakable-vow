import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ActionCard, EmptyState, HeroTitle, NativePerfectScreen } from '@/components/native-perfect/ScreenScaffold';
import { GoldCTA } from '@/components/primitives';
import { getSentChallenges, type VowRow } from '@/lib/vow-api';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

export default function NativePerfectDares() {
  const [dares, setDares] = useState<VowRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getSentChallenges()
      .then(rows => {
        if (alive) setDares(rows);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  return (
    <NativePerfectScreen backTo="/native-perfect/dashboard">
      <HeroTitle title="Dares you" accent="sent." body="See who accepted, who’s stalling, and what needs a resend." />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={uvColors.goldBright} />
          <Text style={styles.loadingText}>Loading dares</Text>
        </View>
      ) : null}

      {!loading && dares.length === 0 ? (
        <EmptyState
          title="No dares sent."
          body="Dare someone, then this becomes the home base for accepted, passed, and expired dares."
          cta="Dare someone"
          onPress={() => router.push('/cast' as never)}
        />
      ) : null}

      {!loading && dares.map(dare => (
        <ActionCard
          key={dare.id}
          meta={statusLabel(dare)}
          title={dare.refined_text || dare.raw_input}
          body={`${stakeLabel(dare)} · ${deadlineLabel(dare)} · ${nextAlertLabel(dare)}`}
          tone={toneFor(dare)}
          onPress={() => router.push({ pathname: '/native-perfect/vow-detail', params: { vowId: dare.id } } as never)}
        />
      ))}

      <ActionCard title="Dare someone." body="Send the dare link. The web flow handles accepting and payment for now.">
        <GoldCTA label="Dare someone →" onPress={() => router.push('/cast' as never)} />
      </ActionCard>
    </NativePerfectScreen>
  );
}

function statusLabel(vow: VowRow) {
  if (vow.challenge_status === 'accepted') return vow.status === 'awaiting_verdict' ? 'Verdict due' : 'Accepted';
  if (vow.challenge_status === 'declined') return 'Passed';
  if (vow.challenge_status === 'expired') return 'Expired';
  return 'Waiting';
}

function toneFor(vow: VowRow): 'gold' | 'green' | 'orange' | 'red' | 'blue' {
  if (vow.challenge_status === 'accepted') return vow.status === 'awaiting_verdict' ? 'orange' : 'green';
  if (vow.challenge_status === 'declined' || vow.challenge_status === 'expired') return 'red';
  return 'orange';
}

function stakeLabel(vow: VowRow) {
  if (vow.stake_amount > 0) return `$${Math.round(vow.stake_amount / 100)} suggested`;
  return 'No stake yet';
}

function deadlineLabel(vow: VowRow) {
  if (!vow.ends_at) return 'No deadline';
  return new Date(vow.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function nextAlertLabel(vow: VowRow) {
  if (vow.challenge_status === 'pending') return '24h reminder, 48h close';
  if (vow.challenge_status === 'accepted') return 'you judge at verdict time';
  if (vow.challenge_status === 'declined') return 'closed';
  if (vow.challenge_status === 'expired') return 'closed';
  return 'tracked here';
}

const styles = StyleSheet.create({
  loading: {
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  loadingText: {
    fontFamily: uvFonts.sansSemibold,
    color: uvColors.textMuted,
  },
});

import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Share, StyleSheet, Text, View } from 'react-native';

import { ActionCard, HeroTitle, NativePerfectScreen } from '@/components/native-perfect/ScreenScaffold';
import { GoldCTA, QuietPill } from '@/components/primitives';
import { getVowDetail, requestEarlyCompletion, resendWitnessInvite, type VowRow } from '@/lib/vow-api';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { getWitnessUrl } from '@/lib/witness-url';

export default function NativePerfectVowDetail() {
  const params = useLocalSearchParams<{ vowId?: string }>();
  const [vow, setVow] = useState<VowRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [nudgeText, setNudgeText] = useState('Remind witness');
  const [earlyText, setEarlyText] = useState('I did it early');

  useEffect(() => {
    let alive = true;
    if (!params.vowId) {
      setLoading(false);
      return;
    }
    getVowDetail(params.vowId).then(row => {
      if (!alive) return;
      setVow(row);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [params.vowId]);

  if (loading) {
    return (
      <NativePerfectScreen backTo="/native-perfect/dashboard">
        <View style={styles.loading}><ActivityIndicator color={uvColors.goldBright} /><Text style={styles.loadingText}>Loading vow</Text></View>
      </NativePerfectScreen>
    );
  }

  if (!vow) {
    return (
      <NativePerfectScreen backTo="/native-perfect/dashboard">
        <HeroTitle title="Vow not found." body="It may have been moved, resolved, or opened from an old link." />
      </NativePerfectScreen>
    );
  }

  const solo = vow.witness_name === 'Just me';
  const waiting = vow.status === 'active' && !vow.witness_accepted_at && !solo;
  const due = vow.status === 'awaiting_verdict';
  const kept = vow.status === 'kept';
  const broken = vow.status === 'broken';
  const live = vow.status === 'active' && (Boolean(vow.witness_accepted_at) || solo);

  return (
    <NativePerfectScreen backTo="/native-perfect/dashboard">
      <HeroTitle
        kicker={waiting ? 'One tap away' : due ? 'Verdict due' : kept ? 'Kept' : broken ? 'Broken' : 'Vow live'}
        title={waiting ? `Waiting for ${vow.witness_name || 'your witness'}.` : due ? 'Time is up.' : kept ? 'You kept it.' : broken ? 'You broke it.' : 'Keep'}
        accent={live ? 'going.' : undefined}
        body={waiting ? 'Your vow starts when your witness accepts.' : due ? `${solo ? 'You' : vow.witness_name || 'Your witness'} decides if you kept your word.` : kept ? 'The stake stays put. Receipt earned.' : broken ? `${money(vow)} goes to ${vow.destination}.` : solo ? 'You are calling this one yourself.' : `${vow.witness_name || 'Your witness'} decides if you kept your word.`}
      />

      <ActionCard
        meta="The vow"
        title={vow.refined_text || vow.raw_input}
        body={`${money(vow)} · ${vow.destination} · ${deadline(vow)}`}
        tone={kept ? 'green' : broken ? 'red' : waiting ? 'orange' : 'gold'}
      />

      {waiting ? (
        <ActionCard
          title="Send the invite."
          body={`${vow.witness_name || 'Your witness'} accepts, then the vow starts.`}
          tone="orange"
        >
          <GoldCTA
            label={nudgeText}
            onPress={async () => {
              if (!vow.id) return;
              setNudgeText('Sending...');
              const result = await resendWitnessInvite(vow.id);
              setNudgeText(result.success ? 'Invite sent' : 'Try again');
            }}
          />
        </ActionCard>
      ) : null}

      {live ? (
        <ActionCard title={timeLeftTitle(vow)} body={`Verdict by ${deadline(vow)}.`}>
          <GoldCTA
            label={earlyText}
            onPress={async () => {
              if (!vow.id) return;
              setEarlyText('Asking...');
              const result = await requestEarlyCompletion(vow.id);
              setEarlyText(result.success ? 'Witness asked' : 'Try again');
            }}
          />
          <View style={styles.quietRow}>
            {!solo ? <QuietPill label={`Text ${vow.witness_name || 'witness'} a check-in`} onPress={() => textWitness(vow)} /> : null}
            <QuietPill label="Share vow" onPress={() => shareVow(vow)} />
          </View>
        </ActionCard>
      ) : null}

      {due ? (
        <ActionCard title="Waiting on the verdict." body={`${vow.witness_name || 'Your witness'} has the final say.`} tone="orange">
          <QuietPill
            label={`Nudge ${vow.witness_name || 'witness'} to decide`}
            onPress={async () => {
              setNudgeText('Sending...');
              const result = await requestEarlyCompletion(vow.id);
              setNudgeText(result.success ? 'Nudge sent' : 'Try again');
            }}
          />
        </ActionCard>
      ) : null}

      <QuietPill label="Back to dashboard" onPress={() => router.replace('/native-perfect/dashboard' as never)} />
    </NativePerfectScreen>
  );
}

function money(vow: VowRow) {
  return vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)}` : '$0';
}

function deadline(vow: VowRow) {
  if (!vow.ends_at) return 'No deadline';
  return new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeLeftTitle(vow: VowRow) {
  if (!vow.ends_at) return 'Keep going.';
  const ms = new Date(vow.ends_at).getTime() - Date.now();
  if (ms < 0) return 'Time is up.';
  const days = Math.ceil(ms / 86400000);
  return days <= 1 ? 'Last stretch.' : `${days} days left`;
}

async function textWitness(vow: VowRow) {
  const token = vow.witness_invite_token;
  const url = getWitnessUrl(token);
  const message = `Checking in on my vow: "${vow.refined_text || vow.raw_input}". ${url}`;
  if (vow.witness_phone) {
    const separator = Platform.OS === 'ios' ? '&' : '?';
    await Linking.openURL(`sms:${vow.witness_phone}${separator}body=${encodeURIComponent(message)}`).catch(() => Share.share({ message, url }));
    return;
  }
  await Share.share({ message, url });
}

async function shareVow(vow: VowRow) {
  const url = vow.witness_invite_token ? getWitnessUrl(vow.witness_invite_token) : 'https://unbreakablevow.app';
  const message = `I made a vow: "${vow.refined_text || vow.raw_input}".`;
  await Share.share({ title: 'Unbreakable Vow', message, url });
}

const styles = StyleSheet.create({
  loading: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: uvFonts.sansSemibold,
    color: uvColors.textMuted,
  },
  quietRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
});

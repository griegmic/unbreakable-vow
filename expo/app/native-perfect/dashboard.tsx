import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppMenuButton } from '@/components/app-menu';
import { ActionCard, EmptyState, HeroTitle, NativePerfectScreen } from '@/components/native-perfect/ScreenScaffold';
import { GoldCTA, QuietPill } from '@/components/primitives';
import { getMyVows, getSentChallenges, getWitnessingVows, type VowRow } from '@/lib/vow-api';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { useAuth } from '@/providers/auth-provider';

export default function NativePerfectDashboard() {
  const { displayName } = useAuth();
  const [myVows, setMyVows] = useState<VowRow[]>([]);
  const [judging, setJudging] = useState<VowRow[]>([]);
  const [sentDares, setSentDares] = useState<VowRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([getMyVows(), getWitnessingVows(), getSentChallenges()])
      .then(([mine, watches, dares]) => {
        if (!alive) return;
        setMyVows(mine);
        setJudging(watches);
        setSentDares(dares);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const firstName = displayName?.split(' ')[0] || '';
  const heroTitle = firstName ? `Hey, ${firstName}.` : 'Ready when you are.';
  const avatarInitial = firstName || 'UV';
  const needsNow = useMemo(() => {
    const dareVerdict = sentDares.find(v => v.challenge_status === 'accepted' && v.status === 'awaiting_verdict');
    if (dareVerdict) return { type: 'dare_verdict', vow: dareVerdict };
    const ownVerdict = myVows.find(v => v.status === 'awaiting_verdict');
    if (ownVerdict) return { type: 'own_verdict', vow: ownVerdict };
    const witnessPending = myVows.find(v => isWaitingWitness(v));
    if (witnessPending) return { type: 'witness', vow: witnessPending };
    const verdictDue = judging.find(v => v.status === 'awaiting_verdict');
    if (verdictDue) return { type: 'verdict', vow: verdictDue };
    return null;
  }, [judging, myVows, sentDares]);

  return (
    <NativePerfectScreen>
      <View style={styles.topbar}>
        <Text style={styles.brand}>Unbreakable Vow</Text>
        <AppMenuButton initial={avatarInitial} variant="avatar" />
      </View>
      <HeroTitle title={heroTitle} body="Open loops first. Quiet vows after." />

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={uvColors.goldBright} /><Text style={styles.loadingText}>Loading vows</Text></View>
      ) : null}

      {!loading && needsNow ? (
        <ActionCard
          meta="Needs you now"
          title={needsNow.type === 'dare_verdict' ? 'Your dare needs a verdict.' : needsNow.type === 'verdict' ? `${needsNow.vow.witness_name || 'Someone'} needs your verdict.` : needsNow.type === 'own_verdict' ? verdictTitle(needsNow.vow) : `${needsNow.vow.witness_name || 'Your witness'} still needs the invite.`}
          body={needsNow.type === 'dare_verdict' ? `${targetLabel(needsNow.vow)} is waiting on your call.` : needsNow.type === 'verdict' ? vowTitle(needsNow.vow) : needsNow.type === 'own_verdict' ? verdictBody(needsNow.vow) : 'One tap gets the witness loop moving.'}
          tone="orange"
          onPress={() => openVow(needsNow.vow)}
        />
      ) : null}

      {!loading && myVows.length === 0 && judging.length === 0 && sentDares.length === 0 ? (
        <EmptyState
          title="No vows on the line."
          body="Make one promise worth keeping. Your dashboard will fill in as vows go live."
          cta="Make a vow"
          onPress={() => router.push('/native-perfect/create/vow' as never)}
        />
      ) : null}

      {!loading && myVows.length > 0 ? (
        <>
          <SectionHeader title="My vows" count={myVows.length} />
          {myVows.slice(0, 4).map(vow => (
            <ActionCard
              key={vow.id}
              meta={statusLabel(vow)}
              title={vowTitle(vow)}
              body={`${stakeLabel(vow)} · ${witnessLabel(vow)} · ${timeLabel(vow)}`}
              tone={isWaitingWitness(vow) || isPendingDare(vow) ? 'orange' : vow.status === 'kept' ? 'green' : vow.status === 'broken' ? 'red' : 'gold'}
              onPress={() => openVow(vow)}
            />
          ))}
        </>
      ) : null}

      {!loading && judging.length > 0 ? (
        <>
          <SectionHeader title="Judging" count={judging.length} />
          {judging.slice(0, 3).map(vow => (
            <ActionCard
              key={vow.id}
              meta={vow.status === 'awaiting_verdict' ? 'Verdict due' : 'Watching'}
              title={vowTitle(vow)}
              body={`${makerLabel(vow)} is counting on you. ${timeLabel(vow)}`}
              tone={vow.status === 'awaiting_verdict' ? 'orange' : 'green'}
              onPress={() => router.push({ pathname: '/native-perfect/judging', params: { vowId: vow.id } } as never)}
            />
          ))}
        </>
      ) : null}

      {!loading && sentDares.length > 0 ? (
        <>
          <SectionHeader title="Dares you made" count={sentDares.length} />
          {sentDares.slice(0, 4).map(dare => (
            <ActionCard
              key={dare.id}
              meta={sentDareStatus(dare)}
              title={vowTitle(dare)}
              body={`${targetLabel(dare)} · ${sentDareNextStep(dare)}`}
              tone={sentDareTone(dare)}
              onPress={() => openVow(dare)}
            />
          ))}
        </>
      ) : null}

      <View style={styles.actions}>
        <GoldCTA label="Make a vow" onPress={() => router.push('/native-perfect/quick-vow' as never)} />
        <View style={styles.quietActions}>
          <QuietPill label="Use guided flow" onPress={() => router.push('/native-perfect/create/vow' as never)} />
          <QuietPill label="Dare someone" onPress={() => router.push('/cast' as never)} />
        </View>
      </View>
    </NativePerfectScreen>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

function openVow(vow: VowRow) {
  router.push({ pathname: '/native-perfect/vow-detail', params: { vowId: vow.id } } as never);
}

function vowTitle(vow: VowRow) {
  return vow.refined_text || vow.raw_input || 'Untitled vow';
}

function stakeLabel(vow: VowRow) {
  if (isPendingDare(vow)) return 'Dare sent';
  return vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)} on the line` : '$0 on the line';
}

function targetLabel(vow: VowRow) {
  if (vow.target_phone) return `Target ${vow.target_phone.slice(-4)}`;
  return 'Dare target';
}

function sentDareStatus(vow: VowRow) {
  if (vow.challenge_status === 'accepted') return vow.status === 'awaiting_verdict' ? 'Time to judge' : 'You judge';
  if (vow.challenge_status === 'declined') return 'Backed down';
  if (vow.challenge_status === 'expired') return 'Expired';
  return 'Waiting';
}

function sentDareNextStep(vow: VowRow) {
  if (vow.challenge_status === 'accepted') return vow.status === 'awaiting_verdict' ? 'deliver the verdict' : `${timeLabel(vow)} until verdict`;
  if (vow.challenge_status === 'declined') return 'closed cleanly';
  if (vow.challenge_status === 'expired') return 'no response';
  return 'waiting on their answer';
}

function sentDareTone(vow: VowRow): 'gold' | 'green' | 'orange' | 'red' | 'blue' {
  if (vow.challenge_status === 'accepted') return vow.status === 'awaiting_verdict' ? 'orange' : 'green';
  if (vow.challenge_status === 'declined' || vow.challenge_status === 'expired') return 'red';
  return 'orange';
}

function witnessLabel(vow: VowRow) {
  if (isPendingDare(vow)) return 'Waiting on dare target';
  if (isAcceptedDare(vow)) return `${vow.witness_name || 'The challenger'} judges`;
  if (vow.witness_name === 'Just me') return 'You judge this one';
  if (vow.witness_accepted_at) return `${vow.witness_name || 'Witness'} is watching`;
  if (vow.witness_name) return `Waiting on ${vow.witness_name}`;
  return 'Needs witness';
}

function verdictTitle(vow: VowRow) {
  return isAcceptedDare(vow) ? 'Your dare needs a verdict.' : 'Your vow needs a verdict.';
}

function verdictBody(vow: VowRow) {
  if (isAcceptedDare(vow)) return `${vow.witness_name || 'The challenger'} makes the call. Keep this open until the outcome lands.`;
  return 'Open it to nudge the witness or make the call if they never accepted.';
}

function makerLabel(vow: VowRow) {
  return vow.witness_name || 'Your friend';
}

function isWaitingWitness(vow: VowRow) {
  return vow.vow_type !== 'challenge' && vow.status === 'active' && !vow.witness_accepted_at && vow.witness_name !== 'Just me' && Boolean(vow.witness_invite_token);
}

function isPendingDare(vow: VowRow) {
  return vow.vow_type === 'challenge' && vow.challenge_status === 'pending';
}

function isAcceptedDare(vow: VowRow) {
  return vow.vow_type === 'challenge' && vow.challenge_status === 'accepted';
}

function statusLabel(vow: VowRow) {
  if (isPendingDare(vow)) return 'Dare pending';
  if (isWaitingWitness(vow)) return 'One tap away';
  if (vow.status === 'awaiting_verdict') return 'Verdict due';
  if (vow.status === 'kept') return 'Kept';
  if (vow.status === 'broken') return 'Broken';
  return 'Active';
}

function timeLabel(vow: VowRow) {
  if (isPendingDare(vow)) return 'Expires in 48h';
  if (!vow.ends_at) return 'No deadline';
  const ms = new Date(vow.ends_at).getTime() - Date.now();
  if (ms <= 0) return 'Time is up';
  const days = Math.ceil(ms / 86400000);
  return days <= 1 ? 'Due today' : `${days} days left`;
}

const styles = StyleSheet.create({
  topbar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: uvFonts.serifMedium,
    fontSize: 14,
    color: uvColors.text,
  },
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.5,
    color: uvColors.textKicker,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontFamily: uvFonts.sansSemibold,
    color: uvColors.goldBright,
  },
  actions: {
    marginTop: 18,
    gap: 12,
  },
  quietActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
});

import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Clock3, MessageCircle, Share2, ShieldCheck, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { hapticPrimary, hapticSelection } from '@/lib/haptics';
import { getVowDetail, resendWitnessInvite, type VowRow } from '@/lib/vow-api';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { useVowFlow } from '@/providers/vow-flow';

type DetailVow = {
  id: string;
  title: string;
  status: VowRow['status'] | 'local';
  stake: number;
  witness: string;
  destination: string;
  endsAt: string | null;
  token?: string | null;
  local?: boolean;
};

export default function NativeVowDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    local?: string;
    title?: string;
    stake?: string;
    witness?: string;
    destination?: string;
    endsAt?: string;
    status?: DetailVow['status'];
  }>();
  const { vow, activeVowText } = useVowFlow();
  const paramId = stringParam(params.id);
  const paramLocal = stringParam(params.local);
  const paramTitle = stringParam(params.title);
  const paramStake = stringParam(params.stake);
  const paramWitness = stringParam(params.witness);
  const paramDestination = stringParam(params.destination);
  const paramEndsAt = stringParam(params.endsAt);
  const paramStatus = stringParam(params.status) as DetailVow['status'] | undefined;
  const fallbackStakeAmount = vow.stake.amount;
  const fallbackDestination = vow.stake.destination;
  const fallbackWitnessName = vow.witnessName;
  const fallbackDeadlineIso = vow.deadlineIso;
  const fallbackWitnessInviteToken = vow.witnessInviteToken;
  const [detail, setDetail] = useState<DetailVow | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inviteHandoffOpened, setInviteHandoffOpened] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (paramLocal === '1' || paramId === 'local-native-draft') {
          const local = makeLocalDetail({
            title: paramTitle,
            stake: paramStake,
            witness: paramWitness,
            destination: paramDestination,
            endsAt: paramEndsAt,
            status: paramStatus,
          }, {
            activeVowText,
            deadlineIso: fallbackDeadlineIso,
            destination: fallbackDestination,
            stakeAmount: fallbackStakeAmount,
            witnessInviteToken: fallbackWitnessInviteToken,
            witnessName: fallbackWitnessName,
          });
          if (!cancelled) setDetail(local);
          return;
        }
        if (!paramId) {
          if (!cancelled) setDetail(makeLocalDetail({
            title: paramTitle,
            stake: paramStake,
            witness: paramWitness,
            destination: paramDestination,
            endsAt: paramEndsAt,
            status: paramStatus,
          }, {
            activeVowText,
            deadlineIso: fallbackDeadlineIso,
            destination: fallbackDestination,
            stakeAmount: fallbackStakeAmount,
            witnessInviteToken: fallbackWitnessInviteToken,
            witnessName: fallbackWitnessName,
          }));
          return;
        }
        const row = await getVowDetail(paramId);
        if (!cancelled) setDetail(row ? toDetailVow(row) : makeLocalDetail({
          title: paramTitle,
          stake: paramStake,
          witness: paramWitness,
          destination: paramDestination,
          endsAt: paramEndsAt,
          status: paramStatus,
        }, {
          activeVowText,
          deadlineIso: fallbackDeadlineIso,
          destination: fallbackDestination,
          stakeAmount: fallbackStakeAmount,
          witnessInviteToken: fallbackWitnessInviteToken,
          witnessName: fallbackWitnessName,
        }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    activeVowText,
    paramDestination,
    paramEndsAt,
    paramId,
    paramLocal,
    paramStake,
    paramStatus,
    paramTitle,
    paramWitness,
    fallbackDeadlineIso,
    fallbackDestination,
    fallbackStakeAmount,
    fallbackWitnessInviteToken,
    fallbackWitnessName,
  ]);

  const witnessName = detail?.witness && detail.witness !== 'Your witness' ? detail.witness : 'your witness';
  const inviteUrl = detail?.token ? `https://unbreakablevow.app/w/${detail.token}` : 'https://unbreakablevow.app/dashboard';
  const needsWitness = detail?.status === 'sealed' || detail?.status === 'local';
  const isActive = detail?.status === 'active';
  const isAwaitingVerdict = detail?.status === 'awaiting_verdict';
  const isKept = detail?.status === 'kept';
  const isBroken = detail?.status === 'broken';
  const isOutcome = isKept || isBroken;
  const isAntiCause = detail?.destination === 'NRA' || detail?.destination === 'PETA';
  const witnessDisplayName = witnessName === 'your witness' ? 'your witness' : witnessName;
  const hasNamedWitness = witnessDisplayName !== 'your witness';
  const activeJudgeName = witnessDisplayName === 'your witness' ? 'Your witness' : witnessDisplayName;
  const topStatus = needsWitness
    ? 'One tap away'
    : isAwaitingVerdict
      ? 'Verdict due'
      : isKept
        ? 'KEPT'
        : isBroken
          ? 'BROKEN'
          : 'Vow live';
  const heroTitle = needsWitness
    ? inviteHandoffOpened
      ? hasNamedWitness ? `Waiting on\n${witnessDisplayName}.` : 'Waiting for\na witness.'
      : hasNamedWitness ? `Send ${witnessDisplayName}\nthe invite.` : 'Share the\ninvite.'
    : isAwaitingVerdict
      ? `Time's up.\n${capitalize(witnessDisplayName)} decides.`
      : isKept
        ? isAntiCause ? 'Crisis averted.' : 'You actually did it.'
        : isBroken
          ? isAntiCause ? 'Brutal. You broke it.' : 'You broke it.'
          : 'Vow live';
  const heroSubtitle = needsWitness
    ? inviteHandoffOpened
      ? hasNamedWitness
        ? `If you sent the text, you’re done for now. ${capitalize(witnessDisplayName)} must accept before the vow starts.`
        : 'If you shared the link, you’re done for now. Whoever accepts becomes your witness.'
      : hasNamedWitness
        ? `${capitalize(witnessDisplayName)} accepts, then the vow starts.`
        : 'Whoever accepts becomes your witness. Then the vow starts.'
    : isAwaitingVerdict
      ? 'They have the verdict link. Give them a nudge if you need to.'
      : isKept
        ? isAntiCause ? `$${detail?.stake ?? 0} stayed away from ${detail?.destination ?? 'the cause'}.` : `${activeJudgeName} confirmed. Your word is gold.`
        : isBroken
          ? detail?.stake ? `$${detail.stake} goes to ${detail.destination}.` : 'The vow was not honored.'
          : `${activeJudgeName} decides if you kept your word.`;

  const shareInvite = async () => {
    if (!detail) return;
    hapticPrimary();
    setSending(true);
    try {
      if (!detail.local && detail.id) {
        await resendWitnessInvite(detail.id).catch(() => ({ success: false }));
      }
      await Share.share({
        message: `Hey, did you see my vow? "${detail.title.replace(/\.$/, '')}" I put $${detail.stake} on it. I need you to accept: ${inviteUrl}`,
      });
      setInviteHandoffOpened(true);
    } catch {
      Alert.alert('Invite not sent', 'Try again from the live web dashboard.');
    } finally {
      setSending(false);
    }
  };

  const nudgeWitness = async () => {
    if (!detail) return;
    hapticPrimary();
    try {
      await Share.share({
        message: `Still holding my vow: "${detail.title}" - $${detail.stake} on the line. Just checking in`,
      });
    } catch {
      Alert.alert('Nudge unavailable', 'Try again in a moment.');
    }
  };

  const copyInviteLink = async () => {
    hapticSelection();
    await Clipboard.setStringAsync(inviteUrl);
    Alert.alert('Copied!', 'Invite link copied.');
  };

  const shareVow = async () => {
    if (!detail) return;
    hapticSelection();
    await Share.share({
      message: `My vow: "${detail.title}" - $${detail.stake} on the line`,
    });
  };

  const askEarlyRelease = async () => {
    if (!detail) return;
    hapticPrimary();
    try {
      await Share.share({
        message: `I finished my vow early: "${detail.title}". Can you release me?`,
      });
    } catch {
      Alert.alert('Share unavailable', 'Try again in a moment.');
    }
  };

  const startNewVow = () => {
    hapticPrimary();
    router.push('/native-quick-vow' as never);
  };

  const backToDashboard = () => {
    hapticSelection();
    router.replace('/native-dashboard' as never);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#17130e', '#0f0d0a', '#090806']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.haloTop} />
      <SafeAreaView style={styles.flex}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topbar}>
            <Pressable
              onPress={() => {
                hapticSelection();
                router.replace('/native-dashboard' as never);
              }}
              style={styles.iconButton}
              hitSlop={10}
            >
              <ArrowLeft color={uvColors.textMuted} size={20} />
            </Pressable>
            <Text style={[
              styles.topTitle,
              isKept && styles.topTitleSuccess,
              isBroken && styles.topTitleDanger,
            ]}>{topStatus}</Text>
            <View style={styles.iconButtonGhost} />
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={uvColors.goldBright} />
              <Text style={styles.loadingText}>Loading vow</Text>
            </View>
          ) : null}

          {!loading && detail ? (
            <>
              {!isActive ? (
                <>
                  <View style={styles.statusHalo}>
                    {isBroken ? (
                      <X color={uvColors.danger} size={34} />
                    ) : isKept ? (
                      <Check color={uvColors.success} size={34} />
                    ) : (
                      <ShieldCheck color={needsWitness || isAwaitingVerdict ? uvColors.warn : uvColors.success} size={34} />
                    )}
                  </View>
                  <Text style={styles.title}>
                    {heroTitle}
                  </Text>
                  <Text style={styles.subtitle}>
                    {heroSubtitle}
                  </Text>
                </>
              ) : null}

              <View style={styles.vowCard}>
                <Text style={styles.cardLabel}>The vow</Text>
                <Text style={styles.vowText}>{detail.title}</Text>
                <View style={styles.rule} />
                <View style={styles.grid}>
                  <View>
                    <Text style={styles.gridLabel}>{isOutcome ? 'Stake' : 'On the line'}</Text>
                    <Text style={[
                      styles.gridValue,
                      isKept && styles.successText,
                      isBroken && styles.dangerText,
                    ]}>${detail.stake}</Text>
                  </View>
                  <View>
                    <Text style={styles.gridLabel}>{isBroken ? 'Consequence' : isKept ? 'Witnessed by' : 'Goes to'}</Text>
                    <Text style={styles.gridValue}>{isKept ? activeJudgeName : detail.destination}</Text>
                  </View>
                </View>
              </View>

              {!isOutcome ? <View style={styles.timeCard}>
                <View style={styles.timeIcon}>
                  <Clock3 color={uvColors.goldBright} size={20} />
                </View>
                <View style={styles.timeCopy}>
                  <Text style={styles.timeLabel}>{needsWitness ? 'Next move' : isAwaitingVerdict ? 'Now we wait' : 'Time left'}</Text>
                  <Text style={styles.timeValue}>
                    {needsWitness
                      ? `${capitalize(witnessDisplayName)} accepts`
                      : isAwaitingVerdict
                        ? `${capitalize(witnessDisplayName)} decides`
                        : (detail.endsAt ? formatVerdict(detail.endsAt) : 'When time is up')}
                  </Text>
                </View>
                <Text style={styles.timeAside}>{timeLeftLabel(detail.endsAt)}</Text>
              </View> : null}

              {!isOutcome ? <View style={styles.nextCard}>
                <Text style={styles.cardLabel}>What happens next</Text>
                <TimelineRow active label={needsWitness ? 'Next move' : isAwaitingVerdict ? 'Now we wait' : 'Keep going'} text={needsWitness ? (inviteHandoffOpened ? (hasNamedWitness ? `${capitalize(witnessDisplayName)} accepts the job.` : 'A witness accepts the job.') : (hasNamedWitness ? `Text ${witnessDisplayName} the invite.` : 'Share the witness link.')) : isAwaitingVerdict ? (detail.stake ? 'Kept means wallet untouched. Broken means donation.' : 'Kept means honored. Broken means the record stands.') : `${activeJudgeName} decides if you kept your word.`} />
                <TimelineRow label="During" text="Nudge them if you start slipping." />
                <TimelineRow label="Verdict" text="One tap: kept it or broke it." last />
              </View> : null}
            </>
          ) : null}
        </ScrollView>

        {detail ? (
          <View style={styles.footer}>
            {needsWitness ? (
              <Pressable onPress={inviteHandoffOpened ? backToDashboard : shareInvite} disabled={sending} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
                <LinearGradient colors={[uvColors.goldBright, uvColors.gold, uvColors.goldDeep]} style={styles.ctaGradient}>
                  <MessageCircle color={uvColors.textOnGold} size={19} strokeWidth={3} />
                  <Text style={styles.ctaText}>
                    {sending
                      ? 'Opening...'
                      : inviteHandoffOpened
                        ? 'Done'
                        : hasNamedWitness
                          ? `Text ${witnessDisplayName} the invite`
                          : 'Share witness invite'}
                  </Text>
                </LinearGradient>
              </Pressable>
            ) : isOutcome ? (
              <Pressable onPress={isKept ? shareVow : startNewVow} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
                <LinearGradient colors={[uvColors.goldBright, uvColors.gold, uvColors.goldDeep]} style={styles.ctaGradient}>
                  <Share2 color={uvColors.textOnGold} size={19} strokeWidth={3} />
                  <Text style={styles.ctaText}>{isKept ? 'Share your win' : 'Make a new vow'}</Text>
                </LinearGradient>
              </Pressable>
            ) : isAwaitingVerdict ? (
              <Pressable onPress={nudgeWitness} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
                <LinearGradient colors={[uvColors.goldBright, uvColors.gold, uvColors.goldDeep]} style={styles.ctaGradient}>
                  <MessageCircle color={uvColors.textOnGold} size={19} strokeWidth={3} />
                  <Text style={styles.ctaText}>Nudge {witnessName} to decide</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable onPress={nudgeWitness} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
                <LinearGradient colors={[uvColors.goldBright, uvColors.gold, uvColors.goldDeep]} style={styles.ctaGradient}>
                  <Share2 color={uvColors.textOnGold} size={19} strokeWidth={3} />
                  <Text style={styles.ctaText}>Text {witnessName} a check-in</Text>
                </LinearGradient>
              </Pressable>
            )}
            <Pressable onPress={needsWitness ? (inviteHandoffOpened ? shareInvite : copyInviteLink) : isOutcome || isAwaitingVerdict ? backToDashboard : askEarlyRelease} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>{needsWitness ? (inviteHandoffOpened ? (hasNamedWitness ? 'Text again' : 'Share again') : 'Copy invite link') : isOutcome || isAwaitingVerdict ? 'Back to dashboard' : `Ask ${witnessName} to release me early`}</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function TimelineRow({ label, text, active, last }: { label: string; text: string; active?: boolean; last?: boolean }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineMarkerWrap}>
        <View style={[styles.timelineDot, active && styles.timelineDotActive]} />
        {!last ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineCopy}>
        <Text style={[styles.timelineLabel, active && styles.timelineLabelActive]}>{label}</Text>
        <Text style={styles.timelineText}>{text}</Text>
      </View>
    </View>
  );
}

function stringParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function makeLocalDetail(
  params: {
    title?: string;
    stake?: string;
    witness?: string;
    destination?: string;
    endsAt?: string;
    status?: DetailVow['status'];
  },
  fallback: {
    activeVowText: string;
    deadlineIso: string | null;
    destination: string;
    stakeAmount: number;
    witnessInviteToken: string | null;
    witnessName: string;
  },
): DetailVow {
  return {
    id: 'local-native-draft',
    title: params.title || fallback.activeVowText || 'Your vow.',
    status: params.status || 'local',
    stake: Number(params.stake || fallback.stakeAmount || 50),
    witness: params.witness || fallback.witnessName || 'Your witness',
    destination: params.destination || fallback.destination || 'ALS Association',
    endsAt: params.endsAt || fallback.deadlineIso,
    token: fallback.witnessInviteToken,
    local: true,
  };
}

function toDetailVow(row: VowRow): DetailVow {
  return {
    id: row.id,
    title: row.refined_text || row.raw_input || 'Untitled vow',
    status: row.status,
    stake: Math.round((row.stake_amount || 0) / 100),
    witness: row.witness_name || 'Your witness',
    destination: row.destination || 'ALS Association',
    endsAt: row.ends_at,
    token: row.witness_invite_token,
  };
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function formatVerdict(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timeLeftLabel(iso: string | null) {
  if (!iso) return 'No deadline';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Due now';
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `${days}d left`;
  const hours = Math.max(1, Math.ceil(diff / 3600000));
  return `${hours}h left`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: uvColors.bg },
  haloTop: {
    position: 'absolute',
    width: 430,
    height: 430,
    borderRadius: 215,
    right: -200,
    top: -140,
    backgroundColor: 'rgba(200,155,60,0.13)',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 170,
    gap: 10,
  },
  topbar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,233,219,0.04)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
  },
  iconButtonGhost: { width: 42, height: 42 },
  topTitle: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  topTitleSuccess: { color: uvColors.success },
  topTitleDanger: { color: uvColors.danger },
  loadingCard: {
    minHeight: 260,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(24,21,18,0.84)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
  },
  loadingText: { color: uvColors.textMuted, fontFamily: uvFonts.sansMedium, fontSize: 14 },
  statusHalo: {
    width: 64,
    height: 64,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(200,155,60,0.12)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
  },
  title: {
    color: uvColors.text,
    fontFamily: uvFonts.serifMedium,
    fontSize: 37,
    lineHeight: 39,
    textAlign: 'center',
  },
  subtitle: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sans,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 330,
    alignSelf: 'center',
  },
  vowCard: {
    borderRadius: 24,
    padding: 16,
    gap: 10,
    backgroundColor: 'rgba(24,21,18,0.88)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
  },
  cardLabel: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  vowText: { color: uvColors.text, fontFamily: uvFonts.sansSemibold, fontSize: 24, lineHeight: 29 },
  rule: { height: 1, backgroundColor: uvColors.borderSoft },
  grid: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  gridLabel: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  gridValue: { color: uvColors.text, fontFamily: uvFonts.sansSemibold, fontSize: 17 },
  successText: { color: uvColors.success },
  dangerText: { color: uvColors.danger },
  timeCard: {
    minHeight: 68,
    borderRadius: 22,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: 'rgba(24,21,18,0.82)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
  },
  timeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uvColors.goldSoft,
  },
  timeCopy: { flex: 1, gap: 4 },
  timeLabel: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 2.3,
    textTransform: 'uppercase',
  },
  timeValue: { color: uvColors.text, fontFamily: uvFonts.sansSemibold, fontSize: 16 },
  timeAside: { color: uvColors.goldBright, fontFamily: uvFonts.sansSemibold, fontSize: 13 },
  nextCard: {
    borderRadius: 24,
    padding: 15,
    gap: 9,
    backgroundColor: 'rgba(24,21,18,0.82)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
  },
  timelineRow: { flexDirection: 'row', gap: 11, minHeight: 38 },
  timelineMarkerWrap: { width: 18, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: uvColors.textDim, marginTop: 5 },
  timelineDotActive: { backgroundColor: uvColors.goldBright, shadowColor: uvColors.gold, shadowOpacity: 0.5, shadowRadius: 10 },
  timelineLine: { flex: 1, width: 1, marginTop: 6, backgroundColor: uvColors.borderSoft },
  timelineCopy: { flex: 1, gap: 2, paddingBottom: 7 },
  timelineLabel: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  timelineLabelActive: { color: uvColors.goldBright },
  timelineText: { color: uvColors.textMuted, fontFamily: uvFonts.sansMedium, fontSize: 15, lineHeight: 19 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 8,
    backgroundColor: 'rgba(15,13,10,0.94)',
    borderTopWidth: 1,
    borderTopColor: uvColors.borderSoft,
  },
  cta: {
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    shadowColor: uvColors.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
  },
  ctaPressed: { transform: [{ scale: 0.985 }] },
  ctaGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  ctaText: { color: uvColors.textOnGold, fontFamily: uvFonts.sansSemibold, fontSize: 18 },
  secondaryButton: { alignItems: 'center', paddingVertical: 8 },
  secondaryText: { color: uvColors.textMuted, fontFamily: uvFonts.sansSemibold, fontSize: 14 },
});

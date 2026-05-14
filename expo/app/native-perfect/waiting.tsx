/**
 * Screens 08 / 08B / 08C — Waiting for witness.
 *
 * The copy changes depending on whether the maker has opened Messages/share.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Platform, Share, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChromeHeader, GoldCTA, QuietPill, WaitCard } from '@/components/primitives';
import { hapticPrimary, hapticSecondary } from '@/lib/haptics';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';
import { getVowDetail, switchToSoloWitness } from '@/lib/vow-api';
import { displayWitnessUrl, getWitnessUrl } from '@/lib/witness-url';

function paramText(value: string | string[] | undefined, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export default function WaitingWitnessScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [busy, setBusy] = useState(false);

  const vow = paramText(params.rawInput || params.vow, 'Run every morning this week');
  const vowId = paramText(params.vowId, '');
  const witnessNameRaw = paramText(params.witnessName, '');
  const witnessName = witnessNameRaw ? firstName(witnessNameRaw) : '';
  const witnessPhone = paramText(params.witnessPhone, '');
  const witnessToken = paramText(params.witnessInviteToken || params.token, '');
  const witnessUrl = paramText(params.witnessUrl, '') || getWitnessUrl(witnessToken);
  const stake = paramText(params.stakeAmount || params.stake, '50').replace(/[^\d]/g, '') || '50';
  const inviteSent = paramText(params.inviteSent, '0') === '1';
  const named = Boolean(witnessName);
  const hasWitnessLink = Boolean(witnessUrl);

  React.useEffect(() => {
    let alive = true;
    if (!vowId) return () => { alive = false; };
    getVowDetail(vowId).then(row => {
      if (!alive || !row) return;
      if (row.witness_accepted_at || row.witness_name === 'Just me') {
        router.replace({ pathname: '/native-perfect/vow-detail', params: { vowId } } as never);
      }
    });
    return () => { alive = false; };
  }, [vowId]);

  const message = useMemo(() => {
    const namePrefix = named ? `${witnessName}, ` : '';
    return `${namePrefix}I vowed to ${vow}. $${stake} if I break it. You decide if I kept it: ${witnessUrl}`;
  }, [named, stake, vow, witnessName, witnessUrl]);

  const remind = useCallback(async () => {
    setBusy(true);
    hapticPrimary();
    if (!hasWitnessLink) {
      setBusy(false);
      return;
    }
    try {
      if (witnessPhone) {
        const separator = Platform.OS === 'ios' ? '&' : '?';
        await Linking.openURL(`sms:${witnessPhone}${separator}body=${encodeURIComponent(message)}`);
      } else {
        await Share.share({ title: 'Witness my vow', message, url: witnessUrl });
      }
    } catch {
      await Share.share({ title: 'Witness my vow', message, url: witnessUrl }).catch(() => {});
    } finally {
      setBusy(false);
    }
  }, [hasWitnessLink, message, witnessPhone, witnessUrl]);

  const copyLink = useCallback(async () => {
    hapticSecondary();
    if (!hasWitnessLink) return;
    await Share.share({ title: 'Witness my vow', message, url: witnessUrl }).catch(() => {});
  }, [hasWitnessLink, message, witnessUrl]);

  const judgeMyself = useCallback(async () => {
    hapticSecondary();
    if (vowId) {
      await switchToSoloWitness(vowId).catch(() => null);
    }
    router.replace({
      pathname: vowId ? '/native-perfect/vow-detail' : '/native-perfect/dashboard',
      params: vowId ? { vowId } : {},
    } as never);
  }, [vowId]);

  const pill = inviteSent ? 'INVITE SENT' : 'ONE TAP AWAY';
  const headlineName = named ? witnessName : 'your witness';
  const title = inviteSent
    ? `Waiting for ${headlineName}.`
    : named
      ? `Now get ${witnessName} in.`
      : 'Now get your witness in.';
  const body = inviteSent
    ? `Your vow is sealed. ${named ? witnessName : 'Your witness'} has the invite. Once ${named ? 'they accept' : 'they accept'}, it begins.`
    : `Your vow is sealed. ${named ? witnessName : 'Your witness'} needs to accept before it starts.`;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[uvColors.bgCard, uvColors.bgGradMid, uvColors.bgGradDeep]}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ChromeHeader
          onBack={() => router.replace('/dashboard')}
          centerText=""
        />

        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{pill}</Text>
        </View>

        <Text style={styles.title}>
          {named ? (
            <>
              {inviteSent ? 'Waiting for ' : 'Now get '}
              <Text style={styles.goldItalic}>{headlineName}</Text>.
            </>
          ) : title}
        </Text>
        <Text style={styles.body}>{body}</Text>

        <WaitCard
          title={inviteSent ? 'Waiting for acceptance.' : 'Send the invite.'}
          subtitle={inviteSent
            ? `We’ll update this page when ${named ? witnessName : 'your witness'} is in.`
            : `${named ? witnessName : 'Your witness'} accepts, then the vow starts.`}
        >
          <Text style={styles.vowQuote}>“{vow}.”</Text>
          <GoldCTA
            label={busy ? 'Opening...' : inviteSent ? `Remind ${named ? witnessName : 'them'}` : named ? `Text ${witnessName} the invite` : 'Share the invite'}
            disabled={busy || !hasWitnessLink}
            onPress={remind}
          />
          <Text style={styles.smallText}>
            {inviteSent ? 'You can text them again or copy the link.' : 'Use Messages, share sheet, or copy the link.'}
          </Text>
          <View style={styles.linkRow}>
            <Text style={styles.url} numberOfLines={1}>{hasWitnessLink ? displayWitnessUrl(witnessUrl) : 'Witness link unavailable'}</Text>
            <QuietPill label="Copy link" onPress={copyLink} />
          </View>
        </WaitCard>

        <QuietPill label="Judge it myself instead" onPress={judgeMyself} />

        <Text style={styles.nextKicker}>WHAT HAPPENS NEXT</Text>
        <View style={styles.timeline}>
          <Text style={styles.timelineLine}>Now · {named ? witnessName : 'Your witness'} accepts the job.</Text>
          <Text style={styles.timelineLine}>During · They keep you honest.</Text>
          <Text style={styles.timelineLine}>Verdict · One tap: kept or broken.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: uvColors.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: uvSpacing.xl,
    paddingBottom: 56,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 99,
    backgroundColor: 'rgba(245,154,61,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 34,
  },
  statusPillText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: uvColors.warn,
  },
  title: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 46,
    lineHeight: 46 * 1.02,
    color: uvColors.text,
    marginTop: 22,
  },
  goldItalic: {
    fontFamily: uvFonts.serifItalic,
    color: uvColors.gold,
  },
  body: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 17,
    lineHeight: 17 * 1.32,
    color: uvColors.textMuted,
    marginTop: 12,
    marginBottom: 26,
  },
  vowQuote: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 25,
    lineHeight: 25 * 1.12,
    color: uvColors.text,
    marginBottom: 14,
  },
  smallText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    lineHeight: 12 * 1.35,
    color: uvColors.textNote,
    textAlign: 'center',
    marginTop: 10,
  },
  linkRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  url: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.12)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 13,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    color: uvColors.textDim,
  },
  nextKicker: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
    color: uvColors.textKicker,
    marginTop: 28,
    marginBottom: 12,
  },
  timeline: {
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.1)',
    borderRadius: 22,
    backgroundColor: 'rgba(16,14,11,0.72)',
    padding: 18,
    gap: 14,
  },
  timelineLine: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    lineHeight: 15 * 1.32,
    color: uvColors.textMuted,
  },
});

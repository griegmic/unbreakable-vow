/**
 * Screens 07 / 07B — Post-seal witness invite.
 *
 * The vow is sealed, but not socially complete until the maker sends the
 * witness link. This screen opens Messages/share and then routes to the calmer
 * returned-after-messages waiting state.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldCTA, MessagePreviewCard, QuietPill, SealMark } from '@/components/primitives';
import { hapticPrimary, hapticSecondary } from '@/lib/haptics';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';
import { displayWitnessUrl, getWitnessUrl } from '@/lib/witness-url';

function paramText(value: string | string[] | undefined, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export default function PostSealInviteScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [busy, setBusy] = useState(false);

  const vowId = paramText(params.vowId, 'local-vow');
  const vow = paramText(params.rawInput || params.vow, 'Run every morning this week');
  const witnessNameRaw = paramText(params.witnessName, '');
  const witnessName = witnessNameRaw ? firstName(witnessNameRaw) : '';
  const witnessPhone = paramText(params.witnessPhone, '');
  const stake = paramText(params.stakeAmount || params.stake, '50').replace(/[^\d]/g, '') || '50';
  const witnessToken = paramText(params.witnessInviteToken || params.token, '');
  const witnessUrl = paramText(params.witnessUrl, '') || getWitnessUrl(witnessToken);
  const hasNamedWitness = Boolean(witnessName);
  const hasWitnessLink = Boolean(witnessUrl);

  const message = useMemo(() => {
    const namePrefix = hasNamedWitness ? `${witnessName}, ` : '';
    return `${namePrefix}I vowed to ${vow}. $${stake} if I break it. You decide if I kept it: ${witnessUrl}`;
  }, [hasNamedWitness, stake, vow, witnessName, witnessUrl]);

  const routeWaiting = useCallback((sent: boolean) => {
    router.replace({
      pathname: '/native-perfect/waiting',
      params: {
        ...params,
        inviteSent: sent ? '1' : '0',
        witnessName,
        witnessPhone,
        witnessUrl,
        rawInput: vow,
        stakeAmount: stake,
      },
    } as never);
  }, [params, stake, vow, witnessName, witnessPhone, witnessUrl]);

  const markAttempted = useCallback(async () => {
    await AsyncStorage.setItem(`sms_open_attempted:${vowId}`, '1').catch(() => {});
  }, [vowId]);

  const openShare = useCallback(async () => {
    setBusy(true);
    hapticPrimary();
    if (!hasWitnessLink) {
      setBusy(false);
      routeWaiting(false);
      return;
    }
    try {
      await markAttempted();
      if (witnessPhone) {
        const separator = Platform.OS === 'ios' ? '&' : '?';
        const smsUrl = `sms:${witnessPhone}${separator}body=${encodeURIComponent(message)}`;
        await Linking.openURL(smsUrl);
      } else {
        await Share.share({ title: 'Witness my vow', message, url: witnessUrl });
      }
      routeWaiting(true);
    } catch {
      try {
        await Share.share({ title: 'Witness my vow', message, url: witnessUrl });
        routeWaiting(true);
      } catch {
        routeWaiting(false);
      }
    } finally {
      setBusy(false);
    }
  }, [hasWitnessLink, markAttempted, message, routeWaiting, witnessPhone, witnessUrl]);

  const copyLink = useCallback(async () => {
    hapticSecondary();
    if (!hasWitnessLink) return;
    await Share.share({ title: 'Witness my vow', message, url: witnessUrl }).catch(() => {});
  }, [hasWitnessLink, message, witnessUrl]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[uvColors.bgCard, uvColors.bgGradMid, uvColors.bgGradDeep]}
        locations={[0, 0.54, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <View style={styles.content}>
        <SealMark variant="round" glyph="✓" size={108} />
        <Text style={styles.kicker}>NEXT</Text>
        <Text style={styles.title}>
          {hasNamedWitness ? (
            <>Send {witnessName} the{'\n'}<Text style={styles.goldItalic}>invite.</Text></>
          ) : (
            <>Share the{'\n'}<Text style={styles.goldItalic}>invite.</Text></>
          )}
        </Text>
        <Text style={styles.sub}>
          {hasNamedWitness ? `${witnessName} accepts, then the vow starts.` : 'Your witness accepts, then the vow starts.'}
        </Text>

        <MessagePreviewCard
          kicker={hasNamedWitness ? `Your text to ${witnessName}` : 'Your witness invite'}
          messageText={hasWitnessLink ? message.replace(` ${witnessUrl}`, '') : 'Your witness link is still being prepared.'}
          url={hasWitnessLink ? displayWitnessUrl(witnessUrl) : 'Link unavailable'}
        />
        <Text style={styles.help}>
          {hasNamedWitness ? 'We’ll open Messages. You choose when to send.' : 'Open the share sheet, or copy the link yourself.'}
        </Text>
      </View>

      <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <GoldCTA
          label={busy ? 'Opening...' : hasNamedWitness ? `Text ${witnessName} the invite` : 'Share the invite'}
          disabled={busy || !hasWitnessLink}
          onPress={openShare}
        />
        <View style={styles.quietRow}>
          <QuietPill label="Copy link" onPress={copyLink} />
          <QuietPill label="Send it later" onPress={() => routeWaiting(false)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: uvColors.bg,
    paddingHorizontal: uvSpacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 116,
    gap: 14,
  },
  kicker: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 5,
    color: uvColors.textKicker,
    textAlign: 'center',
    marginTop: 14,
  },
  title: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 45,
    lineHeight: 45 * 1.04,
    color: uvColors.text,
    textAlign: 'center',
  },
  goldItalic: {
    fontFamily: uvFonts.serifItalic,
    color: uvColors.gold,
  },
  sub: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 16,
    lineHeight: 16 * 1.28,
    color: uvColors.textMuted,
    textAlign: 'center',
    marginBottom: 14,
  },
  help: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    lineHeight: 13 * 1.35,
    color: uvColors.textNote,
    textAlign: 'center',
  },
  ctaWrap: {
    position: 'absolute',
    left: uvSpacing.xl,
    right: uvSpacing.xl,
    bottom: 0,
    gap: 12,
  },
  quietRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
});

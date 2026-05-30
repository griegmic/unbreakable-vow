/**
 * Screen 06 — Sealed Moment
 *
 * Lightweight native-perfect route so the dev payment skip has a real target.
 * The full post-seal sharing state machine lands with screens 07/08.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldCTA, SealMark } from '@/components/primitives';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';
import { getVowDetail } from '@/lib/vow-api';
import { getWitnessUrl } from '@/lib/witness-url';

function paramText(value: string | string[] | undefined, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export default function CreateSealedScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const vow = paramText(params.rawInput || params.vow, 'Gym 3x this week');
  const witness = paramText(params.witnessName, 'your witness');
  const vowId = paramText(params.vowId, '');
  const witnessInviteToken = paramText(params.witnessInviteToken, '');
  const witnessUrl = paramText(params.witnessUrl, '') || getWitnessUrl(witnessInviteToken);
  const inviteSent = paramText(params.inviteSent, '0') === '1';
  const witnessDecision = paramText(params.witnessDecision, '');
  const [witnessAccepted, setWitnessAccepted] = useState(false);
  const witnessFirstName = witness === 'your witness' ? '' : witness;
  const witnessDeferred = witnessDecision === 'deferred' || (!witnessInviteToken && witness === 'your witness');

  useEffect(() => {
    let alive = true;
    if (!vowId) return () => { alive = false; };
    getVowDetail(vowId).then(row => {
      if (!alive || !row) return;
      setWitnessAccepted(Boolean(row.witness_accepted_at));
    });
    return () => { alive = false; };
  }, [vowId]);

  const subcopy = useMemo(() => {
    if (witnessAccepted) return `${witnessFirstName || 'Your witness'} is watching.`;
    if (witnessDeferred) return 'Your vow is sealed. Add a witness when you are ready.';
    return witness === 'your witness' ? 'Now tell your witness.' : `Now ${witness} needs to know.`;
  }, [witness, witnessAccepted, witnessDeferred, witnessFirstName]);

  const ctaLabel = useMemo(() => {
    if (witnessAccepted) return 'See my vow';
    if (witnessDeferred) return vowId ? 'See my vow' : 'Go to dashboard';
    if (inviteSent) return 'See invite status';
    return witness === 'your witness' ? 'Share the link' : `Tell ${witness}`;
  }, [inviteSent, vowId, witness, witnessAccepted, witnessDeferred]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[uvColors.bgCard, uvColors.bgGradMid, uvColors.bgGradDeep]}
        locations={[0, 0.54, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <View style={styles.content}>
        <SealMark variant="square" glyph="✓" size={112} />
        <Text style={styles.kicker}>SEALED</Text>
        <Text style={styles.title}>
          Your vow is{'\n'}<Text style={styles.goldItalic}>bound.</Text>
        </Text>
        <Text style={styles.vow}>“{vow}”</Text>
        <Text style={styles.sub}>
          {subcopy}
        </Text>
      </View>

      <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <GoldCTA
          label={ctaLabel}
          onPress={() => {
            if ((witnessAccepted || witnessDeferred) && vowId) {
              router.replace({ pathname: '/native-perfect/vow-detail', params: { vowId } } as never);
              return;
            }
            if (witnessDeferred) {
              router.replace('/native-perfect/dashboard' as never);
              return;
            }
            if (inviteSent) {
              router.replace({
                pathname: '/native-perfect/waiting',
                params: {
                  ...params,
                  rawInput: vow,
                  witnessName: witness === 'your witness' ? '' : witness,
                  witnessInviteToken,
                  witnessUrl,
                  inviteSent: '1',
                },
              } as never);
              return;
            }
            router.replace({
              pathname: '/native-perfect/post-seal',
              params: {
                ...params,
                rawInput: vow,
                witnessName: witness === 'your witness' ? '' : witness,
                witnessInviteToken,
                witnessUrl,
              },
            } as never);
          }}
        />
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 86,
  },
  kicker: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    lineHeight: 12 * 1.2,
    fontWeight: '800',
    letterSpacing: 5,
    color: uvColors.goldBright,
    marginTop: 28,
  },
  title: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 48,
    lineHeight: 48 * 1.02,
    color: uvColors.text,
    textAlign: 'center',
    marginTop: 22,
  },
  goldItalic: {
    fontFamily: uvFonts.serifItalic,
    color: uvColors.gold,
  },
  vow: {
    fontFamily: uvFonts.serifItalic,
    fontSize: 22,
    lineHeight: 22 * 1.22,
    color: uvColors.text,
    textAlign: 'center',
    marginTop: 38,
  },
  sub: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: uvColors.textMuted,
    textAlign: 'center',
    marginTop: 18,
  },
  ctaWrap: {
    position: 'absolute',
    left: uvSpacing.xl,
    right: uvSpacing.xl,
    bottom: 0,
  },
});

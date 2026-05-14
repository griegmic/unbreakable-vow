import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionCard } from '@/components/native-perfect/ScreenScaffold';
import { GoldCTA, OutlinedGoldCTA, SealMark } from '@/components/primitives';
import { acceptWitnessInvite, declineWitnessInvite, getVowByWitnessToken, type WitnessVowData } from '@/lib/vow-api';
import { hapticPrimary, hapticVerdictBroken, hapticVerdictKept } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';

type Mode = 'loading' | 'invite' | 'accepted' | 'watching' | 'verdict' | 'resolved' | 'error';

export default function NativePerfectWitnessToken() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [mode, setMode] = useState<Mode>('loading');
  const [vow, setVow] = useState<WitnessVowData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    if (!token) {
      setMode('error');
      setError('This witness link is missing.');
      return;
    }
    getVowByWitnessToken(token).then(result => {
      if (!alive) return;
      if (!result.success || !result.vow) {
        setError(result.error || 'This witness link is no longer valid.');
        setMode('error');
        return;
      }
      setVow(result.vow);
      if (['kept', 'broken', 'voided'].includes(result.vow.status)) setMode('resolved');
      else if (result.vow.status === 'awaiting_verdict') setMode('verdict');
      else if (result.vow.witness_accepted_at) setMode('watching');
      else setMode('invite');
    });
    return () => { alive = false; };
  }, [token]);

  const makerName = useMemo(() => vow?.user_display_name?.split(' ')[0] || 'Someone', [vow?.user_display_name]);
  const stake = vow ? Math.round(vow.stake_amount / 100) : 50;
  const textMaker = async () => {
    if (!vow) return;
    const message = `I’m in. I’ve got you on "${vow.refined_text}".`;
    if (vow.maker_phone) {
      const separator = Platform.OS === 'ios' ? '&' : '?';
      await Linking.openURL(`sms:${vow.maker_phone}${separator}body=${encodeURIComponent(message)}`)
        .catch(() => Share.share({ message }));
      return;
    }
    await Share.share({ message });
  };

  const accept = async () => {
    if (!token) return;
    hapticPrimary();
    setBusy(true);
    const result = await acceptWitnessInvite(token);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not accept this invite.');
      setMode('error');
      return;
    }
    setMode(vow?.status === 'draft' ? 'accepted' : 'watching');
  };

  const decline = async () => {
    if (!token) return;
    setBusy(true);
    await declineWitnessInvite(token);
    setBusy(false);
    router.replace('/native-perfect/dashboard' as never);
  };

  const verdict = async (kept: boolean) => {
    if (!token) return;
    if (kept) hapticVerdictKept();
    else hapticVerdictBroken();
    setBusy(true);
    const { error: submitError } = await supabase.functions.invoke('submit-verdict', {
      body: { token, verdict: kept ? 'kept' : 'broken' },
    });
    setBusy(false);
    if (submitError) {
      setError('Could not submit that verdict. Try again.');
      setMode('error');
      return;
    }
    setMode('resolved');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[uvColors.bgCard, uvColors.bgGradMid, uvColors.bgGradDeep]}
        locations={[0, 0.54, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.content}>
        {mode === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator color={uvColors.goldBright} />
            <Text style={styles.muted}>Loading witness invite</Text>
          </View>
        ) : null}

        {mode === 'error' ? (
          <View style={styles.center}>
            <Text style={styles.title}>This link hit a snag.</Text>
            <Text style={styles.body}>{error}</Text>
            <GoldCTA label="Open dashboard" onPress={() => router.replace('/native-perfect/dashboard' as never)} />
          </View>
        ) : null}

        {vow && mode === 'invite' ? (
          <>
            <Text style={styles.brand}>Unbreakable Vow</Text>
            <Text style={styles.pill}>WITNESS INVITE</Text>
            <Text style={styles.title}>{makerName} wants you to{'\n'}<Text style={styles.goldItalic}>witness</Text> this vow.</Text>
            <Text style={styles.body}>They put money on their word. You decide if they kept it or broke it.</Text>
            <ActionCard
              meta="The vow"
              title={vow.refined_text}
              body={`${stake > 0 ? `$${stake}` : '$0'} on the line · Verdict ${deadline(vow)}`}
            />
            <GoldCTA label={busy ? 'Accepting...' : "I'll witness it"} disabled={busy} onPress={accept} />
            <OutlinedGoldCTA label={busy ? 'Working...' : 'Not this one'} onPress={decline} />
          </>
        ) : null}

        {vow && mode === 'accepted' ? (
          <View style={styles.center}>
            <SealMark variant="kept" glyph="✓" size={110} />
            <Text style={styles.pill}>YOU’RE IN</Text>
            <Text style={styles.title}>You’re holding{'\n'}{makerName} to it.</Text>
            <Text style={styles.body}>{makerName} still needs to seal the vow. We’ll tell them you accepted.</Text>
            <ActionCard meta="You’re watching" title={vow.refined_text} body={`${stake > 0 ? `$${stake}` : '$0'} on the line · ${vow.destination}`} tone="green" />
            <GoldCTA label="Done" onPress={() => router.replace('/native-perfect/dashboard' as never)} />
          </View>
        ) : null}

        {vow && mode === 'watching' ? (
          <>
            <Text style={styles.pill}>YOU’RE WATCHING</Text>
            <Text style={styles.title}>{makerName} knows{'\n'}you’ve got them.</Text>
            <Text style={styles.body}>That’s it for now. We’ll come back when the verdict is due.</Text>
            <ActionCard meta="The vow" title={vow.refined_text} body={`${stake > 0 ? `$${stake}` : '$0'} on the line · ${deadline(vow)}`} tone="green" />
            <GoldCTA label={`Text ${makerName}: I’ve got you`} onPress={textMaker} />
          </>
        ) : null}

        {vow && mode === 'verdict' ? (
          <>
            <Text style={styles.pill}>VERDICT TIME</Text>
            <Text style={styles.title}>Did {makerName}{'\n'}keep it?</Text>
            <ActionCard meta="The vow" title={vow.refined_text} body={`${stake > 0 ? `$${stake}` : '$0'} if broken · ${vow.destination}`} tone="orange" />
            <GoldCTA label={busy ? 'Submitting...' : 'Yes, they kept it'} disabled={busy} onPress={() => verdict(true)} />
            <OutlinedGoldCTA label={busy ? 'Submitting...' : 'No, they broke it'} onPress={() => verdict(false)} />
          </>
        ) : null}

        {vow && mode === 'resolved' ? (
          <View style={styles.center}>
            <SealMark variant={vow.status === 'broken' ? 'square' : 'kept'} glyph={vow.status === 'broken' ? '×' : '✓'} size={110} />
            <Text style={styles.pill}>VERDICT SENT</Text>
            <Text style={styles.title}>You held{'\n'}{makerName} accountable.</Text>
            <Text style={styles.body}>That’s the loop. Now make one of your own if you’re feeling brave.</Text>
            <GoldCTA label="Make your own vow" onPress={() => router.replace('/native-perfect/create/vow' as never)} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function deadline(vow: WitnessVowData) {
  if (!vow.ends_at) return 'soon';
  return new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: uvColors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: uvSpacing.xl,
    paddingTop: 86,
    paddingBottom: 34,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
  },
  brand: {
    fontFamily: uvFonts.serifMedium,
    fontSize: 17,
    color: uvColors.text,
    textAlign: 'center',
    marginBottom: 44,
  },
  pill: {
    alignSelf: 'center',
    borderRadius: 99,
    overflow: 'hidden',
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: 'rgba(245,154,61,0.16)',
    color: uvColors.warn,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 42,
    lineHeight: 42 * 1.05,
    color: uvColors.text,
    textAlign: 'center',
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
    textAlign: 'center',
  },
  muted: {
    fontFamily: uvFonts.sansSemibold,
    color: uvColors.textMuted,
    textAlign: 'center',
  },
});

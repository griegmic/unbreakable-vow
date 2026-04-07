import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Check, CircleDollarSign } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Constants from 'expo-constants';

import { RitualCard, RitualScreen, TitleBlock } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

const extra = Constants.expoConfig?.extra;
const SUPABASE_URL = extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://faufcfppnkwrxabgvknt.supabase.co';
const SUPABASE_ANON_KEY = extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhdWZjZnBwbmt3cnhhYmd2a250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzQyNDYsImV4cCI6MjA5MDg1MDI0Nn0.s82fzQzwSo6XvIp1tLUsomeELkZcDOs16IupjkGA4OM';

type VerdictChoice = 'kept' | 'broken' | null;

export default function WitnessVerdictScreen() {
  const { activeVowText, vow, setVowId } = useVowFlow();
  const { displayName: makerName } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const displayName = makerName || 'your friend';
  const destination = vow.stake.destination;

  console.log('[WitnessVerdictScreen] rendering, token:', vow.witnessInviteToken, 'vowId:', vow.vowId);

  const handleCardTap = useCallback(async (choice: VerdictChoice) => {
    if (!choice || submitting) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setSubmitting(true);

    try {
      // If token is missing from in-memory state, fetch it from DB
      let token = vow.witnessInviteToken;
      if (!token && vow.vowId) {
        console.log('[WitnessVerdictScreen] token missing, fetching from DB for vowId:', vow.vowId);
        const { data: vowData } = await supabase
          .from('vows')
          .select('witness_invite_token')
          .eq('id', vow.vowId)
          .single();
        token = vowData?.witness_invite_token ?? null;
        if (token) {
          setVowId(vow.vowId, token);
        }
      }

      if (!token) {
        console.error('[WitnessVerdictScreen] no token available after DB fetch');
        Alert.alert('Something went wrong', 'Could not find the invite token. Please restart the app and try again.');
        setSubmitting(false);
        return;
      }

      console.log('[WitnessVerdictScreen] submitting verdict with token:', token, 'verdict:', choice);

      // Use direct fetch instead of supabase.functions.invoke to get proper error bodies
      const fnUrl = `${SUPABASE_URL}/functions/v1/submit-verdict`;
      console.log('[WitnessVerdictScreen] calling:', fnUrl);

      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ token, verdict: choice }),
      });

      const data = await res.json().catch(() => null);
      console.log('[WitnessVerdictScreen] response status:', res.status, 'body:', JSON.stringify(data));

      if (!res.ok) {
        const detail = data?.error || `HTTP ${res.status}`;
        console.error('[WitnessVerdictScreen] verdict submission failed:', detail, 'full response:', JSON.stringify(data));
        Alert.alert(
          'Verdict failed',
          detail === 'already_judged' ? 'This vow has already been judged.'
            : detail === 'invalid_token' ? 'Could not find this vow. Please go back and try again.'
            : detail === 'invalid_status' ? `Vow is in "${data?.status}" state and can't be judged yet.`
            : detail
        );
        setSubmitting(false);
        return;
      }

      if (data?.error) {
        console.error('[WitnessVerdictScreen] verdict error in body:', data.error);
        Alert.alert('Verdict failed', data.error === 'already_judged' ? 'This vow has already been judged.' : data.error);
        setSubmitting(false);
        return;
      }

      if (choice === 'kept') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      const route = choice === 'kept' ? '/vow-kept' : '/vow-broken';
      setTimeout(() => router.push(route as never), 150);
    } catch (err) {
      console.error('[WitnessVerdictScreen] verdict exception:', err);
      Alert.alert('Network error', 'Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, vow.witnessInviteToken, vow.vowId, setVowId]);

  return (
    <RitualScreen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <TitleBlock
          title={`Did ${displayName} keep the vow?`}
          subtitle="Be honest. That's the whole point."
        />

        <RitualCard>
          <Text style={styles.vowText}>{activeVowText}</Text>
          <View style={styles.rule} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>At stake</Text>
            <Text style={styles.metaValue}>${vow.stake.amount}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>If broken, goes to</Text>
            <Text style={styles.metaValueMuted}>{destination}</Text>
          </View>
        </RitualCard>

        {submitting && (
          <View style={styles.submittingRow}>
            <ActivityIndicator size="small" color={palette.goldBright} />
            <Text style={styles.submittingText}>Submitting verdict...</Text>
          </View>
        )}

        <View style={[styles.buttonColumn, submitting && { opacity: 0.5 }]}>
          <Pressable
            style={[styles.verdictButton, styles.keepButtonWitness]}
            onPress={() => handleCardTap('kept')}
            disabled={submitting}
            testID="verdict-kept"
          >
            <View style={[styles.iconCircle, styles.iconCircleKept]}>
              <Check color={palette.success} size={22} />
            </View>
            <View style={styles.copyWrap}>
              <Text style={styles.verdictTitle}>Vow kept.</Text>
              <Text style={styles.verdictDesc}>
                {displayName} did what they said. ${vow.stake.amount} stays safe.
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.verdictButton, styles.breakButtonWitness]}
            onPress={() => handleCardTap('broken')}
            disabled={submitting}
            testID="verdict-broken"
          >
            <View style={[styles.iconCircle, styles.iconCircleBroken]}>
              <CircleDollarSign color={palette.warmAmber} size={22} />
            </View>
            <View style={styles.copyWrap}>
              <Text style={styles.verdictTitle}>Vow broken.</Text>
              <Text style={styles.verdictDesc}>
                ${vow.stake.amount} to {destination}.
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          Your honesty is what makes this work.
        </Text>
      </View>


    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    justifyContent: 'space-between',
    gap: 18,
  },
  vowText: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  rule: {
    height: 1,
    backgroundColor: palette.border,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    color: palette.textMuted,
    fontSize: 13,
  },
  metaValue: {
    color: palette.goldBright,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  metaValueMuted: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  buttonColumn: {
    gap: 14,
  },
  verdictButton: {
    minHeight: 96,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  keepButtonWitness: {
    borderColor: 'rgba(82,214,154,0.22)',
    backgroundColor: 'rgba(82,214,154,0.08)',
  },
  breakButtonWitness: {
    borderColor: palette.warmAmberBorder,
    backgroundColor: palette.warmAmberMuted,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleKept: {
    backgroundColor: 'rgba(82,214,154,0.12)',
    borderColor: 'rgba(82,214,154,0.24)',
  },
  iconCircleBroken: {
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderColor: palette.warmAmberBorder,
  },
  copyWrap: {
    flex: 1,
    gap: 4,
  },
  verdictTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  verdictDesc: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submittingText: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  disclaimer: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
  },

});

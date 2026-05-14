/**
 * Screen 04c — Maker Name
 */
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChromeHeader, GoldCTA } from '@/components/primitives';
import { supabase } from '@/lib/supabase';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';
import { useAuth } from '@/providers/auth-provider';

function firstNameFromDisplayName(value?: string | null) {
  const clean = (value || '').trim();
  if (!clean || clean.startsWith('+') || /^\d/.test(clean)) return '';
  const firstName = clean.split(/\s+/)[0] || '';
  if (/^joseph$/i.test(firstName)) return 'Joe';
  return firstName;
}

export default function CreateNameScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { session, displayName } = useAuth();
  const [name, setName] = useState(() => firstNameFromDisplayName(displayName));
  const [hasEdited, setHasEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const canContinue = trimmedName.length >= 2 && !busy;
  const cameFromPhoneOtp = typeof params.phone === 'string' && params.phone.trim().length > 0;

  useEffect(() => {
    if (!session?.user?.id || cameFromPhoneOtp) return;
    router.replace({
      pathname: '/native-perfect/create/payment',
      params: {
        ...params,
        makerName: firstNameFromDisplayName(displayName),
      },
    } as never);
  }, [cameFromPhoneOtp, displayName, params, session?.user?.id]);

  useEffect(() => {
    if (hasEdited || trimmedName) return;
    const firstName = firstNameFromDisplayName(displayName);
    if (firstName) setName(firstName);
  }, [displayName, hasEdited, trimmedName]);

  const handleNameChange = useCallback((nextName: string) => {
    setHasEdited(true);
    setError(null);
    const firstToken = nextName.trimStart().split(/\s+/)[0] || nextName;
    setName(firstToken);
  }, []);

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;
    setBusy(true);
    setError(null);

    if (session?.user?.id) {
      const { error: upsertError } = await supabase.from('users').upsert(
        { id: session.user.id, display_name: trimmedName },
        { onConflict: 'id' }
      );

      if (upsertError) {
        setBusy(false);
        setError('Could not save your name. Try again.');
        return;
      }
    }

    setBusy(false);
    router.push({
      pathname: '/native-perfect/create/payment',
      params: { ...params, makerName: trimmedName },
    } as never);
  }, [canContinue, params, session?.user?.id, trimmedName]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[uvColors.bgCard, uvColors.bgGradMid, uvColors.bgGradDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ChromeHeader
          onBack={() => router.canGoBack() ? router.back() : router.replace('/native-perfect/create/otp')}
          centerText="4 / 5"
        />

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '80%' }]} />
        </View>

        <Text style={styles.h1}>What should we call you?</Text>
        <Text style={styles.sub}>A vow with a name carries more weight.</Text>

        <View style={styles.inputWrap}>
          <TextInput
            value={name}
            onChangeText={handleNameChange}
            placeholder="Joe"
            placeholderTextColor={uvColors.textDim}
            autoCapitalize="words"
            autoCorrect={false}
            keyboardAppearance="dark"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            style={styles.input}
          />
          <Text style={styles.helper}>First name is perfect.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.ctaWrap}>
          <GoldCTA
            label={busy ? 'Saving...' : 'Continue'}
            disabled={!canContinue}
            onPress={handleContinue}
          />
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
  scrollContent: {
    paddingHorizontal: uvSpacing.xl,
    paddingBottom: 120,
  },
  progressTrack: {
    height: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(244,234,216,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: uvColors.gold,
  },
  h1: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 44,
    lineHeight: 44 * 1.05,
    fontWeight: '900',
    color: uvColors.text,
    textAlign: 'center',
    marginTop: 96,
  },
  sub: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 20,
    lineHeight: 20 * 1.32,
    color: uvColors.textMuted,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 58,
  },
  inputWrap: {
    gap: 12,
  },
  input: {
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.22)',
    backgroundColor: 'rgba(244,234,216,0.03)',
    paddingHorizontal: 20,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 30,
    fontWeight: '800',
    color: uvColors.text,
  },
  helper: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: uvColors.textDim,
  },
  error: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: uvColors.danger,
  },
  ctaWrap: {
    marginTop: 250,
  },
});

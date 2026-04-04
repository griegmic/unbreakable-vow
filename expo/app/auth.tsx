import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Mail, MoveRight } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, RitualScreen, TitleBlock, VowPreview } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { signInWithGoogle } from '@/lib/auth';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { useVowFlow } from '@/providers/vow-flow';

export default function AuthScreen() {
  const { activeVowText } = useVowFlow();
  const [loading, setLoading] = useState<string | null>(null);

  const registerPush = async () => {
    try {
      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken(token);
      }
    } catch (err) {
      console.log('[AuthScreen] push registration failed:', err);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    setLoading('google');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await signInWithGoogle();

    if (result.success) {
      await registerPush();
      router.push('/seal');
    } else if (result.error !== 'Sign-in cancelled') {
      Alert.alert('Sign-in failed', result.error || 'Please try again.');
    }

    setLoading(null);
  };

  const handleApple = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Coming soon', 'Apple Sign-In will be available shortly.');
  };

  const handleEmail = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Coming soon', 'Email sign-in will be available shortly.');
  };

  return (
    <RitualScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <BackButton />
      <TitleBlock
        title="Sign in to seal your vow"
        subtitle="We need to verify your identity before the money is on the line."
      />
      <VowPreview text={activeVowText} compact />

      <Pressable onPress={handleApple} style={[styles.authRow, styles.authRowDisabled]} testID="auth-apple">
        <View style={styles.authIcon}>
          <Text style={styles.appleMark}>{"\uF8FF"}</Text>
        </View>
        <Text style={styles.authTitle}>Continue with Apple</Text>
        <Text style={styles.soonBadge}>SOON</Text>
      </Pressable>

      <Pressable onPress={handleGoogle} style={styles.authRow} testID="auth-google">
        <View style={styles.authIcon}>
          {loading === 'google' ? (
            <ActivityIndicator size="small" color={palette.text} />
          ) : (
            <Text style={styles.googleMark}>G</Text>
          )}
        </View>
        <Text style={styles.authTitle}>Continue with Google</Text>
        <MoveRight color={palette.textMuted} size={16} />
      </Pressable>

      <Pressable onPress={handleEmail} style={[styles.authRow, styles.authRowDisabled]} testID="auth-email">
        <View style={styles.authIcon}>
          <Mail color={palette.text} size={18} />
        </View>
        <Text style={styles.authTitle}>Continue with email</Text>
        <Text style={styles.soonBadge}>SOON</Text>
      </Pressable>
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  authRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: palette.surface,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  authRowDisabled: {
    opacity: 0.45,
  },
  authIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: palette.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authTitle: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  googleMark: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800' as const,
  },
  appleMark: {
    color: palette.text,
    fontSize: 20,
  },
  soonBadge: {
    color: palette.goldBright,
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.18)',
    overflow: 'hidden',
  },
});

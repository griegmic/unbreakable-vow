import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Mail, MoveRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, RitualScreen, TitleBlock, VowPreview } from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

export default function AuthScreen() {
  const { activeVowText, setAuthenticated } = useVowFlow();

  const handleAuth = (method: string) => {
    console.log('[AuthScreen] handleAuth', method);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAuthenticated(true);
    router.push('/seal');
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

      <Pressable onPress={() => handleAuth('apple')} style={styles.authRow} testID="auth-apple">
        <View style={styles.authIcon}>
          <Text style={styles.appleMark}>{"\uF8FF"}</Text>
        </View>
        <Text style={styles.authTitle}>Continue with Apple</Text>
        <MoveRight color={palette.textMuted} size={16} />
      </Pressable>

      <Pressable onPress={() => handleAuth('google')} style={styles.authRow} testID="auth-google">
        <View style={styles.authIcon}>
          <Text style={styles.googleMark}>G</Text>
        </View>
        <Text style={styles.authTitle}>Continue with Google</Text>
        <MoveRight color={palette.textMuted} size={16} />
      </Pressable>

      <Pressable onPress={() => handleAuth('email')} style={styles.authRow} testID="auth-email">
        <View style={styles.authIcon}>
          <Mail color={palette.text} size={18} />
        </View>
        <Text style={styles.authTitle}>Continue with email</Text>
        <MoveRight color={palette.textMuted} size={16} />
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
});

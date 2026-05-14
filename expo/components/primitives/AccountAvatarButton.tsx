import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { hapticSecondary } from '@/lib/haptics';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface AccountAvatarButtonProps {
  initial: string;
  route?: string;
  style?: ViewStyle;
}

export function AccountAvatarButton({
  initial,
  route = '/native-perfect/settings',
  style,
}: AccountAvatarButtonProps) {
  const normalizedInitial = initial.trim().charAt(0).toUpperCase() || 'J';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open account settings"
      hitSlop={10}
      onPress={() => {
        hapticSecondary();
        router.push(route as never);
      }}
      style={({ pressed }) => [
        styles.avatar,
        pressed && styles.avatarPressed,
        style,
      ]}
      testID="account-avatar-button"
    >
      <Text style={styles.avatarText}>{normalizedInitial}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uvColors.goldBg,
    borderWidth: 1,
    borderColor: uvColors.borderGold,
  },
  avatarPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  avatarText: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    color: uvColors.goldBright,
  },
});

export default AccountAvatarButton;

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { uvColors } from '@/lib/uv-tokens';
import { hapticSecondary } from '@/lib/haptics';

interface ChromeHeaderProps {
  onBack?: () => void;
  centerText?: string;
  onMenu?: () => void;
}

export function ChromeHeader({ onBack, centerText, onMenu }: ChromeHeaderProps) {
  return (
    <View style={styles.container}>
      {onBack ? (
        <Pressable
          onPress={() => {
            hapticSecondary();
            onBack();
          }}
          hitSlop={8}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </Pressable>
      ) : (
        <View style={styles.backPlaceholder} />
      )}

      <Text style={styles.centerText} numberOfLines={1}>
        {centerText ?? ''}
      </Text>

      {onMenu ? (
        <Pressable
          onPress={() => {
            hapticSecondary();
            onMenu();
          }}
          style={styles.menuButton}
        >
          <Text style={styles.menuIcon}>{'\u2261'}</Text>
        </Pressable>
      ) : (
        <View style={styles.menuPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 15,
    color: uvColors.textMuted,
    fontWeight: '500',
  },
  backPlaceholder: {
    width: 60,
  },
  centerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: uvColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: uvColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 22,
    color: uvColors.textMuted,
    lineHeight: 24,
  },
  menuPlaceholder: {
    width: 44,
  },
});

export default ChromeHeader;

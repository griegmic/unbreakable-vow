import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
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
    marginBottom: 28,
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: 8,
  },
  backText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    fontWeight: '700',
    color: uvColors.textMuted,
  },
  backPlaceholder: {
    width: 58,
  },
  centerText: {
    textAlign: 'center',
    fontFamily: uvFonts.sansSemibold,
    fontSize: 16,
    fontWeight: '800',
    color: uvColors.textMuted,
    letterSpacing: 16 * 0.08,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 23,
    color: uvColors.textMuted,
    lineHeight: 26,
  },
  menuPlaceholder: {
    width: 44,
  },
});

export default ChromeHeader;

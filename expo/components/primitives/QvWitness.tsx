import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '../../lib/uv-tokens';
import { hapticSecondary } from '../../lib/haptics';

interface QvWitnessProps {
  name?: string;
  subtitle?: string;
  onPress?: () => void;
}

export function QvWitness({ name, subtitle, onPress }: QvWitnessProps) {
  const handlePress = () => {
    if (onPress) {
      hapticSecondary();
      onPress();
    }
  };

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress ? styles.pressed : undefined,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {name || 'Choose witness'}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default QvWitness;

const styles = StyleSheet.create({
  row: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: uvColors.goldBg,
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: uvFonts.serifMedium,
    fontSize: 14,
    fontWeight: '500',
    color: uvColors.goldBright,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 15,
    fontWeight: '500',
    color: uvColors.text,
  },
  subtitle: {
    fontFamily: uvFonts.sans,
    fontSize: 13,
    color: uvColors.textDim,
  },
});

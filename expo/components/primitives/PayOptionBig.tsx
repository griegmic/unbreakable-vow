import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSelection } from '@/lib/haptics';

interface PayOptionBigProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
}

export function PayOptionBig({ label, selected, onSelect, icon }: PayOptionBigProps) {
  const handlePress = () => {
    hapticSelection();
    onSelect();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.pressed,
      ]}
    >
      {selected ? (
        <LinearGradient
          colors={[uvColors.goldBright, uvColors.gold, uvColors.goldDeep]}
          style={styles.gradient}
        >
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.label, styles.labelSelected]}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default PayOptionBig;

const styles = StyleSheet.create({
  option: {
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: uvColors.bgCard,
    overflow: 'hidden',
  },
  optionSelected: {
    borderColor: uvColors.gold,
    borderWidth: 1.5,
    shadowColor: uvColors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  iconWrap: {},
  label: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 16,
    fontWeight: '500',
    color: uvColors.textMuted,
  },
  labelSelected: {
    color: uvColors.textOnGold,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});

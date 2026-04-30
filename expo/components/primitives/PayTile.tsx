import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSelection } from '@/lib/haptics';

interface PayTileProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
}

export function PayTile({ label, sublabel, selected, onSelect, icon }: PayTileProps) {
  const handlePress = () => {
    hapticSelection();
    onSelect();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.tile,
        selected && styles.tileSelected,
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
          {sublabel && (
            <Text style={[styles.sublabel, styles.sublabelSelected]}>{sublabel}</Text>
          )}
        </LinearGradient>
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={styles.label}>{label}</Text>
          {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
        </View>
      )}
    </Pressable>
  );
}

export default PayTile;

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 82,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: uvColors.bgCard,
    overflow: 'hidden',
  },
  tileSelected: {
    borderColor: uvColors.gold,
    borderWidth: 1.5,
    shadowColor: uvColors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  iconWrap: {
    marginBottom: 6,
  },
  label: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 15,
    fontWeight: '500',
    color: uvColors.textMuted,
    textAlign: 'center',
  },
  labelSelected: {
    color: uvColors.textOnGold,
  },
  sublabel: {
    fontFamily: uvFonts.sans,
    fontSize: 12,
    color: uvColors.textDim,
    textAlign: 'center',
    marginTop: 2,
  },
  sublabelSelected: {
    color: uvColors.textOnGold,
    opacity: 0.7,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});

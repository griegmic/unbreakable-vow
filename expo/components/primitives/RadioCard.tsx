import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSelection } from '@/lib/haptics';

interface RadioCardProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
}

export function RadioCard({ label, sublabel, selected, onPress }: RadioCardProps) {
  const handlePress = () => {
    hapticSelection();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.card, selected && styles.selected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]} />
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: uvColors.bgCard,
  },
  selected: {
    borderWidth: 1.5,
    borderColor: uvColors.gold,
    backgroundColor: uvColors.goldBg,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: uvColors.borderStrong,
  },
  radioSelected: {
    borderWidth: 6,
    borderColor: uvColors.gold,
    backgroundColor: uvColors.goldBg,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 15,
    fontWeight: '500',
    color: uvColors.text,
  },
  sublabel: {
    fontFamily: uvFonts.sans,
    fontSize: 13,
    color: uvColors.textDim,
  },
});

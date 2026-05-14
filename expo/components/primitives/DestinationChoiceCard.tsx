import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hapticSelection } from '@/lib/haptics';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

interface DestinationChoiceCardProps {
  label: string;
  subtitle: string;
  selected: boolean;
  tone?: 'good' | 'hate';
  onSelect: () => void;
}

export function DestinationChoiceCard({
  label,
  subtitle,
  selected,
  tone = 'good',
  onSelect,
}: DestinationChoiceCardProps) {
  const isHate = tone === 'hate';

  const handlePress = () => {
    hapticSelection();
    onSelect();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        selected && isHate && styles.cardHateSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.textWrap}>
        <Text style={styles.name}>{label}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View
        style={[
          styles.radio,
          isHate && styles.radioHate,
          selected && styles.radioSelected,
          selected && isHate && styles.radioHateSelected,
        ]}
      >
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

export default DestinationChoiceCard;

const styles = StyleSheet.create({
  card: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: 'rgba(244,234,216,0.035)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardSelected: {
    borderColor: 'rgba(214,168,60,0.62)',
    backgroundColor: 'rgba(214,168,60,0.09)',
  },
  cardHateSelected: {
    borderColor: 'rgba(245,154,61,0.62)',
    backgroundColor: 'rgba(245,154,61,0.08)',
  },
  textWrap: {
    flex: 1,
  },
  name: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 17 * 1.1,
    color: uvColors.text,
  },
  subtitle: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    lineHeight: 12 * 1.22,
    color: uvColors.textDim,
    marginTop: 5,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: uvColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioHate: {
    borderColor: uvColors.warn,
  },
  radioSelected: {
    backgroundColor: uvColors.gold,
  },
  radioHateSelected: {
    backgroundColor: uvColors.warn,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: uvColors.bgCard,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
});

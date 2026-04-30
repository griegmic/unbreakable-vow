import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { uvColors, uvRadius } from '@/lib/uv-tokens';
import { hapticSelection } from '@/lib/haptics';

interface SuggestionChipScrollProps {
  chips: string[];
  onSelect: (chip: string) => void;
}

export function SuggestionChipScroll({ chips, onSelect }: SuggestionChipScrollProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {chips.map((chip) => (
          <Pressable
            key={chip}
            onPress={() => {
              hapticSelection();
              onSelect(chip);
            }}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={styles.chipText}>{chip}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {/* Right fade overlay */}
      <View style={styles.fade} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: uvRadius.pill,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: uvColors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: {
    backgroundColor: uvColors.bgSelected,
    borderColor: uvColors.borderStrong,
  },
  chipText: {
    fontSize: 15,
    color: uvColors.text,
  },
  fade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'transparent',
    // Approximated fade using a semi-transparent bg overlay
    // Full LinearGradient fade can replace this if expo-linear-gradient is imported
    borderLeftWidth: 0,
  },
});

export default SuggestionChipScroll;

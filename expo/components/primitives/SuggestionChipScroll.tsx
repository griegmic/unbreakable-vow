import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uvColors, uvFonts, uvRadius } from '@/lib/uv-tokens';
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
        {/* Extra right padding so last chip doesn't hide under fade */}
        <View style={{ width: 52 }} />
      </ScrollView>

      {/* Right fade gradient overlay */}
      <LinearGradient
        colors={['rgba(15,13,10,0)', 'rgba(15,13,10,1)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0.74, y: 0.5 }}
        style={styles.fade}
        pointerEvents="none"
      />

      {/* Chevron indicator */}
      <View style={styles.chevron} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginRight: -22,
  },
  scrollContent: {
    gap: 9,
    paddingRight: 0,
  },
  chip: {
    height: 42,
    paddingHorizontal: 15,
    borderRadius: uvRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.15)',
    backgroundColor: 'rgba(244,234,216,0.035)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: {
    backgroundColor: uvColors.bgSelected,
    borderColor: uvColors.borderStrong,
  },
  chipText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    fontWeight: '600',
    color: '#c1b7a5',
  },
  fade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 58,
  },
  chevron: {
    position: 'absolute',
    right: 2,
    top: 16,
    width: 18,
    height: 18,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(237,196,101,0.72)',
    transform: [{ rotate: '45deg' }],
  },
});

export default SuggestionChipScroll;

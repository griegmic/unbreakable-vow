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
            <Text style={styles.chipText} numberOfLines={1}>{chip}</Text>
          </Pressable>
        ))}
        {/* Extra right padding so last chip doesn't hide under fade */}
        <View style={{ width: 44 }} />
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
      <View style={styles.chevronCircle} pointerEvents="none">
        <View style={styles.chevron} />
      </View>
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
    height: 44,
    paddingHorizontal: 17,
    borderRadius: uvRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.15)',
    backgroundColor: 'rgba(244,234,216,0.035)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    maxWidth: 280,
  },
  chipPressed: {
    backgroundColor: uvColors.bgSelected,
    borderColor: uvColors.borderStrong,
  },
  chipText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    fontWeight: '600',
    color: '#d0c6b3',
  },
  fade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 58,
  },
  chevronCircle: {
    position: 'absolute',
    right: 5,
    top: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15,13,10,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(237,196,101,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 13,
    height: 13,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(237,196,101,0.72)',
    transform: [{ rotate: '45deg' }],
  },
});

export default SuggestionChipScroll;

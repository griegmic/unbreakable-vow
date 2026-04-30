import React from 'react';
import { Pressable, View, Text, StyleSheet, ScrollView } from 'react-native';
import { uvColors, uvFonts } from '../../lib/uv-tokens';
import { hapticSelection } from '../../lib/haptics';

interface Tab {
  label: string;
  value: string;
}

interface TabBarProps {
  tabs: Tab[];
  selected: string;
  onSelect: (value: string) => void;
}

export function TabBar({ tabs, selected, onSelect }: TabBarProps) {
  const handleSelect = (value: string) => {
    if (value !== selected) {
      hapticSelection();
      onSelect(value);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {tabs.map((tab) => {
        const isSelected = tab.value === selected;
        return (
          <Pressable
            key={tab.value}
            onPress={() => handleSelect(tab.value)}
            style={[styles.tab, isSelected && styles.tabSelected]}
          >
            <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default TabBar;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelected: {
    borderColor: uvColors.borderGoldSoft,
    backgroundColor: uvColors.goldBg,
  },
  tabText: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 14,
    fontWeight: '500',
    color: uvColors.textMuted,
  },
  tabTextSelected: {
    color: uvColors.goldBright,
  },
});

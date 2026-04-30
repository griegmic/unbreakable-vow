import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSelection } from '@/lib/haptics';

interface CauseTypeCardProps {
  title: string;
  subtitle: string;
  icon: string;
  selected: boolean;
  onSelect: () => void;
}

export function CauseTypeCard({
  title,
  subtitle,
  icon,
  selected,
  onSelect,
}: CauseTypeCardProps) {
  const handlePress = () => {
    hapticSelection();
    onSelect();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={[styles.iconCircle, selected && styles.iconCircleSelected]}>
        <Text style={[styles.icon, selected && styles.iconSelected]}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: uvColors.border,
    backgroundColor: uvColors.bgCard,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: uvColors.gold,
    backgroundColor: uvColors.goldBg,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: uvColors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSelected: {
    backgroundColor: 'rgba(214,168,60,0.18)',
  },
  icon: {
    fontSize: 20,
  },
  iconSelected: {
    // Emoji icons don't take color, but this is available for symbol fonts
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 15,
    fontWeight: '500',
    color: uvColors.text,
  },
  titleSelected: {
    color: uvColors.goldBright,
  },
  subtitle: {
    fontFamily: uvFonts.sans,
    fontSize: 13,
    color: uvColors.textDim,
  },
});

export default CauseTypeCard;

import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { uvColors, uvFonts, uvSpacing, uvRadius } from '../../lib/uv-tokens';
import { hapticPrimary, hapticSelection } from '../../lib/haptics';

interface MenuItemProps {
  title: string;
  subtitle?: string;
  icon?: string;
  onPress: () => void;
  variant?: 'hero' | 'default';
  badge?: number;
}

export function MenuItem({
  title,
  subtitle,
  icon,
  onPress,
  variant = 'default',
  badge,
}: MenuItemProps) {
  const isHero = variant === 'hero';

  const handlePress = () => {
    if (isHero) {
      hapticPrimary();
    } else {
      hapticSelection();
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.item,
        isHero && styles.itemHero,
        pressed && styles.pressed,
      ]}
    >
      {icon && (
        <View style={[styles.iconBox, isHero && styles.iconBoxHero]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
      )}
      <View style={styles.textColumn}>
        <Text style={[styles.title, isHero && styles.titleHero]}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default MenuItem;

const styles = StyleSheet.create({
  item: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: uvSpacing.base,
    paddingVertical: uvSpacing.md,
    gap: uvSpacing.md,
  },
  itemHero: {
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
    backgroundColor: uvColors.goldSoft,
    borderRadius: uvRadius.md,
    margin: uvSpacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: uvRadius.sm,
    backgroundColor: uvColors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxHero: {
    backgroundColor: uvColors.goldBg,
  },
  iconText: {
    fontSize: 16,
  },
  textColumn: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 15,
    color: uvColors.text,
  },
  titleHero: {
    color: uvColors.goldBright,
  },
  subtitle: {
    fontFamily: uvFonts.sans,
    fontSize: 13,
    color: uvColors.textMuted,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: uvColors.warn,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});

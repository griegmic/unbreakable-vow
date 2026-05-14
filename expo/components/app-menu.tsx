import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BookOpen, Gauge, Menu, Send, Settings, Sparkles, Trophy, Users, X, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { hapticPrimary, hapticSecondary, hapticSelection } from '@/lib/haptics';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MenuItemConfig {
  icon: React.ReactNode;
  label: string;
  description: string;
  route?: string;
  badge?: string;
  disabled?: boolean;
  onPress?: () => void;
}

interface AppMenuProps {
  initial?: string;
  style?: object;
  variant?: 'icon' | 'avatar';
}

export function AppMenuButton({ initial = 'J', style, variant = 'icon' }: AppMenuProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslate = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;
  const itemFades = useRef([0, 1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0))).current;
  const itemSlides = useRef([0, 1, 2, 3, 4, 5, 6].map(() => new Animated.Value(-20))).current;

  const open = useCallback(() => {
    hapticSecondary();
    setVisible(true);
  }, []);

  const close = useCallback((withHaptic = true) => {
    if (withHaptic) hapticSelection();
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(panelTranslate, { toValue: -SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [backdropOpacity, panelTranslate]);

  useEffect(() => {
    if (visible) {
      panelTranslate.setValue(-SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      itemFades.forEach((f) => f.setValue(0));
      itemSlides.forEach((s) => s.setValue(-20));

      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(panelTranslate, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 4 }),
      ]).start(() => {
        const stagger = itemFades.map((fade, i) =>
          Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 200, delay: i * 50, useNativeDriver: true }),
            Animated.timing(itemSlides[i], { toValue: 0, duration: 200, delay: i * 50, useNativeDriver: true }),
          ])
        );
        Animated.stagger(30, stagger).start();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const navigateTo = useCallback((route: string) => {
    hapticPrimary();
    close(false);
    setTimeout(() => {
      router.push(route as never);
    }, 280);
  }, [close]);

  const menuItems: MenuItemConfig[] = [
    {
      icon: <Zap color={uvColors.goldBright} size={18} />,
      label: 'Make a vow',
      description: 'Put money on your word',
      route: '/native-perfect/quick-vow',
    },
    {
      icon: <Gauge color={uvColors.textMuted} size={18} />,
      label: 'Dashboard',
      description: 'Open loops first',
      route: '/native-perfect/dashboard',
    },
    {
      label: 'My Vows',
      description: 'Active and past vows',
      icon: <BookOpen color={uvColors.goldBright} size={18} />,
      route: '/native-perfect/dashboard',
    },
    {
      icon: <Users color={uvColors.goldBright} size={18} />,
      label: "I'm judging",
      description: 'Verdicts and active watches',
      route: '/native-perfect/judging',
    },
    {
      icon: <Send color={uvColors.goldBright} size={18} />,
      label: 'Dares',
      description: 'Challenges you sent',
      route: '/native-perfect/dares',
    },
    {
      icon: <Sparkles color={uvColors.goldBright} size={18} />,
      label: 'Dare someone',
      description: 'Send a challenge link',
      route: '/cast',
    },
    {
      icon: <Settings color={uvColors.textMuted} size={18} />,
      label: 'Settings & help',
      description: 'Account, notifications, payment',
      route: '/native-perfect/settings',
    },
  ];

  return (
    <>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel="Open app menu"
        hitSlop={10}
        style={({ pressed }) => [
          styles.menuButton,
          variant === 'avatar' && styles.avatarButton,
          pressed && styles.menuButtonPressed,
          style,
        ]}
        testID="app-menu-button"
      >
        {variant === 'avatar' ? (
          <Text style={styles.avatarText}>{initial.trim().charAt(0).toUpperCase() || 'J'}</Text>
        ) : (
          <Menu color={uvColors.textMuted} size={18} />
        )}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => close()}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
        </Animated.View>

        <Animated.View style={[styles.panel, { transform: [{ translateY: panelTranslate }] }]}>
          <LinearGradient
            colors={['#15110d', '#0f0d0a', '#090806']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.panelContent}>
            <View style={styles.panelHeader}>
              <View style={styles.panelBrand}>
                <LinearGradient
                  colors={[uvColors.goldBright, uvColors.gold, uvColors.goldDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.brandIcon}
                >
                  <Sparkles color={uvColors.textOnGold} size={12} />
                </LinearGradient>
                <Text style={styles.brandLabel}>Unbreakable Vow</Text>
              </View>
              <Pressable onPress={() => close()} style={styles.closeButton} testID="menu-close">
                <X color={uvColors.textMuted} size={18} />
              </Pressable>
            </View>

            <View style={styles.menuList}>
              {menuItems.map((item, index) => (
                <Animated.View
                  key={item.label}
                  style={{ opacity: itemFades[index], transform: [{ translateY: itemSlides[index] }] }}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && styles.menuItemPressed,
                      item.disabled && styles.menuItemDisabled,
                    ]}
                    onPress={() => {
                      if (item.disabled) return;
                      if (item.onPress) {
                        item.onPress();
                        return;
                      }
                      if (item.route) navigateTo(item.route);
                    }}
                    testID={`menu-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <View style={styles.menuIconWrap}>{item.icon}</View>
                    <View style={styles.menuCopy}>
                      <View style={styles.menuLabelRow}>
                        <Text style={[styles.menuLabel, item.disabled && styles.menuLabelDisabled]}>{item.label}</Text>
                        {item.badge ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.badge}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.menuDesc}>{item.description}</Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            <View style={styles.panelFooter}>
              <View style={styles.streakRow}>
                <Trophy color={uvColors.goldBright} size={14} />
                <Text style={styles.streakText}>Make the promise hard to dodge.</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(240,233,219,0.04)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: uvColors.goldBg,
    borderColor: uvColors.borderGold,
  },
  avatarText: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    color: uvColors.goldBright,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 20,
  },
  panelContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  panelBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLabel: {
    color: uvColors.text,
    fontFamily: uvFonts.serifMedium,
    fontSize: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(240,233,219,0.05)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuList: {
    gap: 6,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: {
    flex: 1,
    gap: 2,
  },
  menuLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuLabel: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
  },
  menuLabelDisabled: {
    color: uvColors.textMuted,
  },
  menuDesc: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sans,
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.18)',
  },
  badgeText: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  panelFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 16,
    alignItems: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakText: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sansMedium,
    fontSize: 13,
  },
});

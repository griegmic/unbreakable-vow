import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Star } from 'lucide-react-native';
import React, { ReactNode, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { palette, serifFont } from '@/constants/unbreakable';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function RitualScreen({ children, scroll = true, footer, contentStyle }: ScreenProps) {
  const body = (
    <View style={[styles.content, !scroll && { flex: 1 }, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[palette.bg, '#08101A', palette.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.orbLarge} />
      <View pointerEvents="none" style={styles.orbSmall} />
      <SafeAreaView style={styles.safeArea}>
        {scroll ? <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}

export function HeaderBadge() {
  return (
    <View style={styles.headerRow}>
      <LinearGradient
        colors={[palette.goldBright, palette.gold, palette.goldDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerIcon}
      >
        <Star color="#0B0D11" fill="#0B0D11" size={14} />
      </LinearGradient>
      <Text style={styles.headerLabel}>Unbreakable Vow</Text>
    </View>
  );
}

export function BackButton() {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        router.back();
      }}
      style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}
      testID="back-button"
    >
      <ArrowLeft color={palette.text} size={18} />
    </Pressable>
  );
}

interface TitleBlockProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
}

export function TitleBlock({ eyebrow, title, subtitle }: TitleBlockProps) {
  return (
    <View style={styles.titleBlock}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function RitualCard({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
}

export function PrimaryButton({ label, onPress, disabled = false, testID }: PrimaryButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    if (!disabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        disabled={disabled}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [styles.primaryButton, disabled ? styles.primaryButtonDisabled : null, pressed ? styles.primaryButtonPressed : null]}
        testID={testID}
      >
        <LinearGradient
          colors={disabled ? ['#29303C', '#29303C'] : [palette.goldBright, palette.gold, palette.goldDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryButtonGradient}
        >
          <Text style={[styles.primaryButtonText, disabled ? styles.primaryButtonTextDisabled : null]}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  testID: string;
}

export function SecondaryButton({ label, onPress, testID }: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={styles.secondaryButton}
      testID={testID}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

interface ChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function ChoiceChip({ label, active = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.chip, active ? styles.chipActive : null]}
      testID={`chip-${label}`}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad';
  onSubmit?: () => void;
  testID: string;
}

export function RitualInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  onSubmit,
  testID,
}: InputProps) {
  return (
    <View style={styles.inputShell}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        returnKeyType={onSubmit ? 'go' : 'default'}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        testID={testID}
        value={value}
      />
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function VowPreview({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <View style={[styles.vowPreview, compact ? styles.vowPreviewCompact : null]}>
      <View style={styles.vowPreviewAccent} />
      <Text style={[styles.vowPreviewText, compact ? styles.vowPreviewTextCompact : null]}>{text}</Text>
    </View>
  );
}

export function StatPill({ value, label, tone = 'default' }: { value: string; label: string; tone?: 'default' | 'success' | 'danger' }) {
  const labelStyle = useMemo(() => {
    if (tone === 'success') return styles.statValueSuccess;
    if (tone === 'danger') return styles.statValueDanger;
    return styles.statValue;
  }, [tone]);

  return (
    <View style={styles.statPill}>
      <Text style={labelStyle}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function bodyText(color?: string): StyleProp<TextStyle> {
  return [styles.bodyText, color ? { color } : null];
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  orbLarge: {
    position: 'absolute',
    top: -90,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: palette.goldGlow,
    opacity: 0.7,
  },
  orbSmall: {
    position: 'absolute',
    top: 180,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 160,
    backgroundColor: 'rgba(94,124,250,0.12)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  headerLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.82,
  },
  titleBlock: {
    gap: 8,
  },
  eyebrow: {
    color: palette.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    fontFamily: serifFont,
    letterSpacing: -0.8,
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.26,
    shadowRadius: 28,
    elevation: 12,
  },
  primaryButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonGradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#0B0D11',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  primaryButtonTextDisabled: {
    color: palette.textMuted,
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    borderColor: palette.borderStrong,
    backgroundColor: 'rgba(212,162,79,0.12)',
  },
  chipText: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: palette.goldBright,
  },
  inputShell: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  inputLabel: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  input: {
    color: palette.text,
    fontSize: 17,
    minHeight: 28,
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  vowPreview: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    overflow: 'hidden',
  },
  vowPreviewCompact: {
    borderRadius: 12,
  },
  vowPreviewAccent: {
    width: 3,
    backgroundColor: palette.gold,
  },
  vowPreviewText: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: serifFont,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  vowPreviewTextCompact: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statPill: {
    flex: 1,
    backgroundColor: palette.surfaceElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 8,
  },
  statValue: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  statValueSuccess: {
    color: palette.success,
    fontSize: 20,
    fontWeight: '800',
  },
  statValueDanger: {
    color: palette.danger,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  bodyText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
});

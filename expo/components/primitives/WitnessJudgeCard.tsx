import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { hapticSecondary } from '@/lib/haptics';

interface WitnessJudgeCardProps {
  variant: 'empty' | 'filled';
  witnessName?: string;
  witnessInitial?: string;
  onTap?: () => void;
  onChange?: () => void;
  onAskNow?: () => void;
}

export function WitnessJudgeCard({
  variant,
  witnessName,
  witnessInitial,
  onTap,
  onChange,
  onAskNow,
}: WitnessJudgeCardProps) {
  if (variant === 'empty') {
    return (
      <Pressable
        onPress={() => {
          hapticSecondary();
          onTap?.();
        }}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.avatarEmpty}>
          <Text style={styles.plusIcon}>+</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Add a witness</Text>
          <Text style={styles.subtitle}>Pick someone who won't let you slide.</Text>
        </View>
        <Text style={styles.rowAction}>{'\u2192'}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[uvColors.goldBright, uvColors.goldDeep]}
        style={styles.avatarFilled}
      >
        <Text style={styles.initial}>
          {witnessInitial || witnessName?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </LinearGradient>
      <View style={styles.content}>
        <Text style={styles.name}>{witnessName}</Text>
        <View style={styles.actions}>
          {onChange && (
            <Pressable
              onPress={() => {
                hapticSecondary();
                onChange();
              }}
            >
              <Text style={styles.changeLink}>Change</Text>
            </Pressable>
          )}
          {onAskNow && (
            <Pressable
              onPress={() => {
                hapticSecondary();
                onAskNow();
              }}
            >
              <Text style={styles.askLink}>Ask now</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1.3,
    borderColor: 'rgba(214,168,60,0.48)',
    backgroundColor: 'rgba(214,168,60,0.08)',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  avatarEmpty: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(214,168,60,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214,168,60,0.14)',
  },
  plusIcon: {
    fontSize: 24,
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
  },
  avatarFilled: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: uvFonts.serifMedium,
    fontSize: 20,
    fontWeight: '500',
    color: uvColors.textOnGold,
  },
  content: {
    flex: 1,
    gap: 5,
  },
  title: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 18,
    fontWeight: '800',
    color: uvColors.text,
    lineHeight: 18 * 1.1,
  },
  subtitle: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    lineHeight: 13 * 1.25,
    color: uvColors.textMuted,
  },
  rowAction: {
    fontSize: 20,
    fontWeight: '800',
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
  },
  name: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 15,
    fontWeight: '500',
    color: uvColors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 14,
  },
  changeLink: {
    fontFamily: uvFonts.sans,
    fontSize: 13,
    color: uvColors.gold,
    textDecorationLine: 'underline',
  },
  askLink: {
    fontFamily: uvFonts.sans,
    fontSize: 13,
    color: uvColors.goldBright,
    textDecorationLine: 'underline',
  },
});

export default WitnessJudgeCard;

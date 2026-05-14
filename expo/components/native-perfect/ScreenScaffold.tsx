import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AppMenuButton } from '@/components/app-menu';
import { hapticSecondary } from '@/lib/haptics';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';

export function NativePerfectScreen({
  children,
  backTo,
  backLabel = 'Dashboard',
  scroll = true,
}: {
  children: React.ReactNode;
  backTo?: string;
  backLabel?: string;
  scroll?: boolean;
}) {
  const body = (
    <View style={styles.content}>
      {backTo ? (
        <View style={styles.chrome}>
          <Pressable
            onPress={() => {
              hapticSecondary();
              router.replace(backTo as never);
            }}
            hitSlop={8}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← {backLabel}</Text>
          </Pressable>
          <AppMenuButton style={styles.menuButton} />
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[uvColors.bgCard, uvColors.bgGradMid, uvColors.bgGradDeep]}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <View pointerEvents="none" style={styles.topGlow} />
      <SafeAreaView style={styles.flex}>
        {scroll ? (
          <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {body}
          </ScrollView>
        ) : body}
      </SafeAreaView>
    </View>
  );
}

export function HeroTitle({
  kicker,
  title,
  accent,
  body,
}: {
  kicker?: string;
  title: string;
  accent?: string;
  body?: string;
}) {
  return (
    <View style={styles.hero}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.title}>
        {title}
        {accent ? <Text style={styles.titleAccent}> {accent}</Text> : null}
      </Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

export function ActionCard({
  title,
  body,
  meta,
  tone = 'gold',
  onPress,
  children,
  style,
}: {
  title: string;
  body?: string;
  meta?: string;
  tone?: 'gold' | 'green' | 'orange' | 'red' | 'blue';
  onPress?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  const color = toneColor(tone);
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        hapticSecondary();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.card,
        { borderColor: color.border, backgroundColor: color.bg },
        pressed && styles.cardPressed,
        style,
      ]}
    >
      {meta ? <Text style={[styles.cardMeta, { color: color.text }]}>{meta}</Text> : null}
      <View style={styles.cardTop}>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          {body ? <Text style={styles.cardBody}>{body}</Text> : null}
        </View>
        {onPress ? <ChevronRight color={color.text} size={22} /> : null}
      </View>
      {children}
    </Pressable>
  );
}

export function EmptyState({ title, body, cta, onPress }: { title: string; body: string; cta?: string; onPress?: () => void }) {
  return (
    <ActionCard title={title} body={body} onPress={onPress}>
      {cta ? <Text style={styles.emptyCta}>{cta} →</Text> : null}
    </ActionCard>
  );
}

function toneColor(tone: 'gold' | 'green' | 'orange' | 'red' | 'blue') {
  switch (tone) {
    case 'green':
      return { border: uvColors.successBorder, bg: uvColors.successBg, text: uvColors.success };
    case 'orange':
      return { border: 'rgba(245,154,61,0.28)', bg: uvColors.warnBg, text: uvColors.warn };
    case 'red':
      return { border: uvColors.dangerBorder, bg: uvColors.dangerBg, text: uvColors.danger };
    case 'blue':
      return { border: 'rgba(121,168,255,0.28)', bg: uvColors.infoBg, text: uvColors.info };
    default:
      return { border: 'rgba(214,168,60,0.34)', bg: 'rgba(27,22,15,0.78)', text: uvColors.goldBright };
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: uvColors.bg,
  },
  flex: {
    flex: 1,
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(214,168,60,0.08)',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  content: {
    paddingHorizontal: uvSpacing.xl,
    paddingTop: 10,
  },
  chrome: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    fontWeight: '800',
    color: uvColors.textMuted,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  hero: {
    marginTop: 18,
    marginBottom: 24,
  },
  kicker: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: uvColors.goldBright,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 44,
    lineHeight: 44 * 1.02,
    color: uvColors.text,
  },
  titleAccent: {
    fontFamily: uvFonts.serifItalic,
    color: uvColors.gold,
  },
  body: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 17,
    lineHeight: 17 * 1.32,
    color: uvColors.textMuted,
    marginTop: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.995 }],
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cardCopy: {
    flex: 1,
  },
  cardMeta: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 25,
    lineHeight: 25 * 1.1,
    color: uvColors.text,
  },
  cardBody: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    lineHeight: 14 * 1.32,
    color: uvColors.textMuted,
    marginTop: 8,
  },
  emptyCta: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    fontWeight: '800',
    color: uvColors.goldBright,
    marginTop: 16,
  },
});

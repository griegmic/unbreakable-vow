import { router } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { AppMenuButton } from '@/components/app-menu';
import { AccountAvatarButton, GoldCTA, QuietPill, StakeTile, WitnessJudgeCard } from '@/components/primitives';
import { hapticSelection } from '@/lib/haptics';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';
import { useAuth } from '@/providers/auth-provider';

const SUGGESTIONS = ['Gym 3x this week', 'No alcohol, 2 weeks', 'Delete TikTok for a week', 'Call mom twice this week'];
const STAKES = [10, 25, 50, 100];

export default function NativePerfectQuickVow() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [vow, setVow] = useState('');
  const [stake, setStake] = useState(50);
  const [witnessName, setWitnessName] = useState('Joe');
  const verdict = useMemo(() => getSundayNight(), []);
  const canStake = vow.trim().length > 2 && isAuthenticated && !authLoading;
  const openGuidedFlow = () => {
    router.replace('/native-perfect/create/vow' as never);
  };

  useEffect(() => {
    if (authLoading || isAuthenticated) return;
    router.replace('/native-perfect/create/vow' as never);
  }, [authLoading, isAuthenticated]);

  const continueToPayment = () => {
    if (!canStake) return;
    router.push({
      pathname: '/native-perfect/create/payment',
      params: {
        rawInput: vow.trim(),
        stakeAmount: String(stake),
        consequence: 'charity',
        destination: 'ALS Association',
        deadlineIso: verdict.toISOString(),
        deadlineLabel: 'Sunday night',
        witnessName,
      },
    } as never);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[uvColors.bgCard, uvColors.bgGradMid, uvColors.bgGradDeep]}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Text style={styles.brand}>Unbreakable <Text style={styles.brandGold}>Vow</Text></Text>
          <View style={styles.topRight}>
            <AccountAvatarButton initial="J" style={styles.avatar} />
            <AppMenuButton style={styles.menuButton} />
          </View>
        </View>

        <Text style={styles.kicker}>Unbreakable Vow</Text>
        <Text style={styles.title}>Make a vow.{'\n'}<Text style={styles.goldItalic}>Mean it.</Text></Text>
        <Text style={styles.subcopy}>Put cash behind a promise. A friend verifies it. If you flake, it goes to charity.</Text>

        <View style={styles.vowCard}>
          <Text style={styles.cardLabel}>I vow to</Text>
          <TextInput
            value={vow}
            onChangeText={setVow}
            placeholder="I vow to..."
            placeholderTextColor="rgba(164,154,133,0.58)"
            multiline
            style={styles.vowInput}
          />
          <View style={styles.rule} />
          <View style={styles.verdictLine}>
            <CalendarDays color={uvColors.textDim} size={14} />
            <Text style={styles.verdictText}>Verdict <Text style={styles.verdictStrong}>Sunday night</Text></Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SUGGESTIONS.map(item => (
            <QuietPill key={item} label={item} onPress={() => setVow(item)} />
          ))}
        </ScrollView>

        <View style={styles.stakeCard}>
          <View style={styles.stakeTop}>
            <Text style={styles.cardLabel}>On the line</Text>
            <Text style={styles.stakeAside}>Small enough to choose today. Real enough to remember tomorrow.</Text>
          </View>
          <Text style={styles.money}>${stake}</Text>
          <View style={styles.stakeRow}>
            {STAKES.map(amount => (
              <StakeTile
                key={amount}
                amount={amount}
                label={`$${amount}`}
                selected={stake === amount}
                onPress={() => {
                  hapticSelection();
                  setStake(amount);
                }}
              />
            ))}
          </View>
        </View>

        <WitnessJudgeCard
          variant={witnessName ? 'filled' : 'empty'}
          witnessName={witnessName || undefined}
          witnessInitial={witnessName ? witnessName.charAt(0) : undefined}
          onChange={() => setWitnessName(witnessName === 'Joe' ? 'Sarah' : 'Joe')}
        />
        <Text style={styles.witnessNote}>{witnessName ? `${witnessName}’s been your witness before.` : 'Contacts first. Share link still works.'}</Text>

        <Text style={styles.destination}>If broken, <Text style={styles.destinationStrong}>${stake}</Text> goes to <Text style={styles.destinationStrong}>ALS Association</Text>.</Text>

        <GoldCTA
          label={authLoading ? 'Checking...' : `Stake $${stake} →`}
          disabled={!canStake}
          onPress={continueToPayment}
        />
        <View style={styles.guidedWrap}>
          <QuietPill label="Use guided flow" onPress={openGuidedFlow} />
        </View>
      </ScrollView>
    </View>
  );
}

function getSundayNight() {
  const now = new Date();
  const date = new Date(now);
  const daysUntilSunday = (7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSunday);
  date.setHours(21, 0, 0, 0);
  return date;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: uvColors.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: uvSpacing.xl,
    paddingBottom: 48,
  },
  topbar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: uvFonts.serifMedium,
    fontSize: 14,
    color: uvColors.text,
  },
  brandGold: {
    fontFamily: uvFonts.serifItalic,
    color: uvColors.gold,
  },
  topRight: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: uvColors.goldBg,
    borderWidth: 1,
    borderColor: uvColors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  kicker: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    color: uvColors.goldBright,
    textTransform: 'uppercase',
    marginTop: 14,
  },
  title: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 41,
    lineHeight: 41 * 1.02,
    color: uvColors.text,
    marginTop: 8,
    marginBottom: 10,
  },
  goldItalic: {
    fontFamily: uvFonts.serifItalic,
    color: uvColors.gold,
  },
  subcopy: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    color: uvColors.textCopy,
    marginBottom: 16,
  },
  vowCard: {
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.16)',
    borderRadius: 18,
    backgroundColor: 'rgba(24,20,16,0.82)',
    padding: 14,
  },
  cardLabel: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 4,
    color: uvColors.textKicker,
    textTransform: 'uppercase',
  },
  vowInput: {
    minHeight: 70,
    fontFamily: uvFonts.serifMedium,
    fontSize: 22,
    lineHeight: 28,
    color: uvColors.text,
    marginTop: 8,
  },
  rule: {
    height: 1,
    backgroundColor: uvColors.goldLine,
    marginVertical: 8,
  },
  verdictLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verdictText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    color: uvColors.textMuted,
  },
  verdictStrong: {
    color: uvColors.text,
    fontWeight: '800',
  },
  chips: {
    gap: 8,
    paddingVertical: 12,
  },
  stakeCard: {
    borderWidth: 1,
    borderColor: 'rgba(214,168,60,0.42)',
    borderRadius: 18,
    backgroundColor: 'rgba(214,168,60,0.05)',
    padding: 14,
    marginBottom: 12,
  },
  stakeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  stakeAside: {
    flex: 1,
    fontFamily: uvFonts.serifItalic,
    fontSize: 12,
    lineHeight: 14,
    color: uvColors.textMuted,
    textAlign: 'right',
  },
  money: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 54,
    lineHeight: 58,
    color: uvColors.goldBright,
    textAlign: 'center',
    marginVertical: 4,
  },
  stakeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  witnessNote: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    color: uvColors.textMuted,
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 12,
  },
  destination: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    color: uvColors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  destinationStrong: {
    color: uvColors.text,
    fontWeight: '800',
  },
  guidedWrap: {
    alignItems: 'center',
    marginTop: 14,
  },
});

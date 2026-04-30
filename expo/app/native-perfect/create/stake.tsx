/**
 * Screen 02 — Stake First, Selectable Verdict
 * + Screen 02b — Verdict Date Sheet (inline BottomSheet)
 * + Screen 02c — Change Destination Sheet (inline BottomSheet)
 * + Screen D9 — Custom Stake Sheet (inline BottomSheet)
 *
 * Phase 1 pair: 02+02b, then 02c+D9.
 * Mock: shots 2-4 + derived D9.
 * Spec: STEP_9 §screen-02, §screen-02b, §screen-02c.
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BottomSheet,
  CauseTypeCard,
  ChromeHeader,
  ConsequenceRow,
  DatePillRow,
  DestinationChip,
  GoldCTA,
  MoneyDisplay,
  StakeTile,
  VowDateCard,
  VowDateLine,
} from '@/components/primitives';
import { hapticPrimary, hapticSecondary, hapticSelection, hapticSheetPresent } from '@/lib/haptics';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';

const STAKE_OPTIONS = [20, 50, 100, -1]; // -1 = "Other"
const STAKE_LABELS: Record<number, string> = { 20: '$20', 50: '$50', 100: '$100', [-1]: 'Other' };

const CHEEKY_LINES: Record<string, string> = {
  '0': 'Word on the line, no money this time.',
  '10': 'Light enough to start. Real enough to count.',
  '20': 'Light enough to start. Real enough to count.',
  '25': 'Light enough to start. Real enough to count.',
  '50': 'Enough to hurt. Not enough to be stupid.',
  '100': 'Enough to make the promise louder.',
  default: 'Enough to make the promise louder.',
};

function getCheekyLine(amount: number): string {
  if (amount === 0) return CHEEKY_LINES['0'];
  if (amount <= 25) return CHEEKY_LINES['20'];
  if (amount <= 50) return CHEEKY_LINES['50'];
  return CHEEKY_LINES.default;
}

const DATE_OPTIONS = [
  { label: 'Tomorrow', value: '1d' },
  { label: '3 days', value: '3d' },
  { label: '1 week', value: '1w' },
  { label: '2 weeks', value: '2w' },
  { label: '1 month', value: '1m' },
];

const CAUSE_TYPES = [
  { id: 'charity', title: 'A cause you believe in', subtitle: 'Your stake goes to a real charity.', icon: '♥' },
  { id: 'anti', title: 'A cause you hate', subtitle: 'Extra motivation. It goes somewhere awful.', icon: '⚡' },
];

const DESTINATIONS: Record<string, string[]> = {
  charity: ['ALS Association', 'St. Jude', 'Red Cross', 'ACLU', 'WWF'],
  anti: ['NRA', 'Flat Earth Society', 'Other'],
};

function dateFromValue(value: string): Date {
  const now = new Date();
  const num = parseInt(value);
  if (value.endsWith('d')) { now.setDate(now.getDate() + num); }
  else if (value.endsWith('w')) { now.setDate(now.getDate() + num * 7); }
  else if (value.endsWith('m')) { now.setMonth(now.getMonth() + num); }
  return now;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function StakeScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ rawInput?: string }>();
  const rawInput = params.rawInput || '';

  // Stake state
  const [stakeAmount, setStakeAmount] = useState(50);
  const [selectedTile, setSelectedTile] = useState(50);

  // Date state
  const [deadlineValue, setDeadlineValue] = useState('1w');
  const deadlineDate = useMemo(() => dateFromValue(deadlineValue), [deadlineValue]);

  // Destination state
  const [consequence, setConsequence] = useState<'charity' | 'anti'>('charity');
  const [destination, setDestination] = useState('ALS Association');

  // Sheet visibility
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [causeSheetVisible, setCauseSheetVisible] = useState(false);
  const [customStakeSheetVisible, setCustomStakeSheetVisible] = useState(false);
  const [customStakeInput, setCustomStakeInput] = useState('');

  const handleTileSelect = useCallback((amount: number) => {
    if (amount === -1) {
      setCustomStakeInput(String(stakeAmount));
      setCustomStakeSheetVisible(true);
      hapticSheetPresent();
      return;
    }
    setSelectedTile(amount);
    setStakeAmount(amount);
  }, [stakeAmount]);

  const handleDateSelect = useCallback((value: string) => {
    setDeadlineValue(value);
  }, []);

  const handleConsequenceChange = useCallback(() => {
    hapticSecondary();
    setCauseSheetVisible(true);
  }, []);

  const handleNext = useCallback(() => {
    hapticPrimary();
    router.push({
      pathname: '/native-perfect/create/witness',
      params: {
        rawInput,
        stakeAmount: String(stakeAmount),
        consequence,
        destination,
        deadlineIso: deadlineDate.toISOString(),
      },
    } as never);
  }, [rawInput, stakeAmount, consequence, destination, deadlineDate]);

  const handleCustomStakeDone = useCallback(() => {
    const parsed = parseInt(customStakeInput);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 10000) {
      setStakeAmount(parsed);
      setSelectedTile(-1);
    }
    setCustomStakeSheetVisible(false);
  }, [customStakeInput]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Chrome header */}
        <ChromeHeader
          onBack={() => router.back()}
          centerText="2 / 5"
        />

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '40%' }]} />
        </View>

        {/* Title */}
        <Text style={styles.h1}>
          {'Set the '}
          <Text style={styles.h1GoldItalic}>stake.</Text>
        </Text>
        <Text style={styles.sub}>Enough to matter. Charged only if you flake.</Text>

        {/* Stake card */}
        <View style={styles.stakeCard}>
          <Text style={styles.kicker}>The Stake</Text>
          <MoneyDisplay amount={stakeAmount} />

          {/* Tiles */}
          <View style={styles.tiles}>
            {STAKE_OPTIONS.map((opt) => (
              <StakeTile
                key={opt}
                amount={opt}
                label={STAKE_LABELS[opt]}
                selected={selectedTile === opt}
                onPress={() => handleTileSelect(opt)}
              />
            ))}
          </View>

          {/* Cheeky line */}
          <Text style={styles.cheeky}>{getCheekyLine(stakeAmount)}</Text>

          {/* Consequence row */}
          <ConsequenceRow
            amount={stakeAmount}
            destination={destination}
            onChange={handleConsequenceChange}
          />
        </View>

        {/* Vow date card */}
        <VowDateCard>
          <VowDateLine
            label="Verdict"
            value={formatDate(deadlineDate)}
            tappable
            onTap={() => {
              hapticSecondary();
              setDateSheetVisible(true);
            }}
            editLabel="Change"
          />
        </VowDateCard>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
        <GoldCTA label="Choose your witness →" onPress={handleNext} />
      </View>

      {/* ── Sheet 02b: Verdict Date ── */}
      <BottomSheet
        visible={dateSheetVisible}
        onDismiss={() => setDateSheetVisible(false)}
        variant="date"
      >
        <Text style={styles.sheetTitle}>Verdict by when?</Text>
        <Text style={styles.sheetSub}>
          Pick a deadline. Your witness judges after this date.
        </Text>
        <DatePillRow
          options={DATE_OPTIONS}
          selected={deadlineValue}
          onSelect={(val) => {
            handleDateSelect(val);
            setTimeout(() => setDateSheetVisible(false), 200);
          }}
        />
      </BottomSheet>

      {/* ── Sheet 02c: Change Destination ── */}
      <BottomSheet
        visible={causeSheetVisible}
        onDismiss={() => setCauseSheetVisible(false)}
        variant="cause"
      >
        <Text style={styles.sheetTitleSerif}>Change where it goes.</Text>
        <Text style={styles.sheetSub}>
          If you break your vow, your stake goes to one of these.
        </Text>

        {CAUSE_TYPES.map((ct) => (
          <CauseTypeCard
            key={ct.id}
            title={ct.title}
            subtitle={ct.subtitle}
            icon={ct.icon}
            selected={consequence === ct.id}
            onSelect={() => {
              setConsequence(ct.id as 'charity' | 'anti');
              hapticSelection();
            }}
          />
        ))}

        <Text style={styles.destLabel}>Destination</Text>
        <View style={styles.destChips}>
          {(DESTINATIONS[consequence] || []).map((dest) => (
            <DestinationChip
              key={dest}
              label={dest}
              selected={destination === dest}
              onSelect={() => {
                setDestination(dest);
                hapticSelection();
              }}
            />
          ))}
        </View>

        <GoldCTA
          label="Done"
          onPress={() => {
            hapticPrimary();
            setCauseSheetVisible(false);
          }}
        />
      </BottomSheet>

      {/* ── Sheet D9: Custom Stake ── */}
      <BottomSheet
        visible={customStakeSheetVisible}
        onDismiss={() => setCustomStakeSheetVisible(false)}
      >
        <Text style={styles.sheetTitle}>Set your stake</Text>
        <Text style={styles.sheetSub}>
          Enter any amount from $0 to $100.
        </Text>

        <View style={styles.customStakeInputWrap}>
          <Text style={styles.customStakeDollar}>$</Text>
          <TextInput
            style={styles.customStakeInput}
            value={customStakeInput}
            onChangeText={setCustomStakeInput}
            keyboardType="number-pad"
            autoFocus
            maxLength={5}
            placeholder="0"
            placeholderTextColor={uvColors.textDim}
          />
        </View>

        <Text style={styles.cheeky}>{getCheekyLine(parseInt(customStakeInput) || 0)}</Text>

        <GoldCTA
          label="Set the stake"
          onPress={handleCustomStakeDone}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: uvColors.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: uvSpacing.xl,
    paddingBottom: 120,
  },
  progressTrack: {
    height: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(244,234,216,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: uvColors.gold,
  },
  h1: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 47,
    lineHeight: 47 * 1.03,
    color: uvColors.text,
    marginTop: 44,
  },
  h1GoldItalic: {
    fontFamily: uvFonts.serifItalic,
    color: uvColors.gold,
    fontStyle: 'italic',
  },
  sub: {
    fontFamily: uvFonts.sansMedium,
    fontSize: 18,
    lineHeight: 18 * 1.35,
    color: uvColors.textMuted,
    marginTop: 12,
    marginBottom: 24,
  },
  stakeCard: {
    borderWidth: 1,
    borderColor: 'rgba(214,168,60,0.46)',
    borderRadius: 22,
    backgroundColor: 'rgba(27,22,15,0.88)',
    padding: 20,
    shadowColor: 'rgba(214,168,60,0.045)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 1,
  },
  kicker: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 12 * 0.34,
    textTransform: 'uppercase',
    color: uvColors.textKicker,
  },
  tiles: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cheeky: {
    textAlign: 'center',
    color: uvColors.textCheeky,
    fontFamily: uvFonts.serifMedium,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 15 * 1.25,
    marginVertical: 14,
  },
  bottomCta: {
    position: 'absolute',
    left: uvSpacing.xl,
    right: uvSpacing.xl,
    bottom: 0,
  },
  // Sheet styles
  sheetTitle: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    fontSize: 26,
    lineHeight: 26 * 1.08,
    color: uvColors.text,
    letterSpacing: -0.26,
  },
  sheetTitleSerif: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 25,
    lineHeight: 25 * 1.08,
    color: uvColors.text,
    paddingRight: 54,
  },
  sheetSub: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    lineHeight: 15 * 1.35,
    color: uvColors.textMuted,
    marginTop: 8,
    marginBottom: 18,
    maxWidth: 330,
  },
  destLabel: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 10 * 0.28,
    textTransform: 'uppercase',
    color: uvColors.textKicker,
    marginTop: 20,
    marginBottom: 10,
  },
  destChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  creamCta: {
    marginTop: 20,
  },
  customStakeInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  customStakeDollar: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 48,
    color: uvColors.goldBright,
  },
  customStakeInput: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 48,
    color: uvColors.goldBright,
    minWidth: 80,
    textAlign: 'center',
  },
});

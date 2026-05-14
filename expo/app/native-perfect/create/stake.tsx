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
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
  CauseSegmentButton,
  ChromeHeader,
  ConsequenceRow,
  DatePillRow,
  DestinationChoiceCard,
  GoldCTA,
  MoneyDisplay,
  StakeTile,
  VowDateCard,
  VowDateLine,
} from '@/components/primitives';
import { hapticPrimary, hapticSecondary, hapticSheetPresent } from '@/lib/haptics';
import { uvColors, uvFonts } from '@/lib/uv-tokens';

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

const DESTINATIONS: Record<string, string[]> = {
  charity: ['ALS Association', 'St. Jude', 'Red Cross'],
  anti: ['NRA', 'Flat Earth Society', 'PETA'],
};

const DESTINATION_SUBTITLES: Record<string, string> = {
  'ALS Association': 'The default: serious, clean, easy to understand.',
  'St. Jude': 'Still wholesome. Still motivating.',
  'Red Cross': 'Classic good-cause stakes.',
  NRA: 'Maximum motivation.',
  'Flat Earth Society': 'Ridiculous enough to hurt.',
  PETA: 'For the extra dramatic vow maker.',
};

function dateFromValue(value: string): Date {
  const now = new Date();
  const num = parseInt(value);
  if (value.endsWith('d')) { now.setDate(now.getDate() + num); }
  else if (value.endsWith('w')) { now.setDate(now.getDate() + num * 7); }
  else if (value.endsWith('m')) { now.setMonth(now.getMonth() + num); }
  return verdictAtNine(now);
}

function verdictAtNine(date: Date): Date {
  const next = new Date(date);
  next.setHours(21, 0, 0, 0);
  return next;
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
  const [customDeadlineDate, setCustomDeadlineDate] = useState(() => dateFromValue('1w'));
  const [customDatePickerVisible, setCustomDatePickerVisible] = useState(false);
  const deadlineDate = useMemo(
    () => deadlineValue === 'custom' ? customDeadlineDate : dateFromValue(deadlineValue),
    [customDeadlineDate, deadlineValue]
  );

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
    setCustomDatePickerVisible(false);
  }, []);

  const handlePickCustomDate = useCallback(() => {
    setCustomDeadlineDate(deadlineDate);
    setDeadlineValue('custom');
    setCustomDatePickerVisible(true);
  }, [deadlineDate]);

  const handleCustomDateChange = useCallback((_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate) return;
    setCustomDeadlineDate(verdictAtNine(selectedDate));
    setDeadlineValue('custom');
  }, []);

  const handleConsequenceChange = useCallback(() => {
    hapticSecondary();
    setConsequence('anti');
    setDestination('NRA');
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
      {/* Vertical gradient overlay */}
      <LinearGradient
        colors={[uvColors.bgCard, uvColors.bgGradMid, uvColors.bgGradDeep]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* Gold radial on top-right */}
      <LinearGradient
        colors={['rgba(167,119,30,0.16)', 'transparent']}
        start={{ x: 0.82, y: 0 }}
        end={{ x: 0.48, y: 0.34 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Chrome header */}
        <ChromeHeader
          onBack={() => router.canGoBack() ? router.back() : router.replace('/native-perfect/create/vow')}
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
            label="Vow"
            value={rawInput || 'Run every morning'}
          />
          <VowDateLine
            label="Verdict"
            value={formatDate(deadlineDate)}
            tappable
            onTap={() => {
              hapticSecondary();
              setDateSheetVisible(true);
            }}
            editLabel={'\u270E'}
          />
        </VowDateCard>

        {/* Space reserved for the native sticky CTA. */}
        <View style={styles.scrollBottomSpacer} />
      </ScrollView>

      {/* Bottom CTA stays native-sticky so the stake summary never gets clipped by the phone edge. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.fixedBottomCta,
          { paddingBottom: Math.max(insets.bottom + 18, 30) },
        ]}
      >
        <LinearGradient
          colors={['rgba(5,4,3,0)', 'rgba(5,4,3,0.92)', 'rgba(5,4,3,0.98)']}
          locations={[0, 0.34, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
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
          onPickDate={handlePickCustomDate}
        />
        {customDatePickerVisible ? (
          <View style={styles.customDateBlock}>
            <Text style={styles.customDateLabel}>Exact verdict date</Text>
            <DateTimePicker
              value={customDeadlineDate}
              mode="date"
              display="inline"
              minimumDate={new Date()}
              onChange={handleCustomDateChange}
              themeVariant="dark"
              accentColor={uvColors.gold}
            />
            <Text style={styles.customDateHint}>
              Verdict will be due at 9:00 PM on {formatDate(customDeadlineDate)}.
            </Text>
            <GoldCTA
              label={`Use ${formatDate(customDeadlineDate)}`}
              onPress={() => {
                hapticPrimary();
                setDateSheetVisible(false);
                setCustomDatePickerVisible(false);
              }}
            />
          </View>
        ) : null}
      </BottomSheet>

      {/* ── Sheet 02c: Change Destination ── */}
      <BottomSheet
        visible={causeSheetVisible}
        onDismiss={() => setCauseSheetVisible(false)}
        variant="cause"
      >
        {consequence === 'anti' ? (
          <View style={styles.causeHeroHate}>
            <Text style={styles.causeHeroTitle}>
              Want it to sting <Text style={styles.causeHeroEm}>more?</Text>
            </Text>
            <Text style={styles.causeHeroSub}>
              Pick a place you really do not want your money going.
            </Text>
          </View>
        ) : (
          <View style={styles.goodCauseNote}>
            <Text style={styles.goodCauseNoteText}>At least the money helps.</Text>
          </View>
        )}

        <View style={styles.segmentRow}>
          <CauseSegmentButton
            label="Good cause"
            selected={consequence === 'charity'}
            tone="good"
            onPress={() => {
              setConsequence('charity');
              setDestination(DESTINATIONS.charity[0]);
            }}
          />
          <CauseSegmentButton
            label="Cause you hate"
            selected={consequence === 'anti'}
            tone="hate"
            onPress={() => {
              setConsequence('anti');
              setDestination(DESTINATIONS.anti[0]);
            }}
          />
        </View>

        <Text style={styles.destLabel}>If broken, send it to</Text>
        <View style={styles.destCards}>
          {(DESTINATIONS[consequence] || []).map((dest) => (
            <DestinationChoiceCard
              key={dest}
              label={dest}
              subtitle={DESTINATION_SUBTITLES[dest]}
              selected={destination === dest}
              tone={consequence === 'anti' ? 'hate' : 'good'}
              onSelect={() => setDestination(dest)}
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
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 178,
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
    marginTop: 36,
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
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 18,
  },
  stakeCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(214,168,60,0.46)',
    borderRadius: 22,
    backgroundColor: 'rgba(27,22,15,0.88)',
    paddingTop: 17,
    paddingHorizontal: 18,
    paddingBottom: 18,
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
  },
  cheeky: {
    textAlign: 'center',
    color: uvColors.textCheeky,
    fontFamily: uvFonts.serifMedium,
    fontStyle: 'italic',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 15 * 1.25,
    marginVertical: 11,
  },
  scrollBottomSpacer: {
    height: 8,
  },
  fixedBottomCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 18,
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
  causeHeroHate: {
    borderWidth: 1,
    borderColor: 'rgba(245,154,61,0.58)',
    backgroundColor: 'rgba(245,154,61,0.08)',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
  },
  causeHeroTitle: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 31,
    lineHeight: 31 * 1.05,
    color: uvColors.text,
  },
  causeHeroEm: {
    fontFamily: uvFonts.serifItalic,
    color: uvColors.gold,
    fontStyle: 'italic',
  },
  causeHeroSub: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    lineHeight: 14 * 1.25,
    color: uvColors.textMuted,
    marginTop: 8,
  },
  goodCauseNote: {
    borderWidth: 1,
    borderColor: 'rgba(214,168,60,0.34)',
    borderRadius: 18,
    backgroundColor: 'rgba(214,168,60,0.06)',
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  goodCauseNoteText: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    lineHeight: 15 * 1.25,
    fontWeight: '800',
    color: uvColors.goldBright,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
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
  customDateBlock: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(214,168,60,0.26)',
    borderRadius: 20,
    backgroundColor: 'rgba(244,234,216,0.035)',
    padding: 12,
    gap: 10,
  },
  customDateLabel: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 12 * 0.22,
    textTransform: 'uppercase',
    color: uvColors.textKicker,
  },
  customDateHint: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    lineHeight: 13 * 1.35,
    color: uvColors.textMuted,
    textAlign: 'center',
    marginBottom: 2,
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
  destCards: {
    gap: 9,
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

import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { CalendarDays, ContactRound, Diamond, Sparkles } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppMenuButton } from '@/components/app-menu';
import ContactPickerModal from '@/components/contact-picker-modal';
import { hapticPrimary, hapticSelection } from '@/lib/haptics';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { useVowFlow } from '@/providers/vow-flow';

const SUGGESTIONS = [
  'Workout 3x this week',
  'Delete TikTok for a week',
  'No alcohol 2 weeks',
  'No texting my ex for a month',
];

const STAKES = [10, 50, 100];

function getStakeNote(amount: number): string {
  if (amount <= 10) return 'Light enough to start. Real enough to count.';
  if (amount <= 25) return 'Enough to notice. Easy enough to choose.';
  if (amount <= 50) return 'Small enough to choose today. Real enough to remember tomorrow.';
  return 'Large enough to make the promise louder.';
}

export default function NativeQuickVowScreen() {
  const vowFlow = useVowFlow();
  const [vow, setVow] = useState('');
  const [stake, setStake] = useState(50);
  const [judge, setJudge] = useState('');
  const [judgePhone, setJudgePhone] = useState('');
  const [contactsOpen, setContactsOpen] = useState(false);
  const stakeScale = useRef(new Animated.Value(1)).current;
  const canContinue = vow.trim().length > 2;

  const selectStake = (amount: number) => {
    hapticSelection();
    setStake(amount);
    Animated.sequence([
      Animated.timing(stakeScale, { toValue: 1.045, duration: 90, useNativeDriver: true }),
      Animated.spring(stakeScale, { toValue: 1, speed: 24, bounciness: 7, useNativeDriver: true }),
    ]).start();
  };

  const continueFlow = () => {
    if (!canContinue) return;
    hapticPrimary();
    vowFlow.setRawInput(vow.trim());
    vowFlow.setRefinedText(vow.trim());
    vowFlow.setStake({
      amount: stake,
      consequence: 'charity',
      destination: 'ALS Association',
    });
    vowFlow.setDeadline(getSundayNight().toISOString());
    if (judge) {
      vowFlow.setWitnessType('friend');
      vowFlow.setWitness(judge, judgePhone ? 'sms' : 'link', judgePhone);
    } else {
      vowFlow.setWitnessType('friend');
      vowFlow.setWitness('Your witness', 'link', '');
    }
    router.push('/native-seal' as never);
  };

  const openOtherStake = () => {
    hapticSelection();
    if (Platform.OS === 'ios') {
      Alert.prompt('Set the stake.', 'Choose the amount that makes the vow real without making it reckless.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use amount',
          onPress: (value?: string) => {
            const amount = Math.round(Number(value));
            if (!Number.isFinite(amount) || amount < 1) return;
            selectStake(Math.min(amount, 10000));
          },
        },
      ], 'plain-text', String(stake), 'number-pad');
      return;
    }
    Alert.alert('Set the stake.', 'Custom stake entry is available in the TestFlight iPhone build.');
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#17130e', '#0f0d0a', '#090806']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.haloTop} />
      <View pointerEvents="none" style={styles.haloBottom} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topbar}>
              <View style={styles.brand}>
                <View style={styles.logoMark}>
                  <Diamond color="#0f0d0a" fill="#0f0d0a" size={12} />
                </View>
                <Text style={styles.wordmark}>Unbreakable <Text style={styles.wordmarkEm}>Vow</Text></Text>
              </View>
              <AppMenuButton style={styles.menuButton} />
            </View>

            <Text style={styles.eyebrow}>Seal a vow</Text>
            <Text style={styles.title}>One promise.{'\n'}<Text style={styles.titleEm}>Real consequence.</Text></Text>

            <View style={styles.vowCard}>
              <Text style={styles.cardLabel}>I vow to</Text>
              <TextInput
                value={vow}
                onChangeText={setVow}
                placeholder="skip takeout all week"
                placeholderTextColor="rgba(164,154,133,0.48)"
                multiline
                style={styles.vowInput}
                returnKeyType="done"
              />
              <View style={styles.vowRule} />
              <View style={styles.verdictRow}>
                <CalendarDays color={uvColors.textDim} size={14} />
                <Text style={styles.verdictText}>Verdict <Text style={styles.verdictStrong}>{formatVerdictDate(getSundayNight())}</Text></Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionRow}
            >
              {SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  style={styles.suggestionChip}
                  onPress={() => {
                    hapticSelection();
                    setVow(suggestion);
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.stakeCard}>
                <View style={styles.stakeHeader}>
                  <Text style={styles.cardLabel}>On the line</Text>
                <Text style={styles.stakeAside}>{getStakeNote(stake)}</Text>
              </View>
              <Animated.Text style={[styles.stakeDisplay, { transform: [{ scale: stakeScale }] }]}>
                ${stake}
              </Animated.Text>
              <View style={styles.stakeGrid}>
                {STAKES.map((amount) => {
                  const selected = stake === amount;
                  return (
                    <Pressable
                      key={amount}
                      style={[styles.stakeTile, selected && styles.stakeTileSelected]}
                      onPress={() => selectStake(amount)}
                    >
                      <Text style={[styles.stakeTileText, selected && styles.stakeTileTextSelected]}>${amount}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={[styles.stakeTile, !STAKES.includes(stake) && styles.stakeTileSelected]}
                  onPress={openOtherStake}
                >
                  <Text style={[styles.stakeTileText, !STAKES.includes(stake) && styles.stakeTileTextSelected]}>Other</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={styles.judgeCard}
              onPress={() => {
                hapticSelection();
                setContactsOpen(true);
              }}
            >
              <View style={styles.judgeIcon}>
                {judge ? <Text style={styles.judgeInitial}>{judge.charAt(0)}</Text> : <ContactRound color={uvColors.goldBright} size={18} />}
              </View>
              <View style={styles.judgeCopy}>
                <Text style={styles.judgeTitle}>{judge ? `Judged by ${judge}` : 'Share judge link'}</Text>
                <Text style={styles.judgeSub}>{judge ? 'They can accept before you seal.' : 'Optional before sealing.'}</Text>
              </View>
              <Text style={styles.judgeArrow}>{judge ? 'Change' : '+'}</Text>
            </Pressable>

            <Pressable style={styles.destinationCard} onPress={hapticSelection}>
              <Sparkles color={uvColors.goldBright} size={15} />
              <Text style={styles.destinationText}>
                If broken, <Text style={styles.destinationStrong}>${stake}</Text> goes to <Text style={styles.destinationStrong}>ALS Association</Text>
              </Text>
            </Pressable>

          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              disabled={!canContinue}
              onPress={continueFlow}
              style={({ pressed }) => [
                styles.cta,
                !canContinue && styles.ctaDisabled,
                pressed && canContinue && styles.ctaPressed,
              ]}
            >
              <LinearGradient
                colors={canContinue ? [uvColors.goldBright, uvColors.gold, uvColors.goldDeep] : ['#2b3039', '#252a32']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text style={[styles.ctaText, !canContinue && styles.ctaTextDisabled]}>Continue</Text>
                <View style={styles.ctaArrow}>
                  <Text style={styles.ctaArrowText}>{'>'}</Text>
                </View>
              </LinearGradient>
            </Pressable>
            <Pressable
              style={styles.helpButton}
              onPress={() => {
                hapticSelection();
                router.push('/guided' as never);
              }}
            >
              <Text style={styles.helpText}>Need help? Guided setup</Text>
            </Pressable>
            <Text style={styles.footerNote}>Nothing charges unless you break it.</Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
      <ContactPickerModal
        visible={contactsOpen}
        onClose={() => setContactsOpen(false)}
        onSelect={(name, phone) => {
          hapticSelection();
          setJudge(name);
          setJudgePhone(phone);
          setContactsOpen(false);
        }}
      />
    </View>
  );
}

function getSundayNight() {
  const d = new Date();
  const diff = 7 - d.getDay();
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  d.setHours(21, 0, 0, 0);
  return d;
}

function formatVerdictDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: uvColors.bg,
  },
  haloTop: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    right: -150,
    top: -110,
    backgroundColor: 'rgba(200,155,60,0.11)',
  },
  haloBottom: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    left: -180,
    bottom: 40,
    backgroundColor: 'rgba(34,65,95,0.18)',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 190,
    gap: 12,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uvColors.goldBright,
  },
  wordmark: {
    color: uvColors.text,
    fontFamily: uvFonts.serifMedium,
    fontSize: 16,
  },
  wordmarkEm: {
    color: uvColors.goldBright,
    fontStyle: 'italic',
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,233,219,0.04)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
  },
  eyebrow: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    color: uvColors.text,
    fontFamily: uvFonts.serifMedium,
    fontSize: 35,
    lineHeight: 37,
    letterSpacing: 0,
  },
  titleEm: {
    color: uvColors.goldBright,
    fontStyle: 'italic',
  },
  vowCard: {
    borderRadius: 22,
    padding: 15,
    gap: 10,
    backgroundColor: 'rgba(24,21,18,0.88)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
  },
  cardLabel: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  vowInput: {
    minHeight: 66,
    color: uvColors.text,
    fontFamily: uvFonts.sansMedium,
    fontSize: 25,
    lineHeight: 30,
    padding: 0,
  },
  vowRule: {
    height: 1,
    backgroundColor: uvColors.goldLine,
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verdictText: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sans,
    fontSize: 14,
  },
  verdictStrong: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
  },
  suggestionRow: {
    gap: 8,
    paddingRight: 22,
  },
  suggestionChip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,233,219,0.035)',
    borderWidth: 1,
    borderColor: uvColors.border,
  },
  suggestionText: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sansMedium,
    fontSize: 13,
  },
  stakeCard: {
    borderRadius: 22,
    padding: 14,
    gap: 10,
    backgroundColor: 'rgba(24,21,18,0.82)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
  },
  stakeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  stakeAside: {
    flex: 1,
    maxWidth: 190,
    color: uvColors.textMuted,
    fontFamily: uvFonts.serifItalic,
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'right',
  },
  stakeDisplay: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.serifMedium,
    fontSize: 66,
    lineHeight: 68,
  },
  stakeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  stakeTile: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,233,219,0.035)',
    borderWidth: 1,
    borderColor: uvColors.border,
  },
  stakeTileSelected: {
    backgroundColor: uvColors.goldBg,
    borderColor: uvColors.gold,
  },
  stakeTileText: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 16,
  },
  stakeTileTextSelected: {
    color: uvColors.goldBright,
  },
  judgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 66,
    padding: 13,
    borderRadius: 20,
    backgroundColor: 'rgba(24,21,18,0.86)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
  },
  judgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uvColors.goldSoft,
  },
  judgeInitial: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 17,
  },
  judgeCopy: {
    flex: 1,
    gap: 3,
  },
  judgeTitle: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 18,
  },
  judgeSub: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sans,
    fontSize: 13,
  },
  judgeArrow: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 20,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(42,32,21,0.52)',
    borderWidth: 1,
    borderColor: uvColors.goldLine,
  },
  destinationText: {
    flex: 1,
    color: uvColors.text,
    fontFamily: uvFonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  destinationStrong: {
    fontFamily: uvFonts.sansSemibold,
  },
  previewCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(240,233,219,0.028)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
    gap: 6,
  },
  previewLabel: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  previewText: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.serifItalic,
    fontSize: 17,
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 14,
    backgroundColor: 'rgba(15,13,10,0.94)',
    borderTopWidth: 1,
    borderTopColor: uvColors.borderSoft,
    gap: 8,
  },
  cta: {
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    shadowColor: uvColors.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
  },
  ctaDisabled: {
    shadowOpacity: 0,
  },
  ctaPressed: {
    transform: [{ scale: 0.985 }],
  },
  ctaGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: {
    color: uvColors.textOnGold,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 18,
  },
  ctaTextDisabled: {
    color: 'rgba(240,233,219,0.48)',
  },
  ctaArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,13,10,0.92)',
  },
  ctaArrowText: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 18,
    marginTop: -1,
  },
  footerNote: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansMedium,
    fontSize: 12,
    textAlign: 'center',
  },
  helpButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
  },
  helpText: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
  },
});

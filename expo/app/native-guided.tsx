import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { CalendarDays, ChevronLeft, Diamond, Sparkles, UserRound } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppMenuButton } from '@/components/app-menu';
import ContactPickerModal from '@/components/contact-picker-modal';
import { hapticClockStart, hapticPrimary, hapticSealComplete, hapticSelection } from '@/lib/haptics';
import { uvColors, uvFonts } from '@/lib/uv-tokens';
import { useVowFlow } from '@/providers/vow-flow';

type Step = 'ceremony' | 'vow' | 'terms' | 'judge';

const SUGGESTIONS = ['Gym 3x this week', 'Delete TikTok for a week', 'No alcohol, 2 weeks', 'No texting my ex'];
const STAKES = [20, 50, 100];

export default function NativeGuidedScreen() {
  const flow = useVowFlow();
  const [step, setStep] = useState<Step>('ceremony');
  const [vowText, setVowText] = useState('');
  const [stake, setStake] = useState(50);
  const [judgeName, setJudgeName] = useState('');
  const [judgePhone, setJudgePhone] = useState('');
  const [contactsOpen, setContactsOpen] = useState(false);
  const ceremonyScale = useRef(new Animated.Value(0.96)).current;
  const ceremonyOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(ceremonyOpacity, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.spring(ceremonyScale, { toValue: 1, speed: 10, bounciness: 5, useNativeDriver: true }),
    ]).start();
  }, [ceremonyOpacity, ceremonyScale, step]);

  const deadline = useMemo(() => getSundayNight(), []);
  const canContinue = step === 'vow' ? vowText.trim().length > 2 : true;

  const go = (next: Step) => {
    hapticPrimary();
    setStep(next);
  };

  const swearIt = () => {
    hapticSealComplete();
    setTimeout(() => {
      hapticClockStart();
      setStep('vow');
    }, 120);
  };

  const back = () => {
    hapticSelection();
    if (step === 'ceremony') {
      router.replace('/quick-vow' as never);
      return;
    }
    if (step === 'vow') setStep('ceremony');
    if (step === 'terms') setStep('vow');
    if (step === 'judge') setStep('terms');
  };

  const seal = () => {
    if (!vowText.trim()) return;
    hapticPrimary();
    flow.setRawInput(vowText.trim());
    flow.setRefinedText(vowText.trim());
    flow.setStake({ amount: stake, consequence: 'charity', destination: 'ALS Association' });
    flow.setDeadline(deadline.toISOString());
    flow.setWitnessType('friend');
    flow.setWitness(judgeName || 'Your witness', judgePhone ? 'sms' : 'link', judgePhone);
    router.push('/native-seal' as never);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#17130e', '#0f0d0a', '#080706']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.haloTop} />
      <View pointerEvents="none" style={styles.haloBottom} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.topbar}>
            <Pressable onPress={back} style={styles.navButton} hitSlop={10}>
              <ChevronLeft color={uvColors.textMuted} size={22} />
            </Pressable>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressWidth(step) }]} />
            </View>
            <AppMenuButton style={styles.navButton} />
          </View>

          {step === 'ceremony' ? (
            <Animated.View style={[styles.ceremony, { opacity: ceremonyOpacity, transform: [{ scale: ceremonyScale }] }]}>
              <View style={styles.sealMark}>
                <Diamond color={uvColors.textOnGold} fill={uvColors.textOnGold} size={24} />
              </View>
              <Text style={styles.ceremonyTitle}>I do solemnly swear{'\n'}to keep my word.</Text>
              <Text style={styles.ceremonySub}>This is the part where it gets real.</Text>
              <Pressable style={({ pressed }) => [styles.ceremonyCta, pressed && styles.pressed]} onPress={swearIt}>
                <LinearGradient colors={[uvColors.goldBright, uvColors.gold]} style={styles.ceremonyCtaGradient}>
                  <Text style={styles.ceremonyCtaText}>I swear it</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ) : null}

          {step === 'vow' ? (
            <View style={styles.content}>
              <Text style={styles.stepMeta}>Step 1 of 3</Text>
              <Text style={styles.title}>What’s your <Text style={styles.titleEm}>vow?</Text></Text>
              <Text style={styles.sub}>You know the one.</Text>
              <View style={styles.inputCard}>
                <TextInput
                  value={vowText}
                  onChangeText={setVowText}
                  placeholder="I will..."
                  placeholderTextColor="rgba(164,154,133,0.5)"
                  multiline
                  autoFocus
                  style={styles.vowInput}
                />
              </View>
              <View style={styles.chips}>
                {SUGGESTIONS.map((item) => (
                  <Pressable key={item} style={styles.chip} onPress={() => { hapticSelection(); setVowText(item); }}>
                    <Text style={styles.chipText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {step === 'terms' ? (
            <View style={styles.content}>
              <Text style={styles.stepMeta}>Step 2 of 3</Text>
              <Text style={styles.title}>Set the <Text style={styles.titleEm}>terms.</Text></Text>
              <Text style={styles.sub}>A vow without weight is a wish.</Text>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>The vow</Text>
                <Text style={styles.summaryText}>{vowText}</Text>
              </View>
              <View style={styles.termsCard}>
                <Text style={styles.cardLabel}>The stake</Text>
                <Text style={styles.stakeDisplay}>${stake}</Text>
                <View style={styles.stakeRow}>
                  {STAKES.map((amount) => (
                    <Pressable key={amount} onPress={() => { hapticSelection(); setStake(amount); }} style={[styles.stakeTile, stake === amount && styles.stakeTileSelected]}>
                      <Text style={[styles.stakeTileText, stake === amount && styles.stakeTileTextSelected]}>${amount}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.stakeNote}>{stakeNote(stake)}</Text>
                <View style={styles.destinationLine}>
                  <Sparkles color={uvColors.goldBright} size={14} />
                  <Text style={styles.destinationText}>If broken, <Text style={styles.strong}>${stake}</Text> goes to <Text style={styles.strong}>ALS Association</Text></Text>
                </View>
              </View>
              <View style={styles.dateLine}>
                <CalendarDays color={uvColors.textMuted} size={15} />
                <Text style={styles.dateText}>Verdict by <Text style={styles.strong}>{formatDate(deadline)}</Text></Text>
              </View>
            </View>
          ) : null}

          {step === 'judge' ? (
            <View style={styles.content}>
              <Text style={styles.stepMeta}>Step 3 of 3</Text>
              <Text style={styles.title}>Choose your <Text style={styles.titleEm}>witness.</Text></Text>
              <Text style={styles.sub}>They get the final say.</Text>
              <Pressable style={styles.judgeCard} onPress={() => { hapticSelection(); setContactsOpen(true); }}>
                <View style={styles.judgeAvatar}>
                  {judgeName ? <Text style={styles.judgeInitial}>{judgeName.charAt(0)}</Text> : <UserRound color={uvColors.goldBright} size={22} />}
                </View>
                <View style={styles.judgeCopy}>
                  <Text style={styles.judgeTitle}>{judgeName ? `Judged by ${judgeName}` : 'Add a judge'}</Text>
                  <Text style={styles.judgeSub}>{judgeName ? 'They’ll receive your witness link.' : 'Contacts first. Share link still works.'}</Text>
                </View>
                <Text style={styles.judgeAction}>{judgeName ? 'Change' : '+'}</Text>
              </Pressable>
              <View style={styles.finalCard}>
                <Text style={styles.cardLabel}>Ready to seal</Text>
                <Text style={styles.finalText}>{vowText}</Text>
                <Text style={styles.finalMeta}>${stake} · {judgeName || 'Your witness'} · {formatDate(deadline)}</Text>
              </View>
            </View>
          ) : null}

          {step !== 'ceremony' ? (
            <View style={styles.footer}>
              <Pressable
                disabled={!canContinue}
                onPress={() => {
                  if (step === 'vow') go('terms');
                  if (step === 'terms') go('judge');
                  if (step === 'judge') seal();
                }}
                style={({ pressed }) => [styles.cta, !canContinue && styles.disabled, pressed && canContinue && styles.pressed]}
              >
                <LinearGradient colors={canContinue ? [uvColors.goldBright, uvColors.gold, uvColors.goldDeep] : ['#2b3039', '#252a32']} style={styles.ctaGradient}>
                  <Text style={[styles.ctaText, !canContinue && styles.disabledText]}>{step === 'judge' ? 'Seal your vow' : 'Next'}</Text>
                </LinearGradient>
              </Pressable>
              <Text style={styles.footerNote}>No charge now. Only if you break it.</Text>
            </View>
          ) : null}
        </SafeAreaView>
      </KeyboardAvoidingView>

      <ContactPickerModal
        visible={contactsOpen}
        onClose={() => setContactsOpen(false)}
        onSelect={(name, phone) => {
          hapticSelection();
          setJudgeName(name);
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

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function progressWidth(step: Step) {
  if (step === 'ceremony') return '18%';
  if (step === 'vow') return '38%';
  if (step === 'terms') return '68%';
  return '100%';
}

function stakeNote(amount: number) {
  if (amount <= 20) return 'Enough to sting. Still sane.';
  if (amount <= 50) return 'Enough to hurt. Not enough to be stupid.';
  return 'Now your word has teeth.';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: uvColors.bg },
  haloTop: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    right: -150,
    top: -120,
    backgroundColor: 'rgba(200,155,60,0.12)',
  },
  haloBottom: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    left: -185,
    bottom: 70,
    backgroundColor: 'rgba(34,65,95,0.16)',
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,233,219,0.04)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 99,
    backgroundColor: uvColors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 99,
    backgroundColor: uvColors.goldBright,
  },
  ceremony: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    paddingBottom: 60,
  },
  sealMark: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uvColors.goldBright,
    shadowColor: uvColors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    marginBottom: 34,
  },
  ceremonyTitle: {
    color: uvColors.text,
    fontFamily: uvFonts.serifSemibold,
    fontSize: 36,
    lineHeight: 43,
    textAlign: 'center',
  },
  ceremonySub: {
    marginTop: 14,
    color: uvColors.textMuted,
    fontFamily: uvFonts.sans,
    fontSize: 17,
    textAlign: 'center',
  },
  ceremonyCta: {
    marginTop: 36,
    height: 56,
    minWidth: 170,
    borderRadius: 28,
    overflow: 'hidden',
  },
  ceremonyCtaGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  ceremonyCtaText: {
    color: uvColors.textOnGold,
    fontFamily: uvFonts.serifSemibold,
    fontSize: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 40,
    paddingBottom: 150,
    gap: 15,
  },
  stepMeta: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 38,
    lineHeight: 42,
  },
  titleEm: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.serifItalic,
  },
  sub: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sans,
    fontSize: 17,
    lineHeight: 24,
  },
  inputCard: {
    minHeight: 118,
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(24,21,18,0.88)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
  },
  vowInput: {
    color: uvColors.text,
    fontFamily: uvFonts.sansMedium,
    fontSize: 27,
    lineHeight: 33,
    padding: 0,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    paddingHorizontal: 14,
    minHeight: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,233,219,0.035)',
    borderWidth: 1,
    borderColor: uvColors.border,
  },
  chipText: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sansMedium,
    fontSize: 13,
  },
  summaryCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(24,21,18,0.86)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
    gap: 9,
  },
  termsCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(24,21,18,0.88)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
    gap: 13,
  },
  cardLabel: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  summaryText: {
    color: uvColors.text,
    fontFamily: uvFonts.serifMedium,
    fontSize: 27,
    lineHeight: 34,
  },
  stakeDisplay: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.serifSemibold,
    fontSize: 64,
    lineHeight: 68,
  },
  stakeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stakeTile: {
    flex: 1,
    height: 54,
    borderRadius: 16,
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
    fontSize: 18,
  },
  stakeTileTextSelected: {
    color: uvColors.goldBright,
  },
  stakeNote: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.serifItalic,
    fontSize: 15,
    textAlign: 'center',
  },
  destinationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(42,32,21,0.48)',
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
  strong: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
  },
  dateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  dateText: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sans,
    fontSize: 15,
  },
  judgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 78,
    padding: 15,
    borderRadius: 22,
    backgroundColor: 'rgba(24,21,18,0.9)',
    borderWidth: 1,
    borderColor: uvColors.borderGoldSoft,
  },
  judgeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uvColors.goldSoft,
  },
  judgeInitial: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 18,
  },
  judgeCopy: {
    flex: 1,
    gap: 3,
  },
  judgeTitle: {
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 19,
  },
  judgeSub: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sans,
    fontSize: 13,
  },
  judgeAction: {
    color: uvColors.goldBright,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 18,
  },
  finalCard: {
    borderRadius: 22,
    padding: 18,
    gap: 9,
    backgroundColor: 'rgba(24,21,18,0.76)',
    borderWidth: 1,
    borderColor: uvColors.borderSoft,
  },
  finalText: {
    color: uvColors.text,
    fontFamily: uvFonts.serifMedium,
    fontSize: 27,
    lineHeight: 34,
  },
  finalMeta: {
    color: uvColors.textMuted,
    fontFamily: uvFonts.sansMedium,
    fontSize: 14,
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
  },
  ctaGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: uvColors.textOnGold,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 18,
  },
  disabled: {
    opacity: 0.75,
  },
  disabledText: {
    color: 'rgba(240,233,219,0.48)',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  footerNote: {
    color: uvColors.textDim,
    fontFamily: uvFonts.sansMedium,
    fontSize: 12,
    textAlign: 'center',
  },
});

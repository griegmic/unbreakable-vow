/**
 * Screen 03 — Choose Witness
 * + Screen 03b — Pick Witness Sheet
 * + Screen 03c — Witness Selected (state variant of 03)
 *
 * Phase 2 singleton (03) + pair (03b+03c).
 * Mock: shots 5-7.
 * Spec: STEP_9 §screen-03, §screen-03b, §screen-03c.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BottomSheet,
  ChromeHeader,
  GoldCTA,
  OutlinedGoldCTA,
  QuietPill,
  WitnessJudgeCard,
} from '@/components/primitives';
import { LinearGradient } from 'expo-linear-gradient';
import {
  hapticPrimary,
  hapticSecondary,
  hapticSelection,
  hapticSheetPresent,
} from '@/lib/haptics';
import { type ContactEntry, requestAndLoadContacts } from '@/lib/contacts';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';
import { prepareJudgeLink } from '@/lib/prepare-judge-link';
import { useAuth } from '@/providers/auth-provider';

type WitnessDecision = 'none' | 'selected' | 'deferred' | 'shared';

export default function WitnessScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{
    rawInput?: string;
    stakeAmount?: string;
    consequence?: string;
    destination?: string;
    deadlineIso?: string;
  }>();

  const stakeAmount = parseInt(params.stakeAmount || '50');
  const rawInput = params.rawInput || '';

  // Witness state
  const [witnessName, setWitnessName] = useState<string | null>(null);
  const [witnessPhone, setWitnessPhone] = useState<string | null>(null);
  const [witnessInitial, setWitnessInitial] = useState<string | null>(null);
  const [witnessDecision, setWitnessDecision] = useState<WitnessDecision>('none');
  const [askJoeLabel, setAskJoeLabel] = useState('Ask Joe now →');
  const [syncedContacts, setSyncedContacts] = useState<ContactEntry[]>([]);
  const [contactsSynced, setContactsSynced] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsDenied, setContactsDenied] = useState(false);
  const [contactsCanAskAgain, setContactsCanAskAgain] = useState(true);
  const [contactQuery, setContactQuery] = useState('');
  const [sharingInvite, setSharingInvite] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [preparedVowId, setPreparedVowId] = useState<string | null>(null);
  const [preparedAnonymousToken, setPreparedAnonymousToken] = useState<string | null>(null);
  const [preparedWitnessToken, setPreparedWitnessToken] = useState<string | null>(null);
  const [preparedWitnessUrl, setPreparedWitnessUrl] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState(false);

  // Sheet state
  const [pickSheetVisible, setPickSheetVisible] = useState(false);
  const [decideLaterSheetVisible, setDecideLaterSheetVisible] = useState(false);

  const hasWitness = witnessDecision === 'selected' && witnessName;
  const verdictLabel = params.deadlineIso
    ? new Date(params.deadlineIso).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'Sunday';
  const stakeSummary = stakeAmount > 0
    ? `$${stakeAmount} if broken \u2192 ${params.destination || 'ALS Association'}`
    : '$0 on the line';
  const deadlineIso = params.deadlineIso || new Date(Date.now() + 7 * 86400000).toISOString();
  const consequence = params.consequence === 'anti' || params.consequence === 'witness'
    ? params.consequence
    : 'charity';

  const navigateNext = useCallback((decision: WitnessDecision, overrides?: {
    vowId?: string;
    anonymousToken?: string;
    witnessInviteToken?: string;
    witnessUrl?: string;
    inviteSent?: boolean;
    witnessName?: string | null;
    witnessPhone?: string | null;
  }) => {
    router.push({
      pathname: isAuthenticated ? '/native-perfect/create/payment' : '/native-perfect/create/auth',
      params: {
        rawInput,
        stakeAmount: String(stakeAmount),
        consequence: params.consequence,
        destination: params.destination,
        deadlineIso: params.deadlineIso,
        witnessName: overrides?.witnessName ?? witnessName ?? '',
        witnessPhone: overrides?.witnessPhone ?? witnessPhone ?? '',
        witnessDecision: decision,
        vowId: overrides?.vowId ?? preparedVowId ?? '',
        anonymousToken: overrides?.anonymousToken ?? preparedAnonymousToken ?? '',
        witnessInviteToken: overrides?.witnessInviteToken ?? preparedWitnessToken ?? '',
        witnessUrl: overrides?.witnessUrl ?? preparedWitnessUrl ?? '',
        inviteSent: (overrides?.inviteSent ?? inviteSent) ? '1' : '0',
      },
    } as never);
  }, [
    isAuthenticated,
    rawInput,
    stakeAmount,
    params.consequence,
    params.destination,
    params.deadlineIso,
    witnessName,
    witnessPhone,
    preparedVowId,
    preparedAnonymousToken,
    preparedWitnessToken,
    preparedWitnessUrl,
    inviteSent,
  ]);

  const handleAddWitness = useCallback(() => {
    hapticSecondary();
    hapticSheetPresent();
    setPickSheetVisible(true);
  }, []);

  const handleContactSelect = useCallback((contact: ContactEntry) => {
    const firstName = contact.name.split(' ')[0] || contact.name;
    hapticSelection();
    setWitnessName(firstName);
    setWitnessPhone(contact.phone);
    setWitnessInitial(firstName.charAt(0).toUpperCase());
    setWitnessDecision('selected');
    setAskJoeLabel(`Ask ${firstName} now →`);
    setPickSheetVisible(false);
  }, []);

  const handleChooseContact = useCallback(async () => {
    hapticPrimary();
    setContactsLoading(true);
    setShareError(null);
    try {
      const result = await requestAndLoadContacts();
      setContactsDenied(!result.granted);
      setContactsCanAskAgain(result.canAskAgain);
      if (result.granted) {
        setContactsSynced(true);
        setSyncedContacts(result.contacts);
      }
    } finally {
      setContactsLoading(false);
    }
  }, []);

  const handleDecideLater = useCallback(() => {
    hapticSecondary();
    hapticSheetPresent();
    setDecideLaterSheetVisible(true);
  }, []);

  const handleConfirmDecideLater = useCallback(() => {
    hapticSecondary();
    setWitnessDecision('deferred');
    setDecideLaterSheetVisible(false);
    navigateNext('deferred');
  }, [navigateNext]);

  const prepareInvite = useCallback(async (shareMethod: 'share' | 'contact') => {
    const vowText = rawInput.trim() || 'keep my vow';
    const prepared = await prepareJudgeLink({
      vowId: preparedVowId,
      anonymousToken: preparedAnonymousToken,
      rawInput: vowText,
      refinedText: vowText,
      witnessName: witnessName || null,
      witnessPhone,
      stakeAmountCents: stakeAmount * 100,
      consequence,
      destination: params.destination || 'ALS Association',
      endsAt: deadlineIso,
    }, shareMethod);

    setPreparedVowId(prepared.vowId);
    if (prepared.anonymousToken) setPreparedAnonymousToken(prepared.anonymousToken);
    setPreparedWitnessToken(prepared.witnessInviteToken);
    setPreparedWitnessUrl(prepared.witnessUrl);
    return prepared;
  }, [
    rawInput,
    preparedVowId,
    preparedAnonymousToken,
    witnessName,
    witnessPhone,
    stakeAmount,
    consequence,
    params.destination,
    deadlineIso,
  ]);

  const sharePreparedInvite = useCallback(async (prepared: Awaited<ReturnType<typeof prepareJudgeLink>>) => {
    const message = prepared.shareText.includes(prepared.witnessUrl)
      ? prepared.shareText
      : `${prepared.shareText} ${prepared.witnessUrl}`;

    return Share.share({
      title: 'Be my witness',
      message,
      url: prepared.witnessUrl,
    });
  }, []);

  const markInviteAttempted = useCallback(async (vowId: string) => {
    await AsyncStorage.setItem(`sms_open_attempted:${vowId}`, '1').catch(() => {});
  }, []);

  const handleShareLink = useCallback(async () => {
    if (sharingInvite) return;
    hapticSecondary();
    setSharingInvite(true);
    setShareError(null);
    try {
      const prepared = await prepareInvite('share');
      await sharePreparedInvite(prepared);
      await markInviteAttempted(prepared.vowId);
      setWitnessDecision('shared');
      setInviteSent(true);
      setPickSheetVisible(false);
      navigateNext('shared', {
        vowId: prepared.vowId,
        anonymousToken: prepared.anonymousToken,
        witnessInviteToken: prepared.witnessInviteToken,
        witnessUrl: prepared.witnessUrl,
        inviteSent: true,
        witnessName: null,
        witnessPhone: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create the witness link.';
      setShareError(message);
      Alert.alert('Could not open share sheet', message);
    } finally {
      setSharingInvite(false);
    }
  }, [markInviteAttempted, navigateNext, prepareInvite, sharePreparedInvite, sharingInvite]);

  const handleAskNow = useCallback(async () => {
    if (sharingInvite) return;
    hapticSecondary();
    setSharingInvite(true);
    setShareError(null);

    let prepared;
    try {
      prepared = await prepareInvite(witnessPhone ? 'contact' : 'share');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create the witness link.';
      setShareError(message);
      Alert.alert('Could not create witness link', message);
      setSharingInvite(false);
      return;
    }

    if (!witnessPhone) {
      sharePreparedInvite(prepared)
        .then(() => {
          setInviteSent(true);
          setWitnessDecision('selected');
          void markInviteAttempted(prepared.vowId);
          setAskJoeLabel(prev =>
            prev.includes('again') ? prev : prev.replace('now', 'again'),
          );
        })
        .catch(() => {})
        .finally(() => setSharingInvite(false));
      return;
    }

    const separator = Platform.OS === 'ios' ? '&' : '?';
    const smsUrl = `sms:${witnessPhone}${separator}body=${encodeURIComponent(prepared.shareText)}`;
    Linking.openURL(smsUrl)
      .then(() => {
        setInviteSent(true);
        setWitnessDecision('selected');
        void markInviteAttempted(prepared.vowId);
        setAskJoeLabel(prev =>
          prev.includes('again') ? prev : prev.replace('now', 'again'),
        );
      })
      .catch(() => {
        sharePreparedInvite(prepared).catch((err) => {
          const message = err instanceof Error ? err.message : 'Could not open the share sheet.';
          setShareError(message);
          Alert.alert('Could not open share sheet', message);
        });
      })
      .finally(() => setSharingInvite(false));
  }, [markInviteAttempted, prepareInvite, sharePreparedInvite, sharingInvite, witnessPhone]);

  const handleChangeWitness = useCallback(() => {
    hapticSecondary();
    hapticSheetPresent();
    setPickSheetVisible(true);
  }, []);

  const handleContinue = useCallback(() => {
    if (authLoading) return;
    hapticPrimary();
    navigateNext(hasWitness ? 'selected' : witnessDecision);
  }, [authLoading, hasWitness, navigateNext, witnessDecision]);

  const normalizedContactQuery = contactQuery.trim().toLowerCase();
  const visibleContacts = syncedContacts
    .filter((contact) => {
      if (!normalizedContactQuery) return true;
      return contact.name.toLowerCase().includes(normalizedContactQuery)
        || contact.phone.replace(/\D/g, '').includes(normalizedContactQuery.replace(/\D/g, ''));
    })
    .slice(0, 24);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Vertical gradient base */}
      <LinearGradient
        colors={[uvColors.bgCard, uvColors.bgGradMid, uvColors.bgGradDeep]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* Gold radial approximation at top-right */}
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
          onBack={() => router.canGoBack() ? router.back() : router.replace('/native-perfect/create/stake')}
          centerText="3 / 5"
        />

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '60%' }]} />
        </View>

        {/* Title */}
        <Text style={styles.h1}>
          {'Choose your\n'}
          <Text style={styles.h1GoldItalic}>witness.</Text>
        </Text>
        <Text style={styles.sub}>
          They decide if you kept it or broke it.
        </Text>

        {/* Judge card — empty or filled */}
        <WitnessJudgeCard
          variant={hasWitness ? 'filled' : 'empty'}
          witnessName={witnessName || undefined}
          witnessInitial={witnessInitial || undefined}
          onTap={hasWitness ? undefined : handleAddWitness}
          onChange={hasWitness ? handleChangeWitness : undefined}
          showChooseContactCta={!hasWitness}
        />

        {/* Ask now link (only when witness selected) */}
        {hasWitness && (
          <Text style={styles.askNowLink} onPress={handleAskNow}>
            {sharingInvite ? 'Preparing invite...' : askJoeLabel}
          </Text>
        )}

        {/* Alt 3 — subtle summary, lower hierarchy than choosing the witness */}
        <View style={styles.subtleSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Vow</Text>
            <Text style={[styles.summaryValue, styles.summaryVow]} numberOfLines={2}>
              {rawInput || 'Run every morning'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Stake</Text>
            <Text style={styles.summaryValue}>{stakeSummary}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Verdict</Text>
            <Text style={styles.summaryValue}>{verdictLabel}</Text>
          </View>
        </View>

        {/* Quiet actions (only when no witness selected) */}
        {!hasWitness && (
          <View style={styles.quietActions}>
            <QuietPill label={sharingInvite ? 'Preparing...' : 'Share link'} onPress={handleShareLink} />
            <QuietPill label="Decide later" onPress={handleDecideLater} />
          </View>
        )}
        {shareError ? <Text style={styles.shareError}>{shareError}</Text> : null}

        {/* Money note */}
        <Text style={styles.moneyNote}>
          No charge now. Only if you break it.
        </Text>

        {/* Bottom CTA — only when witness selected */}
        {hasWitness && (
          <View style={styles.bottomCta}>
            <GoldCTA
              label={authLoading ? 'Checking...' : 'Continue to seal →'}
              disabled={authLoading}
              onPress={handleContinue}
            />
          </View>
        )}

        {/* Safe area bottom spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sheet 03a: Decide Later Confirmation ── */}
      <BottomSheet
        visible={decideLaterSheetVisible}
        onDismiss={() => setDecideLaterSheetVisible(false)}
      >
        <Text style={styles.sheetTitle}>Pick one now, or after you seal.</Text>
        <Text style={styles.sheetSub}>
          A witness makes the verdict harder to dodge. You can still keep moving and choose later.
        </Text>
        <GoldCTA
          label="Add a witness"
          onPress={() => {
            hapticPrimary();
            setDecideLaterSheetVisible(false);
            setPickSheetVisible(true);
          }}
        />
        <OutlinedGoldCTA
          label="Decide later"
          onPress={handleConfirmDecideLater}
        />
      </BottomSheet>

      {/* ── Sheet 03b: Pick Witness ── */}
      <BottomSheet
        visible={pickSheetVisible}
        onDismiss={() => setPickSheetVisible(false)}
      >
        <Text style={styles.sheetTitle}>Pick your witness.</Text>
        <Text style={styles.sheetSub}>
          {"Choose a close friend, roommate, or anyone who won't let you slide."}
        </Text>

        {/* Permission card / Sync contacts (V2) */}
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Sync contacts</Text>
          <Text style={styles.permissionSub}>
            Find your witness faster. We only use the person you choose.
          </Text>
        </View>

        <GoldCTA
          label="Choose contact"
          onPress={handleChooseContact}
        />

        <Text style={styles.contactHint}>
          iPhone will ask for permission next. We never message anyone until you send the invite.
        </Text>

        <ScrollView
          style={styles.contactResults}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Contacts permission + synced contacts */}
          {contactsLoading && (
            <View style={styles.contactLoading}>
              <ActivityIndicator color={uvColors.goldBright} />
              <Text style={styles.contactHint}>Opening contacts...</Text>
            </View>
          )}

          {!contactsLoading && contactsDenied && (
            <View style={styles.emptyContactsCard}>
              <Text style={styles.emptyContactsTitle}>Contacts not available.</Text>
              <Text style={styles.emptyContactsSub}>
                You can still share the witness link yourself.
              </Text>
              <View style={styles.permissionActions}>
                <QuietPill label="Share link" onPress={handleShareLink} />
                {!contactsCanAskAgain && (
                  <QuietPill label="Open Settings" onPress={() => Linking.openSettings()} />
                )}
              </View>
            </View>
          )}

          {!contactsLoading && contactsSynced && syncedContacts.length > 0 && (
            <>
              <Text style={styles.contactSectionLabel}>Your contacts</Text>
              <TextInput
                value={contactQuery}
                onChangeText={setContactQuery}
                placeholder="Search contacts"
                placeholderTextColor={uvColors.textKicker}
                keyboardAppearance="dark"
                autoCorrect={false}
                style={styles.contactSearch}
              />
            </>
          )}

          {!contactsLoading && contactsSynced && syncedContacts.length === 0 ? (
            <View style={styles.emptyContactsCard}>
              <Text style={styles.emptyContactsTitle}>No phone contacts found.</Text>
              <Text style={styles.emptyContactsSub}>You can still share the witness link yourself.</Text>
            </View>
          ) : null}

          {!contactsLoading && contactsSynced && syncedContacts.length > 0 && visibleContacts.length === 0 ? (
            <View style={styles.emptyContactsCard}>
              <Text style={styles.emptyContactsTitle}>No matching contacts.</Text>
              <Text style={styles.emptyContactsSub}>Try another name or share the link yourself.</Text>
            </View>
          ) : null}

          {!contactsLoading && contactsSynced && visibleContacts.map((contact) => (
            <View key={contact.id} style={styles.contactRow}>
              <View style={styles.contactLeft}>
                <View style={styles.miniAvatar}>
                  <Text style={styles.miniAvatarText}>
                    {contact.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.contactName}>{contact.name}</Text>
              </View>
              <Text
                style={styles.pickLabel}
                onPress={() => handleContactSelect(contact)}
              >
                Pick
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Share link fallback */}
        <OutlinedGoldCTA
          label="Share link instead"
          onPress={handleShareLink}
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
    fontSize: 48,
    lineHeight: 48 * 1.02,
    color: uvColors.text,
    marginTop: 38,
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
  decisionCard: {
    borderWidth: 1,
    borderColor: 'rgba(214,168,60,0.34)',
    borderRadius: 22,
    backgroundColor: 'rgba(27,22,15,0.82)',
    padding: 18,
    shadowColor: 'rgba(214,168,60,0.035)',
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
  vowText: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 25,
    lineHeight: 25 * 1.18,
    color: uvColors.text,
    marginTop: 14,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 13,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244,234,216,0.1)',
  },
  // .witnessMeta column proportions: .7fr 1.55fr .75fr (total 3fr)
  metaCol1: {
    flex: 0.7,
  },
  metaCol2: {
    flex: 1.55,
  },
  metaCol3: {
    flex: 0.75,
  },
  metaLabel: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 10 * 0.22,
    textTransform: 'uppercase',
    color: uvColors.textKicker,
  },
  metaValue: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 14 * 1.15,
    color: uvColors.text,
    marginTop: 7,
  },
  metaGold: {
    color: uvColors.goldBright,
  },
  metaSmall: {
    fontSize: 13,
    lineHeight: 13 * 1.18,
  },
  askNowLink: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '600',
    fontSize: 14,
    fontStyle: 'italic',
    color: uvColors.goldBright,
    textAlign: 'center',
    marginTop: 12,
    minHeight: 44,
    lineHeight: 44,
  },
  subtleSummary: {
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(244,234,216,0.08)',
    paddingVertical: 10,
    gap: 0,
  },
  summaryRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(244,234,216,0.045)',
  },
  summaryLabel: {
    minWidth: 58,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    fontWeight: '800',
    color: uvColors.textKicker,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    lineHeight: 13 * 1.2,
    fontWeight: '800',
    color: uvColors.text,
  },
  summaryVow: {
    fontSize: 14,
    lineHeight: 14 * 1.2,
  },
  quietActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  shareError: {
    color: uvColors.danger,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    lineHeight: 13 * 1.25,
    marginTop: 10,
    textAlign: 'center',
  },
  moneyNote: {
    textAlign: 'center',
    color: uvColors.textNote,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    lineHeight: 13 * 1.2,
    marginTop: 14,
  },
  bottomCta: {
    marginTop: 24,
    marginBottom: 30,
  },
  // Sheet styles
  sheetTitle: {
    fontFamily: uvFonts.serifSemibold,
    fontSize: 35,
    lineHeight: 35 * 1.06,
    color: uvColors.text,
  },
  sheetSub: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    lineHeight: 15 * 1.35,
    color: uvColors.textMuted,
    marginTop: 8,
    marginBottom: 18,
  },
  permissionCard: {
    borderWidth: 1,
    borderColor: 'rgba(214,168,60,0.32)',
    borderRadius: 20,
    backgroundColor: 'rgba(214,168,60,0.06)',
    padding: 16,
    marginBottom: 12,
  },
  permissionTitle: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    fontSize: 18,
    color: uvColors.text,
  },
  permissionSub: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: uvColors.textMuted,
    marginTop: 6,
  },
  contactRow: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.1)',
    borderRadius: 17,
    backgroundColor: 'rgba(244,234,216,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 10,
    paddingHorizontal: 12,
    marginTop: 9,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uvColors.goldBright,
  },
  miniAvatarText: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    fontSize: 15,
    color: uvColors.textOnGold,
  },
  contactName: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '700',
    fontSize: 16,
    color: uvColors.text,
  },
  contactHint: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 12,
    lineHeight: 12 * 1.35,
    color: uvColors.textNote,
    marginTop: 10,
  },
  contactLoading: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.1)',
    borderRadius: 17,
    backgroundColor: 'rgba(244,234,216,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  contactResults: {
    maxHeight: 300,
    marginTop: 2,
  },
  emptyContactsCard: {
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.1)',
    borderRadius: 17,
    backgroundColor: 'rgba(244,234,216,0.03)',
    padding: 14,
    marginTop: 12,
    gap: 4,
  },
  emptyContactsTitle: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    fontSize: 15,
    color: uvColors.text,
  },
  emptyContactsSub: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 13,
    lineHeight: 13 * 1.3,
    color: uvColors.textMuted,
  },
  permissionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  contactSectionLabel: {
    fontFamily: uvFonts.sansSemibold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 10 * 0.26,
    textTransform: 'uppercase',
    color: uvColors.textKicker,
    marginTop: 16,
    marginBottom: 2,
  },
  contactSearch: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(244,234,216,0.1)',
    borderRadius: 16,
    backgroundColor: 'rgba(244,234,216,0.04)',
    color: uvColors.text,
    fontFamily: uvFonts.sansSemibold,
    fontSize: 15,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  pickLabel: {
    fontFamily: uvFonts.sansSemibold,
    fontWeight: '800',
    fontSize: 13,
    color: uvColors.goldBright,
    minHeight: 44,
    lineHeight: 44,
    paddingHorizontal: 8,
  },
});

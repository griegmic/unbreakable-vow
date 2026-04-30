/**
 * Screen 03 — Choose Witness
 * + Screen 03b — Pick Witness Sheet
 * + Screen 03c — Witness Selected (state variant of 03)
 *
 * Phase 2 singleton (03) + pair (03b+03c).
 * Mock: shots 5-7.
 * Spec: STEP_9 §screen-03, §screen-03b, §screen-03c.
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BottomSheet,
  ChromeHeader,
  GoldCTA,
  OutlinedGoldCTA,
  WitnessJudgeCard,
} from '@/components/primitives';
import {
  hapticPrimary,
  hapticSecondary,
  hapticSelection,
  hapticSheetPresent,
} from '@/lib/haptics';
import { uvColors, uvFonts, uvSpacing } from '@/lib/uv-tokens';

// Mock recent contacts for 03b sheet
const RECENT_CONTACTS = [
  { name: 'Joe', initial: 'J', phone: '+15551234567' },
  { name: 'Sarah', initial: 'S', phone: '+15559876543' },
  { name: 'Mike', initial: 'M', phone: '+15555555555' },
];

type WitnessDecision = 'none' | 'selected' | 'deferred' | 'shared';

export default function WitnessScreen() {
  const insets = useSafeAreaInsets();
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

  // Sheet state
  const [pickSheetVisible, setPickSheetVisible] = useState(false);

  const hasWitness = witnessDecision === 'selected' && witnessName;

  const handleAddWitness = useCallback(() => {
    hapticSecondary();
    hapticSheetPresent();
    setPickSheetVisible(true);
  }, []);

  const handleContactSelect = useCallback((contact: typeof RECENT_CONTACTS[0]) => {
    hapticSelection();
    setWitnessName(contact.name);
    setWitnessPhone(contact.phone);
    setWitnessInitial(contact.initial);
    setWitnessDecision('selected');
    setAskJoeLabel(`Ask ${contact.name} now →`);
    setPickSheetVisible(false);
  }, []);

  const handleDecideLater = useCallback(() => {
    hapticSecondary();
    setWitnessDecision('deferred');
    router.push({
      pathname: '/native-perfect/create/witness', // TODO: route to 04 (auth) in Phase 3
      params: { ...params, witnessDecision: 'deferred' },
    } as never);
  }, [params]);

  const handleShareLink = useCallback(() => {
    hapticSecondary();
    // TODO: call prepare-judge-link with anonymous_token, open share sheet
    setWitnessDecision('shared');
  }, []);

  const handleAskNow = useCallback(() => {
    hapticSecondary();
    // TODO: call prepare-judge-link, open iMessage
    setAskJoeLabel(prev =>
      prev.includes('again') ? prev : prev.replace('now', 'again'),
    );
  }, []);

  const handleChangeWitness = useCallback(() => {
    hapticSecondary();
    hapticSheetPresent();
    setPickSheetVisible(true);
  }, []);

  const handleContinue = useCallback(() => {
    hapticPrimary();
    // TODO: create vow draft via prepare-judge-link, then route to 04 (auth)
    // For Phase 2, this navigates forward with the witness data
  }, []);

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
          They'll decide if you kept your word. Pick someone who won't go easy on you.
        </Text>

        {/* Decision card — vow summary */}
        <View style={styles.decisionCard}>
          <Text style={styles.kicker}>
            {hasWitness ? 'WITNESS CHOSEN' : 'READY TO SEAL'}
          </Text>
          <Text style={styles.vowText}>{rawInput}</Text>

          {/* Meta grid */}
          <View style={styles.metaGrid}>
            <View>
              <Text style={styles.metaLabel}>STAKE</Text>
              <Text style={[styles.metaValue, styles.metaGold]}>
                {stakeAmount > 0 ? `$${stakeAmount}` : '$0'}
              </Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>VERDICT</Text>
              <Text style={styles.metaValue}>
                {params.deadlineIso
                  ? new Date(params.deadlineIso).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '1 week'}
              </Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>GOES TO</Text>
              <Text style={[styles.metaValue, styles.metaSmall]}>
                {params.destination || 'ALS Association'}
              </Text>
            </View>
          </View>
        </View>

        {/* Judge card — empty or filled */}
        <WitnessJudgeCard
          variant={hasWitness ? 'filled' : 'empty'}
          witnessName={witnessName || undefined}
          witnessInitial={witnessInitial || undefined}
          onTap={hasWitness ? undefined : handleAddWitness}
          onChange={hasWitness ? handleChangeWitness : undefined}
        />

        {/* Ask now link (only when witness selected) */}
        {hasWitness && (
          <Text style={styles.askNowLink} onPress={handleAskNow}>
            {askJoeLabel}
          </Text>
        )}

        {/* Quiet actions (only when no witness selected) */}
        {!hasWitness && (
          <View style={styles.quietActions}>
            <OutlinedGoldCTA label="Decide later" onPress={handleDecideLater} />
            <OutlinedGoldCTA label="Share link" onPress={handleShareLink} />
          </View>
        )}

        {/* Money note */}
        <Text style={styles.moneyNote}>
          Nothing charges unless you break it.
        </Text>
      </ScrollView>

      {/* Bottom CTA — only when witness selected */}
      {hasWitness && (
        <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
          <GoldCTA label="Continue →" onPress={handleContinue} />
        </View>
      )}

      {/* ── Sheet 03b: Pick Witness ── */}
      <BottomSheet
        visible={pickSheetVisible}
        onDismiss={() => setPickSheetVisible(false)}
      >
        <Text style={styles.sheetTitle}>Pick your witness.</Text>
        <Text style={styles.sheetSub}>
          Choose someone who'll hold you to it. They'll get a text when you seal.
        </Text>

        {/* Permission card / Choose from contacts */}
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Choose from Contacts</Text>
          <Text style={styles.permissionSub}>
            We'll only use this to send your witness an invite.
          </Text>
        </View>

        {/* Recent contacts */}
        {RECENT_CONTACTS.map((contact) => (
          <View key={contact.name} style={styles.contactRow}>
            <View style={styles.contactLeft}>
              <View style={styles.miniAvatar}>
                <Text style={styles.miniAvatarText}>{contact.initial}</Text>
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

        {/* Share link fallback */}
        <OutlinedGoldCTA
          label="Share link instead"
          onPress={() => {
            hapticSecondary();
            setPickSheetVisible(false);
          }}
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
    fontFamily: uvFonts.sansSemibold,
    fontSize: 17,
    lineHeight: 17 * 1.34,
    color: uvColors.textMuted,
    marginTop: 13,
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
  quietActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
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
    position: 'absolute',
    left: uvSpacing.xl,
    right: uvSpacing.xl,
    bottom: 0,
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

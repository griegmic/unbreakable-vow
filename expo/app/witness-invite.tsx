import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { AlertCircle, Check, CheckCircle2, MessageCircle, Phone } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton, RitualCard, RitualScreen } from '@/components/vow-ui';
import { palette, serifFont } from '@/constants/unbreakable';
import { acceptWitnessInvite, declineWitnessInvite, getVowByWitnessToken, saveWitnessReminder, type WitnessVowData } from '@/lib/vow-api';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

type ScreenState = 'loading' | 'invite' | 'accepted' | 'declined' | 'already_accepted' | 'error';

export default function WitnessInviteScreen() {
  const { displayName } = useAuth();
  const { activeVowText, vow } = useVowFlow();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = params.token;

  const [screenState, setScreenState] = useState<ScreenState>(token ? 'loading' : 'invite');
  const [remoteVow, setRemoteVow] = useState<WitnessVowData | null>(null);
  const [accepting, setAccepting] = useState<boolean>(false);
  const [declining, setDeclining] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Reminder capture
  const [reminderExpanded, setReminderExpanded] = useState(false);
  const [reminderPhone, setReminderPhone] = useState('');
  const [reminderName, setReminderName] = useState('');
  const [reminderSaved, setReminderSaved] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);

  const isRemote = !!token;
  const vowText = isRemote ? (remoteVow?.refined_text ?? '') : activeVowText;
  const stakeAmount = isRemote ? ((remoteVow?.stake_amount ?? 0) / 100) : vow.stake.amount;
  const makerName = isRemote ? (remoteVow?.user_display_name || 'Your friend') : (displayName || 'Your friend');
  const consequence = isRemote ? (remoteVow?.consequence ?? 'charity') : vow.stake.consequence;
  const destination = isRemote ? (remoteVow?.destination ?? '') : vow.stake.destination;
  const brokenTarget = destination;

  const verdictDate = isRemote && remoteVow?.ends_at
    ? new Date(remoteVow.ends_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  console.log('[WitnessInviteScreen] token:', token, 'isRemote:', isRemote, 'screenState:', screenState);

  useEffect(() => {
    if (!token) return;

    async function loadVow() {
      console.log('[WitnessInviteScreen] fetching vow by token:', token);
      const result = await getVowByWitnessToken(token!);

      if (!result.success || !result.vow) {
        console.log('[WitnessInviteScreen] vow not found:', result.error);
        setErrorMsg(result.error || 'This vow link is no longer valid.');
        setScreenState('error');
        return;
      }

      console.log('[WitnessInviteScreen] vow loaded:', result.vow.id);
      setRemoteVow(result.vow);

      // Handle resolved vow states
      const resolvedStatuses = ['voided', 'kept', 'broken'];
      if (resolvedStatuses.includes(result.vow.status)) {
        const statusMessages: Record<string, string> = {
          voided: 'This vow has been withdrawn.',
          kept: 'This vow has been kept! The verdict is in.',
          broken: 'This vow was broken. The verdict is in.',
        };
        setErrorMsg(statusMessages[result.vow.status] || 'This vow is no longer active.');
        setScreenState('error');
      } else if (result.vow.witness_accepted_at) {
        setScreenState('already_accepted');
      } else if (result.vow.witness_declined) {
        setErrorMsg('This invite has been declined.');
        setScreenState('error');
      } else {
        setScreenState('invite');
      }
    }

    void loadVow();
  }, [token]);


  const handleAccept = useCallback(async () => {
    if (accepting) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (!isRemote) {
      router.push('/live');
      return;
    }

    if (!remoteVow) return;
    setAccepting(true);

    const result = await acceptWitnessInvite(token!);
    setAccepting(false);

    if (result.success) {
      console.log('[WitnessInviteScreen] witness accepted successfully');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScreenState('accepted');
    } else {
      Alert.alert('Something went wrong', result.error || 'Please try again.');
    }
  }, [accepting, isRemote, remoteVow]);

  const handleDecline = useCallback(async () => {
    if (!isRemote) {
      router.back();
      return;
    }

    if (!remoteVow) {
      router.back();
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Decline this invite?',
      `${makerName} chose you to hold them accountable. Are you sure?`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setDeclining(true);
            const result = await declineWitnessInvite(token!);
            setDeclining(false);
            if (result.success) {
              setScreenState('declined');
            } else {
              Alert.alert('Something went wrong', result.error || 'Please try again.');
            }
          },
        },
      ],
    );
  }, [isRemote, remoteVow, makerName]);


  if (screenState === 'loading') {
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredWrap}>
          <ActivityIndicator size="large" color={palette.goldBright} />
          <Text style={styles.loadingText}>Loading vow...</Text>
        </View>
      </RitualScreen>
    );
  }

  if (screenState === 'error') {
    // Dynamic title based on whether we loaded a vow in a resolved state
    const resolvedStatus = remoteVow?.status;
    const errorTitle = resolvedStatus === 'voided' ? 'Vow withdrawn'
      : resolvedStatus === 'kept' ? 'Vow kept'
      : resolvedStatus === 'broken' ? 'Vow broken'
      : 'Vow not found';

    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredWrap}>
          <View style={styles.errorIconWrap}>
            <AlertCircle color={palette.warmAmber} size={32} />
          </View>
          <Text style={styles.errorTitle}>{errorTitle}</Text>
          <Text style={styles.errorBody}>{errorMsg}</Text>
        </View>
      </RitualScreen>
    );
  }

  // SMS helper
  const sendSms = (phone: string | null | undefined, body: string) => {
    const encoded = encodeURIComponent(body);
    const sep = Platform.OS === 'android' ? '?' : '&';
    if (phone) {
      const cleanPhone = phone.replace(/[^\d+\-]/g, '');
      void Linking.openURL(`sms:${cleanPhone}${sep}body=${encoded}`);
    } else {
      void Linking.openURL(`sms:${sep}body=${encoded}`);
    }
  };

  const handleSaveReminder = async () => {
    if (!token || !reminderPhone.trim()) return;
    setReminderSaving(true);
    const result = await saveWitnessReminder(token, reminderPhone.trim(), reminderName.trim() || undefined);
    setReminderSaving(false);
    if (result.success) {
      setReminderSaved(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Could not save', result.error || 'Please try again.');
    }
  };

  // Check if we need the witness name (maker didn't provide one or it's generic)
  const needsWitnessName = !remoteVow?.witness_name || remoteVow.witness_name === 'Just me';
  const witnessDisplayName = remoteVow?.witness_name && remoteVow.witness_name !== 'Just me' ? remoteVow.witness_name : null;

  // Elapsed computation for time-based nudges
  const getElapsed = (): number => {
    if (!remoteVow?.starts_at || !remoteVow?.ends_at) return 0;
    const start = new Date(remoteVow.starts_at).getTime();
    const end = new Date(remoteVow.ends_at).getTime();
    if (end <= start) return 0;
    return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
  };

  const getNudgeCopy = (elapsed: number): { cta: string; sms: string } => {
    if (elapsed < 0.15) return { cta: `Send ${makerName} a message`, sms: "How's the vow going?" };
    if (elapsed < 0.85) return { cta: `Check in on ${makerName}`, sms: "Still keeping the vow? I'm paying attention." };
    return { cta: `The clock is ticking — message ${makerName}`, sms: 'Almost verdict time. You good?' };
  };

  if (screenState === 'accepted') {
    const makerPhone = remoteVow?.maker_phone ?? null;
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredWrap}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 color={palette.success} size={36} />
          </View>
          <Text style={styles.successTitle}>You're locked in.</Text>
          <Text style={styles.successBody}>
            {makerName} is counting on your honesty. You'll deliver your verdict{verdictDate ? ` on ${verdictDate}` : ' when time\'s up'}.
          </Text>

          {/* Vow quote */}
          <RitualCard>
            <Text style={styles.sectionLabel}>THE VOW</Text>
            <Text style={styles.vowTextStyle}>{vowText}</Text>
          </RitualCard>

          {/* Primary CTA: Text the maker */}
          <Pressable
            onPress={() => sendSms(makerPhone, "Just accepted your vow. I'm watching.")}
            style={styles.goldButton}
          >
            <MessageCircle color="#0B0D11" size={18} />
            <Text style={styles.goldButtonText}>Tell {makerName} you're watching</Text>
          </Pressable>

          {/* Secondary: Reminder capture */}
          {reminderSaved ? (
            <View style={styles.reminderSavedRow}>
              <Check color={palette.success} size={16} />
              <Text style={styles.reminderSavedText}>Reminder set — we'll text you on verdict day</Text>
            </View>
          ) : reminderExpanded ? (
            <View style={styles.reminderForm}>
              <View style={styles.reminderFormHeader}>
                <Phone color={palette.goldBright} size={16} />
                <Text style={styles.reminderFormTitle}>
                  {witnessDisplayName ? `Hey ${witnessDisplayName}! ` : ''}Get a text on verdict day
                </Text>
              </View>
              {needsWitnessName && (
                <TextInput
                  value={reminderName}
                  onChangeText={setReminderName}
                  placeholder="Your name"
                  placeholderTextColor={palette.textMuted}
                  style={styles.reminderInput}
                  autoCapitalize="words"
                />
              )}
              <TextInput
                value={reminderPhone}
                onChangeText={setReminderPhone}
                placeholder="Phone number"
                placeholderTextColor={palette.textMuted}
                style={styles.reminderInput}
                keyboardType="phone-pad"
                autoFocus
              />
              <View style={styles.reminderActions}>
                <Pressable
                  onPress={handleSaveReminder}
                  style={[styles.reminderSubmit, (!reminderPhone.trim() || reminderSaving) && { opacity: 0.5 }]}
                  disabled={!reminderPhone.trim() || reminderSaving}
                >
                  <Text style={styles.reminderSubmitText}>{reminderSaving ? 'Saving...' : 'Remind me'}</Text>
                </Pressable>
                <Pressable onPress={() => setReminderExpanded(false)}>
                  <Text style={styles.reminderCancelText}>No thanks</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setReminderExpanded(true)} style={styles.outlinedButton}>
              <Text style={styles.outlinedButtonText}>Remind me on verdict day</Text>
            </Pressable>
          )}

          {/* Tertiary: Viral CTA */}
          <Pressable
            onPress={() => Linking.openURL('https://unbreakablevow.app/create')}
            style={styles.outlinedButton}
          >
            <Text style={styles.outlinedButtonText}>Your turn — what will you commit to?</Text>
          </Pressable>
        </View>
      </RitualScreen>
    );
  }

  if (screenState === 'already_accepted') {
    const elapsed = getElapsed();
    const makerPhone = remoteVow?.maker_phone ?? null;

    // Check if verdict is due
    const nowMs = Date.now();
    const endMs = remoteVow?.ends_at ? new Date(remoteVow.ends_at).getTime() : 0;
    const isVerdictDue = endMs > 0 && nowMs >= endMs;

    if (isVerdictDue) {
      return (
        <RitualScreen>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.centeredWrap}>
            <View style={styles.successIconWrap}>
              <CheckCircle2 color={palette.goldBright} size={36} />
            </View>
            <Text style={styles.successTitle}>Time's up.</Text>
            <Text style={styles.successBody}>
              Did {makerName} keep their word? Your call.
            </Text>

            <RitualCard>
              <Text style={styles.sectionLabel}>THE VOW</Text>
              <Text style={styles.vowTextStyle}>{vowText}</Text>
            </RitualCard>

            <Pressable
              onPress={() => Linking.openURL(`https://unbreakablevow.app/w/${token}/verdict`)}
              style={styles.goldButton}
            >
              <Text style={styles.goldButtonText}>Deliver your verdict</Text>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL('https://unbreakablevow.app/create')}
              style={styles.outlinedButton}
            >
              <Text style={styles.outlinedButtonText}>Your turn — what will you commit to?</Text>
            </Pressable>
          </View>
        </RitualScreen>
      );
    }

    // Return visit — active vow
    const nudge = getNudgeCopy(elapsed);
    const progressPct = Math.round(elapsed * 100);

    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredWrap}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 color={palette.success} size={36} />
          </View>
          <Text style={styles.successTitle}>You're watching.</Text>
          <Text style={styles.successBody}>
            {makerName} is counting on your honesty.
          </Text>

          <RitualCard>
            <Text style={styles.sectionLabel}>THE VOW</Text>
            <Text style={styles.vowTextStyle}>{vowText}</Text>
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.progressLabel}>{progressPct}%</Text>
            </View>
          </RitualCard>

          {/* Primary CTA: Text the maker */}
          <Pressable
            onPress={() => sendSms(makerPhone, nudge.sms)}
            style={styles.goldButton}
          >
            <MessageCircle color="#0B0D11" size={16} />
            <Text style={styles.goldButtonText}>{nudge.cta}</Text>
          </Pressable>

          {/* Secondary: Reminder capture */}
          {reminderSaved ? (
            <View style={styles.reminderSavedRow}>
              <Check color={palette.success} size={16} />
              <Text style={styles.reminderSavedText}>Reminder set — we'll text you on verdict day</Text>
            </View>
          ) : reminderExpanded ? (
            <View style={styles.reminderForm}>
              <View style={styles.reminderFormHeader}>
                <Phone color={palette.goldBright} size={16} />
                <Text style={styles.reminderFormTitle}>
                  {witnessDisplayName ? `Hey ${witnessDisplayName}! ` : ''}Get a text on verdict day
                </Text>
              </View>
              {needsWitnessName && (
                <TextInput
                  value={reminderName}
                  onChangeText={setReminderName}
                  placeholder="Your name"
                  placeholderTextColor={palette.textMuted}
                  style={styles.reminderInput}
                  autoCapitalize="words"
                />
              )}
              <TextInput
                value={reminderPhone}
                onChangeText={setReminderPhone}
                placeholder="Phone number"
                placeholderTextColor={palette.textMuted}
                style={styles.reminderInput}
                keyboardType="phone-pad"
                autoFocus
              />
              <View style={styles.reminderActions}>
                <Pressable
                  onPress={handleSaveReminder}
                  style={[styles.reminderSubmit, (!reminderPhone.trim() || reminderSaving) && { opacity: 0.5 }]}
                  disabled={!reminderPhone.trim() || reminderSaving}
                >
                  <Text style={styles.reminderSubmitText}>{reminderSaving ? 'Saving...' : 'Remind me'}</Text>
                </Pressable>
                <Pressable onPress={() => setReminderExpanded(false)}>
                  <Text style={styles.reminderCancelText}>No thanks</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setReminderExpanded(true)} style={styles.outlinedButton}>
              <Text style={styles.outlinedButtonText}>Remind me on verdict day</Text>
            </Pressable>
          )}

          {/* Tertiary: Viral CTA */}
          <Pressable
            onPress={() => Linking.openURL('https://unbreakablevow.app/create')}
            style={styles.outlinedButton}
          >
            <Text style={styles.outlinedButtonText}>Your turn — what will you commit to?</Text>
          </Pressable>
        </View>
      </RitualScreen>
    );
  }

  if (screenState === 'declined') {
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredWrap}>
          <Text style={styles.declinedTitle}>Invite declined</Text>
          <Text style={styles.declinedBody}>
            {makerName} will be notified so they can find another witness.
          </Text>
        </View>
      </RitualScreen>
    );
  }

  const stakeDisplay = stakeAmount > 0 ? `$${stakeAmount}` : null;
  const [sworn, setSworn] = useState(false);

  const handleSwear = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSworn(true);
  };

  return (
    <RitualScreen
      footer={
        <PrimaryButton
          label={accepting ? 'Accepting...' : "I'll hold them to it"}
          onPress={handleAccept}
          disabled={!sworn || accepting}
          testID="witness-invite-accept"
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <Text style={styles.pendingTitle}>
        {makerName} made a vow.
      </Text>

      <Text style={styles.vowQuotePending}>
        &ldquo;{vowText}&rdquo;
      </Text>

      <View style={styles.pendingInfoWrap}>
        <Text style={styles.pendingInfoText}>
          {stakeDisplay
            ? `If ${makerName} breaks it, ${stakeDisplay} goes to ${brokenTarget}.`
            : `No money at stake \u2014 just their word.`}
        </Text>
        <Text style={styles.pendingInfoText}>
          You decide{verdictDate ? ` on ${verdictDate}` : ' when time\u2019s up'}.
        </Text>
      </View>

      <Pressable
        onPress={() => { if (sworn) { setSworn(false); } else { handleSwear(); } }}
        style={[styles.oathRow, sworn && styles.oathRowActive]}
        testID="witness-invite-swear"
      >
        <View style={[styles.oathCheckbox, sworn && styles.oathCheckboxChecked]}>
          {sworn && <Check color="#0B0D11" size={14} strokeWidth={3} />}
        </View>
        <View style={styles.oathCopy}>
          <Text style={styles.oathTitle}>I solemnly swear</Text>
          <Text style={styles.oathSubtitle}>to keep {makerName} accountable</Text>
        </View>
      </Pressable>

      {!sworn && (
        <Text style={styles.badFriendText}>they picked you for a reason</Text>
      )}
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  centeredWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.warmAmberMuted,
    borderWidth: 1,
    borderColor: palette.warmAmberBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  errorBody: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center' as const,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.successMuted,
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    textAlign: 'center' as const,
  },
  successBody: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center' as const,
  },
  declinedTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  declinedBody: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center' as const,
  },
  sectionLabel: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.1,
  },
  vowTextStyle: {
    color: palette.text,
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '600' as const,
  },
  rule: {
    height: 1,
    backgroundColor: palette.border,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    color: palette.textMuted,
    fontSize: 13,
  },
  metaValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  metaValueGold: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  goldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: palette.goldBright,
    borderRadius: 18,
    paddingVertical: 16,
    width: '100%',
  },
  goldButtonText: {
    color: '#0B0D11',
    fontSize: 15,
    fontWeight: '800',
  },
  outlinedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
  },
  outlinedButtonText: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.gold,
  },
  progressLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  reminderForm: {
    width: '100%',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  reminderFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderFormTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  reminderInput: {
    color: palette.text,
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  reminderSubmit: {
    backgroundColor: palette.goldBright,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  reminderSubmitText: {
    color: '#0B0D11',
    fontSize: 14,
    fontWeight: '700',
  },
  reminderCancelText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  reminderSavedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(82,214,154,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.2)',
  },
  reminderSavedText: {
    color: palette.success,
    fontSize: 14,
    fontWeight: '600',
  },
  oathRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  oathRowActive: {
    backgroundColor: 'rgba(212,162,79,0.08)',
    borderColor: 'rgba(212,162,79,0.25)',
  },
  oathCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: palette.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  oathCheckboxChecked: {
    backgroundColor: palette.goldBright,
    borderColor: palette.goldBright,
  },
  oathCopy: {
    flex: 1,
    gap: 2,
  },
  oathTitle: {
    color: palette.goldBright,
    fontSize: 15,
    fontWeight: '700' as const,
    fontFamily: serifFont,
  },
  oathSubtitle: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  badFriendText: {
    color: palette.textMuted,
    fontSize: 11,
    textAlign: 'center' as const,
    opacity: 0.5,
    marginTop: 4,
  },
  pendingTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    textAlign: 'center' as const,
    letterSpacing: -0.5,
  },
  vowQuotePending: {
    color: palette.text,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600' as const,
    fontFamily: serifFont,
    textAlign: 'center' as const,
  },
  pendingInfoWrap: {
    alignItems: 'center',
    gap: 4,
  },
  pendingInfoText: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center' as const,
  },
});

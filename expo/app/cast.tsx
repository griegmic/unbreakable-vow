import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Send, Sparkles, Copy, Check, UserRound, X, MessageCircle, Shield, Calendar } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AuthSheet from '@/components/auth-sheet';
import ContactPickerModal from '@/components/contact-picker-modal';
import { ChoiceChip, PrimaryButton, RitualCard, RitualScreen, SecondaryButton } from '@/components/vow-ui';
import {
  analyzeVow,
  generateSuggestion,
  palette,
  serifFont,
} from '@/constants/unbreakable';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

const SUGGESTED_STAKES = [0, 10, 25, 50, 100];

type DeadlinePreset = 'tomorrow' | 'end_of_week' | 'in_7_days' | 'in_30_days' | 'custom';

function getPresetDate(preset: DeadlinePreset): Date {
  const d = new Date();
  switch (preset) {
    case 'tomorrow': d.setDate(d.getDate() + 1); break;
    case 'end_of_week': d.setDate(d.getDate() + (7 - d.getDay() || 7)); break;
    case 'in_7_days': d.setDate(d.getDate() + 7); break;
    case 'in_30_days': d.setDate(d.getDate() + 30); break;
    default: break;
  }
  d.setHours(23, 59, 59, 0);
  return d;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CastScreen() {
  const { isAuthenticated, session } = useAuth();

  // Form state
  const [vowText, setVowText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [targetName, setTargetName] = useState('');
  const [targetPhone, setTargetPhone] = useState<string | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showManualName, setShowManualName] = useState(false);
  const [suggestedStake, setSuggestedStake] = useState(25);
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>('in_7_days');
  const [customDate, setCustomDate] = useState<Date>(getPresetDate('in_7_days'));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Flow state
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
  const [dareLink, setDareLink] = useState('');
  const [dareSent, setDareSent] = useState(false);
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [vowId, setVowId] = useState<string | null>(null);
  const [challengeAccepted, setChallengeAccepted] = useState(false);
  const [acceptedVowDetails, setAcceptedVowDetails] = useState<{
    stakeAmount: number;
    destination: string;
    endsAt: string | null;
  } | null>(null);
  const pendingSendRef = useRef(false);

  // Computed
  const deadlineDate = useMemo(
    () => deadlinePreset === 'custom' ? customDate : getPresetDate(deadlinePreset),
    [deadlinePreset, customDate],
  );

  const activeText = suggestion || vowText;
  const formattedText = activeText.trim()
    ? activeText.trim().charAt(0).toUpperCase() + activeText.trim().slice(1)
    : '';
  const finalText = formattedText.endsWith('.') || formattedText.endsWith('!')
    ? formattedText
    : formattedText + '.';

  // Generate suggestion as user types
  useEffect(() => {
    if (vowText.trim().length < 3) { setSuggestion(''); return; }
    const analysis = analyzeVow(vowText);
    if (analysis.type === 'vague') {
      setSuggestion(generateSuggestion(vowText));
    } else {
      setSuggestion('');
    }
  }, [vowText]);

  // Poll for challenge acceptance when waiting
  useEffect(() => {
    if (!vowId || (!dareSent && !shared)) return;
    if (challengeAccepted) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('vows')
        .select('challenge_status, stake_amount, destination, ends_at')
        .eq('id', vowId)
        .single();
      if (data?.challenge_status === 'accepted') {
        setChallengeAccepted(true);
        setAcceptedVowDetails({
          stakeAmount: data.stake_amount || 0,
          destination: data.destination || '',
          endsAt: data.ends_at,
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearInterval(interval);
      } else if (data?.challenge_status === 'declined') {
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [vowId, dareSent, shared, challengeAccepted]);

  const acceptSuggestion = () => {
    if (suggestion) { setVowText(suggestion); setSuggestion(''); }
  };

  // -----------------------------------------------------------------------
  // Send dare logic
  // -----------------------------------------------------------------------

  const handleSendDare = useCallback(async () => {
    if (sending || !vowText.trim() || !targetName.trim()) return;
    setError('');
    setSending(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const { data: { session: currentSession } } = await supabase.auth.refreshSession();
      if (!currentSession) {
        setSending(false);
        setAuthSheetVisible(true);
        return;
      }

      // Ensure public user row
      await supabase.from('users').upsert(
        {
          id: currentSession.user.id,
          display_name: (currentSession.user.user_metadata?.full_name as string) ||
            currentSession.user.email?.split('@')[0] || null,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );

      const challengeToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const { error: vowError } = await supabase
        .from('vows')
        .insert({
          user_id: currentSession.user.id,
          raw_input: vowText,
          refined_text: finalText,
          vow_type: 'challenge',
          status: 'draft',
          challenge_status: 'pending',
          challenge_invite_token: challengeToken,
          witness_user_id: currentSession.user.id,
          witness_name: currentSession.user.user_metadata?.full_name ||
            currentSession.user.email?.split('@')[0] || 'You',
          witness_invite_token: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          suggested_stake_amount: suggestedStake * 100,
          stake_amount: 0,
          consequence: 'charity',
          destination: '',
          target_phone: targetPhone ? formatE164(targetPhone) : null,
          starts_at: new Date().toISOString(),
          ends_at: deadlineDate.toISOString(),
        })
        .select()
        .single();

      if (vowError) throw new Error(`Failed to create dare: ${vowError.message}`);

      // Need the id for polling - re-read it
      const { data: createdVow } = await supabase
        .from('vows')
        .select('id')
        .eq('challenge_invite_token', challengeToken)
        .single();
      if (createdVow) setVowId(createdVow.id);

      const link = `https://unbreakablevow.app/c/${challengeToken}`;
      setDareLink(link);
      setSending(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Auto-trigger share sheet immediately
      const vowPart = formattedText.replace(/\.$/, '').toLowerCase();
      const name = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '';
      const shareText = name
        ? `${name} dared you to ${vowPart}. Accept or back down → ${link}`
        : `I don't think you can ${vowPart}. Prove me wrong → ${link}`;
      try {
        const result = await Share.share({ message: shareText });
        if (result.action === Share.sharedAction) {
          setShared(true);
          return;
        }
      } catch {}
      // If share was cancelled or failed, fall through to the share screen
      setDareSent(true);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[Cast] send dare error:', errMsg);
      setError(errMsg || 'Something went wrong');
      setSending(false);
    }
  }, [sending, vowText, targetName, finalText, suggestedStake, deadlineDate]);

  const handleSend = async () => {
    if (!vowText.trim() || !targetName.trim() || sending) return;

    if (!isAuthenticated) {
      setAuthSheetVisible(true);
      return;
    }

    await handleSendDare();
  };

  // Auth callback — retry after sign-in
  useEffect(() => {
    if (pendingSendRef.current && isAuthenticated) {
      pendingSendRef.current = false;
      void handleSendDare();
    }
  }, [isAuthenticated, handleSendDare]);

  const handleAuthSuccess = useCallback(async () => {
    setAuthSheetVisible(false);
    try {
      const token = await registerForPushNotifications();
      if (token) await savePushToken(token);
    } catch {}
    if (isAuthenticated) {
      void handleSendDare();
    } else {
      pendingSendRef.current = true;
    }
  }, [handleSendDare, isAuthenticated]);

  // -----------------------------------------------------------------------
  // Share
  // -----------------------------------------------------------------------

  const senderName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '';

  const getShareText = () => {
    const vowPart = formattedText.replace(/\.$/, '').toLowerCase();
    if (senderName) {
      return `${senderName} dared you to ${vowPart}. Accept or back down → ${dareLink}`;
    }
    return `I don't think you can ${vowPart}. Prove me wrong → ${dareLink}`;
  };

  const handleShare = useCallback(async () => {
    void Haptics.selectionAsync();
    try {
      const result = await Share.share({ message: getShareText() });
      if (result.action === Share.sharedAction) {
        setShared(true);
      }
    } catch {
      console.log('[Cast] share failed');
    }
  }, [dareLink, formattedText]);

  const handleCopyLink = useCallback(async () => {
    void Haptics.selectionAsync();
    await Clipboard.setStringAsync(dareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [dareLink]);

  const handleTextTarget = useCallback(() => {
    void Haptics.selectionAsync();
    const body = encodeURIComponent(`Just saw you accepted the dare! Let's go 💪`);
    const phone = targetPhone ? formatE164(targetPhone) : '';
    if (phone) {
      const smsUrl = Platform.OS === 'ios'
        ? `sms:${phone}&body=${body}`
        : `sms:${phone}?body=${body}`;
      Linking.openURL(smsUrl).catch(() => {});
    } else {
      const smsUrl = `sms:?body=${body}`;
      Linking.openURL(smsUrl).catch(() => {});
    }
  }, [targetPhone]);

  const resetForm = () => {
    setDareSent(false);
    setShared(false);
    setDareLink('');
    setVowText('');
    setSuggestion('');
    setTargetName('');
    setTargetPhone(null);
    setShowManualName(false);
    setSuggestedStake(25);
    setVowId(null);
    setChallengeAccepted(false);
    setError('');
  };

  // -----------------------------------------------------------------------
  // POST-SHARE STATE
  // -----------------------------------------------------------------------

  if (shared) {
    // Accepted state — rich vow overview
    if (challengeAccepted) {
      const stakeDollars = acceptedVowDetails ? Math.round(acceptedVowDetails.stakeAmount / 100) : 0;
      const acceptedEndDate = acceptedVowDetails?.endsAt
        ? new Date(acceptedVowDetails.endsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : null;

      return (
        <RitualScreen
          footer={
            <>
              {targetPhone ? (
                <PrimaryButton label={`Text ${targetName}`} onPress={handleTextTarget} testID="cast-text-target" />
              ) : (
                <PrimaryButton label="Go to dashboard" onPress={() => router.push('/dashboard')} testID="cast-dashboard" />
              )}
              <SecondaryButton label="Dare someone else" onPress={resetForm} testID="cast-dare-again" />
            </>
          }
        >
          <Stack.Screen options={{ headerShown: false }} />

          <View style={styles.sentIconWrap}>
            <View style={[styles.sentIcon, { backgroundColor: 'rgba(82,214,154,0.12)' }]}>
              <Check color="#52D69A" size={28} />
            </View>
          </View>

          <View style={styles.sentTextWrap}>
            <Text style={styles.sentStamp}>ACCEPTED</Text>
            <Text style={styles.sentTitle}>{targetName} accepted!</Text>
            <Text style={styles.sentSubtitle}>
              You&apos;ll decide the verdict at the deadline.
            </Text>
          </View>

          {/* Vow summary card */}
          <RitualCard>
            <View style={styles.acceptedVowRow}>
              <Sparkles color={palette.gold} size={16} />
              <Text style={styles.acceptedVowText}>&ldquo;{finalText}&rdquo;</Text>
            </View>
            <View style={styles.acceptedDivider} />
            {stakeDollars > 0 && (
              <View style={styles.acceptedDetailRow}>
                <Text style={styles.acceptedDetailLabel}>Stakes</Text>
                <Text style={styles.acceptedDetailValueGold}>${stakeDollars}</Text>
              </View>
            )}
            {stakeDollars > 0 && acceptedVowDetails?.destination ? (
              <View style={styles.acceptedDetailRow}>
                <Text style={styles.acceptedDetailLabel}>If they fail</Text>
                <Text style={styles.acceptedDetailValue}>{acceptedVowDetails.destination}</Text>
              </View>
            ) : null}
            <View style={styles.acceptedDetailRow}>
              <View style={styles.acceptedDetailIconRow}>
                <Shield color={palette.gold} size={14} />
                <Text style={styles.acceptedDetailLabel}>Vow keeper</Text>
              </View>
              <Text style={styles.acceptedDetailValue}>{targetName}</Text>
            </View>
            {acceptedEndDate && (
              <View style={styles.acceptedDetailRow}>
                <View style={styles.acceptedDetailIconRow}>
                  <Calendar color={palette.gold} size={14} />
                  <Text style={styles.acceptedDetailLabel}>Ends</Text>
                </View>
                <Text style={styles.acceptedDetailValue}>{acceptedEndDate}</Text>
              </View>
            )}
          </RitualCard>

          {targetPhone && (
            <Pressable onPress={() => router.push('/dashboard')} style={styles.switchInputLink}>
              <Text style={styles.switchInputText}>Go to dashboard →</Text>
            </Pressable>
          )}
        </RitualScreen>
      );
    }

    // Waiting state — not yet accepted
    return (
      <RitualScreen
        footer={
          <>
            <PrimaryButton label="Send again" onPress={handleShare} testID="cast-reshare" />
            <SecondaryButton label="Dare someone else" onPress={resetForm} testID="cast-dare-again" />
          </>
        }
      >
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.sentIconWrap}>
          <View style={styles.sentIcon}>
            <Send color={palette.goldBright} size={28} />
          </View>
        </View>

        <View style={styles.sentTextWrap}>
          <Text style={styles.sentStamp}>DARE SENT</Text>
          <Text style={styles.sentTitle}>Waiting for {targetName} to respond...</Text>
          <Text style={styles.sentSubtitle}>
            No reply? Send it again — or try a different app.
          </Text>
        </View>

        <RitualCard>
          <Text style={styles.previewLabel}>WHAT THEY&apos;LL SEE</Text>
          <Text style={styles.previewText}>{getShareText()}</Text>
        </RitualCard>

        <SecondaryButton
          label={copied ? '✓ Copied!' : 'Copy link'}
          onPress={handleCopyLink}
          testID="cast-copy-post"
        />
      </RitualScreen>
    );
  }

  // -----------------------------------------------------------------------
  // SHARE SCREEN (dare created, not yet shared)
  // -----------------------------------------------------------------------

  if (dareSent) {
    return (
      <RitualScreen
        footer={
          <>
            <PrimaryButton label={`Send to ${targetName} →`} onPress={handleShare} testID="cast-share" />
            <SecondaryButton
              label={copied ? '✓ Copied!' : 'Copy link'}
              onPress={handleCopyLink}
              testID="cast-copy"
            />
          </>
        }
      >
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.sentIconWrap}>
          <View style={styles.sentIcon}>
            <Send color={palette.goldBright} size={28} />
          </View>
        </View>

        <View style={styles.sentTextWrap}>
          <Text style={styles.sentStamp}>DARE CREATED</Text>
          <Text style={styles.sentTitle}>
            Send it to {targetName}
          </Text>
          <Text style={styles.sentSubtitle}>
            {targetName} has 48 hours to accept or back down.
          </Text>
        </View>

        {/* Preview card */}
        <RitualCard>
          <Text style={styles.previewLabel}>SHARE MESSAGE</Text>
          <Text style={styles.previewText}>{getShareText()}</Text>
        </RitualCard>
      </RitualScreen>
    );
  }

  // -----------------------------------------------------------------------
  // CREATION FORM
  // -----------------------------------------------------------------------

  const canSend = vowText.trim().length > 0 && targetName.trim().length > 0;

  return (
    <>
      <RitualScreen
        scroll
        footer={
          <View>
            <PrimaryButton
              label={sending ? 'Creating...' : 'Send the dare'}
              onPress={handleSend}
              disabled={!canSend || sending}
              testID="cast-send"
            />
          </View>
        }
      >
        <Stack.Screen options={{ headerShown: false }} />

        {/* Back */}
        <Pressable onPress={() => router.push('/dashboard')} style={styles.backRow}>
          <ArrowLeft color={palette.textSecondary} size={16} />
          <Text style={styles.backLabel}>Dashboard</Text>
        </Pressable>

        <Text style={styles.pageTitle}>Dare a friend to an{'\n'}Unbreakable Vow</Text>

        {/* Vow text */}
        <RitualCard>
          <Text style={styles.sectionLabel}>THE DARE</Text>
          <TextInput
            value={vowText}
            onChangeText={setVowText}
            placeholder="e.g. No phone for a week"
            placeholderTextColor={palette.textMuted}
            multiline
            style={styles.textInput}
          />
          {suggestion && suggestion !== vowText ? (
            <Pressable onPress={acceptSuggestion} style={styles.suggestionRow}>
              <Sparkles color={palette.gold} size={12} />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ) : null}

          {/* Inline deadline */}
          <View style={styles.inlineDeadlineDivider} />
          <View style={styles.inlineDeadlineRow}>
            <Text style={styles.inlineDeadlineLabel}>Ends</Text>
            <View style={styles.chipRow}>
              {([
                ['tomorrow', 'Tomorrow'],
                ['end_of_week', 'End of week'],
                ['in_7_days', '7 days'],
                ['custom', 'Pick'],
              ] as [DeadlinePreset, string][]).map(([id, label]) => (
                <ChoiceChip
                  key={id}
                  label={label}
                  active={deadlinePreset === id}
                  onPress={() => {
                    setDeadlinePreset(id);
                    if (id === 'custom') setShowDatePicker(true);
                  }}
                />
              ))}
            </View>
          </View>
          {showDatePicker && deadlinePreset === 'custom' ? (
            <>
              <DateTimePicker
                value={customDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                themeVariant="dark"
                onChange={(_: unknown, date?: Date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (date) {
                    date.setHours(23, 59, 59, 0);
                    setCustomDate(date);
                  }
                }}
              />
              {Platform.OS === 'ios' && (
                <Pressable onPress={() => setShowDatePicker(false)} style={styles.datePickerDone}>
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </Pressable>
              )}
            </>
          ) : null}
          <Text style={styles.deadlineHint}>{formatDateShort(deadlineDate)}</Text>
        </RitualCard>

        {/* Target — contact picker or manual */}
        <RitualCard>
          <Text style={styles.sectionLabel}>WHO ARE YOU DARING?</Text>
          {targetName && !showManualName ? (
            /* Selected contact display */
            <View style={styles.selectedContact}>
              <View style={styles.selectedContactAvatar}>
                <UserRound color={palette.goldBright} size={18} />
              </View>
              <View style={styles.selectedContactInfo}>
                <Text style={styles.selectedContactName}>{targetName}</Text>
                {targetPhone && (
                  <Text style={styles.selectedContactPhone}>{targetPhone}</Text>
                )}
              </View>
              <Pressable
                onPress={() => {
                  setTargetName('');
                  setTargetPhone(null);
                }}
                style={styles.selectedContactClear}
              >
                <X color={palette.textMuted} size={14} />
              </Pressable>
            </View>
          ) : showManualName ? (
            /* Manual name input */
            <View>
              <TextInput
                value={targetName}
                onChangeText={(t) => { setTargetName(t); setTargetPhone(null); }}
                placeholder="First name"
                placeholderTextColor={palette.textMuted}
                style={styles.nameInput}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={30}
                returnKeyType="next"
                autoFocus
              />
              <Pressable onPress={() => { setShowManualName(false); setTargetName(''); }} style={styles.switchInputLink}>
                <Text style={styles.switchInputText}>Pick from contacts instead</Text>
              </Pressable>
            </View>
          ) : (
            /* Default: contact picker button */
            <View style={styles.contactPickerSection}>
              <Pressable
                onPress={() => setShowContactPicker(true)}
                style={styles.contactPickerButton}
              >
                <UserRound color={palette.goldBright} size={18} />
                <Text style={styles.contactPickerLabel}>Pick from contacts</Text>
              </Pressable>
              <Pressable onPress={() => setShowManualName(true)} style={styles.switchInputLink}>
                <Text style={styles.switchInputText}>Type a name instead</Text>
              </Pressable>
            </View>
          )}
        </RitualCard>

        {/* Suggested stake */}
        <RitualCard>
          <Text style={styles.sectionLabel}>SUGGEST A STAKE</Text>
          <Text style={styles.stakeSubline}>
            They choose their own stake. This is just a nudge.
          </Text>
          <View style={styles.chipRow}>
            {SUGGESTED_STAKES.map((amt) => (
              <ChoiceChip
                key={amt}
                label={amt === 0 ? 'Free' : `$${amt}`}
                active={suggestedStake === amt}
                onPress={() => setSuggestedStake(amt)}
              />
            ))}
          </View>
        </RitualCard>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </RitualScreen>

      <ContactPickerModal
        visible={showContactPicker}
        onSelect={(name, phone) => {
          setTargetName(name);
          setTargetPhone(phone);
          setShowContactPicker(false);
          setShowManualName(false);
        }}
        onClose={() => setShowContactPicker(false)}
      />

      <AuthSheet
        visible={authSheetVisible}
        onDismiss={() => setAuthSheetVisible(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  backLabel: {
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  pageTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: serifFont,
    lineHeight: 32,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: palette.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  textInput: {
    color: palette.text,
    fontSize: 17,
    fontFamily: serifFont,
    lineHeight: 26,
    minHeight: 60,
    textAlignVertical: 'top',
    padding: 0,
  },
  nameInput: {
    color: palette.text,
    fontSize: 17,
    lineHeight: 24,
    padding: 0,
    minHeight: 40,
  },
  contactPickerSection: {
    gap: 12,
  },
  contactPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(212,162,79,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.2)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  contactPickerLabel: {
    color: palette.goldBright,
    fontSize: 15,
    fontWeight: '600',
  },
  switchInputLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchInputText: {
    color: palette.textMuted,
    fontSize: 13,
  },
  selectedContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(212,162,79,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(212,162,79,0.15)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  selectedContactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212,162,79,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedContactInfo: {
    flex: 1,
    gap: 2,
  },
  selectedContactName: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedContactPhone: {
    color: palette.textMuted,
    fontSize: 13,
  },
  selectedContactClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Accepted vow summary
  acceptedVowRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  acceptedVowText: {
    flex: 1,
    color: palette.text,
    fontSize: 17,
    fontFamily: serifFont,
    fontWeight: '500',
    lineHeight: 24,
  },
  acceptedDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 12,
  },
  acceptedDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  acceptedDetailIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  acceptedDetailLabel: {
    color: palette.textMuted,
    fontSize: 13,
  },
  acceptedDetailValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '500',
  },
  acceptedDetailValueGold: {
    color: palette.goldBright,
    fontSize: 14,
    fontWeight: '700',
  },
  stakeSubline: {
    color: palette.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  suggestionText: {
    color: palette.gold,
    fontSize: 14,
    fontStyle: 'italic',
    flex: 1,
  },
  inlineDeadlineDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 8,
  },
  inlineDeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineDeadlineLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  deadlineHint: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: 'rgba(255,123,123,0.12)',
    borderRadius: 14,
    padding: 12,
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
  },
  datePickerDone: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  datePickerDoneText: {
    color: palette.goldBright,
    fontSize: 15,
    fontWeight: '600',
  },
  // Share / post-share screens
  sentIconWrap: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  sentIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(212,162,79,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentTextWrap: {
    alignItems: 'center',
    gap: 8,
  },
  sentStamp: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    color: palette.goldBright,
    textTransform: 'uppercase',
  },
  sentTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: serifFont,
    textAlign: 'center',
  },
  sentSubtitle: {
    color: palette.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: palette.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  previewText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});

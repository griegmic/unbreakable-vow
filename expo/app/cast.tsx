import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Send, Sparkles, Copy, Check } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AuthSheet from '@/components/auth-sheet';
import { ChoiceChip, PrimaryButton, RitualCard, RitualScreen, SecondaryButton } from '@/components/vow-ui';
import {
  analyzeVow,
  generateSuggestion,
  palette,
  serifFont,
  stakeAmounts as defaultStakeAmounts,
} from '@/constants/unbreakable';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

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
          starts_at: new Date().toISOString(),
          ends_at: deadlineDate.toISOString(),
        })
        .select()
        .single();

      if (vowError) throw new Error(`Failed to create dare: ${vowError.message}`);

      const link = `https://unbreakablevow.app/c/${challengeToken}`;
      setDareLink(link);
      setDareSent(true);
      setSending(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const getShareText = () => {
    const vowPart = formattedText.replace(/\.$/, '').toLowerCase();
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

  const resetForm = () => {
    setDareSent(false);
    setShared(false);
    setDareLink('');
    setVowText('');
    setSuggestion('');
    setTargetName('');
    setSuggestedStake(25);
    setError('');
  };

  // -----------------------------------------------------------------------
  // POST-SHARE STATE
  // -----------------------------------------------------------------------

  if (shared) {
    return (
      <RitualScreen
        footer={
          <>
            <PrimaryButton label="Dare someone else" onPress={resetForm} />
            <SecondaryButton label="Dashboard" onPress={() => router.push('/dashboard')} />
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
            You&apos;ll get a notification when they accept or back down.
          </Text>
        </View>
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
            <PrimaryButton label="Share the dare →" onPress={handleShare} />
            <SecondaryButton
              label={copied ? '✓ Copied!' : 'Copy link'}
              onPress={handleCopyLink}
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
          <Text style={styles.sentStamp}>DARE SENT</Text>
          <Text style={styles.sentTitle}>
            Now send it to {targetName}
          </Text>
          <Text style={styles.sentSubtitle}>
            Share the link below. They have 48 hours to accept or back down.
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
          <Text style={styles.sectionLabel}>WHAT DO YOU DARE THEM TO DO?</Text>
          <TextInput
            value={vowText}
            onChangeText={setVowText}
            placeholder="e.g. Run a marathon this year"
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

        {/* Target name */}
        <RitualCard>
          <Text style={styles.sectionLabel}>WHO ARE YOU DARING?</Text>
          <TextInput
            value={targetName}
            onChangeText={setTargetName}
            placeholder="Their name"
            placeholderTextColor={palette.textMuted}
            style={styles.nameInput}
            autoCapitalize="words"
          />
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

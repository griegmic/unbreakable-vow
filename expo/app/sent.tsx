import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Check, Copy } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RitualCard, RitualScreen, SecondaryButton, TitleBlock, VowPreview } from '@/components/vow-ui';
import { getVowVerdictDate, palette } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

export default function SentScreen() {
  const { activeVowText, vow, isSelfWitness } = useVowFlow();
  const dates = getVowVerdictDate(vow.rawInput);
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[SentScreen] vow sealed, playing success animation');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 12 }),
      Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyLink = async () => {
    void Haptics.selectionAsync();
    if (Platform.OS !== 'web') {
      try {
        const verdictUrl = vow.witnessInviteToken
          ? `https://unbreakablevow.app/witness?token=${vow.witnessInviteToken}`
          : '';
        const shareMsg = verdictUrl
          ? `I just made an Unbreakable Vow. Be my witness: ${verdictUrl}`
          : `I just made an Unbreakable Vow. Can you be my witness?`;
        await Share.share({ message: shareMsg });
      } catch {
        console.log('[SentScreen] share failed');
      }
    }
  };

  const brokenTarget =
    vow.stake.consequence === 'witness'
      ? (isSelfWitness ? 'charity' : vow.witnessName)
      : vow.stake.destination;

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton label="Got it" onPress={() => router.push('/live')} testID="sent-continue" />
          {!isSelfWitness && (
            <SecondaryButton
              label="Preview what your witness sees"
              onPress={() => {
                if (vow.witnessInviteToken) {
                  void Linking.openURL(`https://unbreakablevow.app/witness?token=${vow.witnessInviteToken}`);
                } else {
                  router.push('/witness-invite');
                }
              }}
              testID="sent-witness-preview"
            />
          )}
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.checkWrap}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
          <Check color={palette.success} size={24} strokeWidth={2.5} />
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: contentFade }}>
        <TitleBlock
          title={isSelfWitness ? 'Sealed.' : vow.phoneNumber ? 'Sealed. Invite sent.' : 'Sealed.'}
          subtitle={
            isSelfWitness
              ? 'Your vow is locked. You\'ll judge yourself when the time comes.'
              : vow.phoneNumber
                ? `We just texted ${vow.witnessName}. They'll get the details and choose to accept.`
                : `Share the link with ${vow.witnessName} so they can be your witness.`
          }
        />
      </Animated.View>

      <Animated.View style={{ opacity: contentFade }}>
        <VowPreview text={activeVowText} />
      </Animated.View>

      <Animated.View style={{ opacity: contentFade }}>
        <RitualCard>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{isSelfWitness ? 'Accountability' : 'Witness'}</Text>
            <Text style={styles.metaValue}>{isSelfWitness ? 'Self-judged' : vow.witnessName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Stake</Text>
            <Text style={styles.metaValueGold}>${vow.stake.amount}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>If broken</Text>
            <Text style={styles.metaValue}>{brokenTarget}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Verdict</Text>
            <Text style={styles.metaValue}>{dates.endLabel}</Text>
          </View>
        </RitualCard>
      </Animated.View>

      <Animated.View style={{ opacity: contentFade }}>
        <RitualCard style={styles.stepsCard}>
          {isSelfWitness ? (
            <>
              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
                <Text style={styles.stepText}>Honor your vow for the full window.</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
                <Text style={styles.stepText}>On {dates.endLabel}, you deliver your own honest verdict.</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
                <Text style={styles.stepText}>If broken, ${vow.stake.amount} goes to {brokenTarget}.</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
                <Text style={styles.stepText}>
                  {vow.phoneNumber
                    ? `We texted ${vow.witnessName}. They'll accept the invite.`
                    : `Share the invite link with ${vow.witnessName}.`}
                </Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
                <Text style={styles.stepText}>{vow.witnessName} delivers the verdict on {dates.endLabel}.</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
                <Text style={styles.stepText}>If broken, ${vow.stake.amount} goes to {brokenTarget}.</Text>
              </View>
            </>
          )}
        </RitualCard>
      </Animated.View>

      {!isSelfWitness ? (
        <Animated.View style={[styles.actionsRow, { opacity: contentFade }]}>
          <Pressable style={styles.smallAction} onPress={handleCopyLink} testID="sent-copy-link">
            <Copy color={palette.textSecondary} size={16} />
            <Text style={styles.smallActionText}>Share invite link</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  checkWrap: {
    alignItems: 'center',
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.successMuted,
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#52D69A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
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
  stepsCard: {
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(212,162,79,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    color: palette.goldBright,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  stepText: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  smallAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  smallActionText: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

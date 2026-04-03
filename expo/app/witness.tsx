import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Link2, MessageSquareText, Search, Sparkles, UserPlus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  BackButton,
  PrimaryButton,
  RitualScreen,
  SecondaryButton,
  TitleBlock,
  VowPreview,
} from '@/components/vow-ui';
import { palette, witnessContacts } from '@/constants/unbreakable';
import { useVowFlow } from '@/providers/vow-flow';

type WitnessMode = 'choose' | 'contacts' | 'manual' | 'invite';

export default function WitnessScreen() {
  const { activeVowText, setWitness } = useVowFlow();
  const [mode, setMode] = useState<WitnessMode>('choose');
  const [selectedName, setSelectedName] = useState<string>('');
  const [inviteMethod, setInviteMethod] = useState<'sms' | 'link'>('link');
  const [phone, setPhone] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return witnessContacts;
    return witnessContacts.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const canFinish = useMemo(() => {
    if (!selectedName.trim()) return false;
    if (inviteMethod === 'sms') return phone.replace(/\D/g, '').length >= 10;
    return true;
  }, [selectedName, inviteMethod, phone]);

  const handleSelectContact = (name: string) => {
    void Haptics.selectionAsync();
    setSelectedName(name);
    setMode('invite');
  };

  const handleConfirm = () => {
    if (!selectedName.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWitness(selectedName, inviteMethod, phone);
    router.push('/stake');
  };

  const handleCopyLink = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    if (Platform.OS !== 'web') {
      try {
        await Share.share({ message: 'Accept my Unbreakable Vow: https://unbreakablevow.app/invite/a3x9k2' });
      } catch {
        console.log('[WitnessScreen] share failed');
      }
    }
    setTimeout(() => setCopied(false), 2500);
  };

  const handleVowkeeper = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWitness('Vowkeeper', 'link');
    router.push('/stake');
  };

  if (mode === 'choose') {
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title="Choose your witness."
          subtitle="Someone who knows you well enough to call it honestly."
        />
        <VowPreview text={activeVowText} compact />

        <Pressable
          onPress={() => setMode('contacts')}
          style={styles.heroOption}
          testID="witness-contacts"
        >
          <View style={styles.heroOptionIcon}>
            <UserPlus color="#000" size={20} />
          </View>
          <View style={styles.heroOptionCopy}>
            <Text style={styles.heroOptionTitle}>Pick from contacts</Text>
            <Text style={styles.heroOptionSub}>Find them in one tap</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setMode('manual')}
          style={styles.secondaryOption}
          testID="witness-manual"
        >
          <View style={styles.secondaryOptionIcon}>
            <MessageSquareText color={palette.textSecondary} size={20} />
          </View>
          <View style={styles.heroOptionCopy}>
            <Text style={styles.secondaryOptionTitle}>Type a name</Text>
            <Text style={styles.secondaryOptionSub}>Enter their name and send a link</Text>
          </View>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or go solo</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          onPress={handleVowkeeper}
          style={styles.vowkeeperOption}
          testID="witness-vowkeeper"
        >
          <View style={styles.vowkeeperIcon}>
            <Sparkles color={palette.goldBright} size={20} />
          </View>
          <View style={styles.heroOptionCopy}>
            <Text style={styles.secondaryOptionTitle}>Just me and Vowkeeper</Text>
            <Text style={styles.secondaryOptionSub}>Our AI holds you accountable via text</Text>
          </View>
        </Pressable>

        <View style={styles.explainerCard}>
          <Text style={styles.explainerTitle}>What does a witness do?</Text>
          <Text style={styles.explainerBody}>
            Your witness gets a text when you seal your vow. At the end of the week, they deliver the verdict — kept or broken. Their call is final.
          </Text>
        </View>
      </RitualScreen>
    );
  }

  if (mode === 'contacts') {
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title="Pick your witness"
          subtitle="Tap the person who'll hold you to it."
        />

        <View style={styles.searchBar}>
          <Search color={palette.textMuted} size={16} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={palette.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="witness-search"
          />
        </View>

        <View style={styles.contactsList}>
          {filteredContacts.map((contact, index) => (
            <Pressable
              key={contact.id}
              onPress={() => handleSelectContact(contact.name)}
              style={[
                styles.contactRow,
                index < filteredContacts.length - 1 ? styles.contactRowBorder : null,
              ]}
              testID={`witness-contact-${contact.id}`}
            >
              <View style={[styles.contactAvatar, { backgroundColor: contact.accent }]}>
                <Text style={styles.contactInitial}>{contact.initials}</Text>
              </View>
              <Text style={styles.contactName}>{contact.name}</Text>
            </Pressable>
          ))}
        </View>

        <SecondaryButton
          label="Type a name instead"
          onPress={() => setMode('manual')}
          testID="witness-switch-manual"
        />
      </RitualScreen>
    );
  }

  if (mode === 'manual') {
    return (
      <RitualScreen
        footer={
          <PrimaryButton
            label="Next"
            onPress={() => {
              if (selectedName.trim()) {
                void Haptics.selectionAsync();
                setMode('invite');
              }
            }}
            disabled={!selectedName.trim()}
            testID="witness-manual-next"
          />
        }
      >
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title="Name your witness."
          subtitle="Someone who won't go easy on you."
        />
        <VowPreview text={activeVowText} compact />

        <View style={styles.manualInputShell}>
          <Text style={styles.manualLabel}>THEIR FIRST NAME</Text>
          <TextInput
            style={styles.manualInput}
            placeholder="e.g. Daniel"
            placeholderTextColor={palette.textMuted}
            value={selectedName}
            onChangeText={setSelectedName}
            autoFocus
            onSubmitEditing={() => { if (selectedName.trim()) setMode('invite'); }}
            testID="witness-name-input"
          />
        </View>
      </RitualScreen>
    );
  }

  return (
    <RitualScreen
      footer={
        <PrimaryButton
          label={inviteMethod === 'link' ? 'Share link & continue' : 'Send invite & continue'}
          onPress={handleConfirm}
          disabled={!canFinish}
          testID="witness-confirm"
        />
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <BackButton />
      <TitleBlock
        title={`Invite ${selectedName}`}
        subtitle={`We'll notify ${selectedName} after you seal the vow. They'll get the details and choose to accept.`}
      />
      <VowPreview text={activeVowText} compact />

      <Pressable
        onPress={() => setInviteMethod('sms')}
        style={[styles.methodCard, inviteMethod === 'sms' ? styles.methodCardActive : null]}
        testID="witness-method-sms"
      >
        <View style={styles.methodIcon}>
          <Text style={styles.methodEmoji}>💬</Text>
        </View>
        <View style={styles.methodCopy}>
          <Text style={styles.methodTitle}>Text {selectedName}</Text>
          <Text style={styles.methodSub}>We'll SMS them the invite</Text>
        </View>
      </Pressable>

      {inviteMethod === 'sms' ? (
        <View style={styles.manualInputShell}>
          <Text style={styles.manualLabel}>PHONE NUMBER</Text>
          <TextInput
            style={styles.manualInput}
            placeholder="(555) 123-4567"
            placeholderTextColor={palette.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            testID="witness-phone-input"
          />
        </View>
      ) : null}

      <Pressable
        onPress={() => setInviteMethod('link')}
        style={[styles.methodCard, inviteMethod === 'link' ? styles.methodCardActive : null]}
        testID="witness-method-link"
      >
        <View style={styles.methodIcon}>
          <Link2 color={palette.goldBright} size={18} />
        </View>
        <View style={styles.methodCopy}>
          <Text style={styles.methodTitle}>Share a link myself</Text>
          <Text style={styles.methodSub}>iMessage, WhatsApp, DM — your choice</Text>
        </View>
      </Pressable>

      {inviteMethod === 'link' ? (
        <View style={styles.linkPreviewRow}>
          <Text style={styles.linkUrl} numberOfLines={1}>unbreakablevow.app/invite/a3x9k2</Text>
          <Pressable
            style={[styles.copyBtn, copied && styles.copyBtnCopied]}
            onPress={handleCopyLink}
            testID="witness-copy-link"
          >
            <Text style={[styles.copyBtnText, copied && styles.copyBtnTextCopied]}>
              {copied ? 'Copied ✓' : 'Copy'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </RitualScreen>
  );
}

const styles = StyleSheet.create({
  heroOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.goldBright,
    borderRadius: 16,
    padding: 18,
  },
  heroOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOptionCopy: {
    flex: 1,
    gap: 2,
  },
  heroOptionTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  heroOptionSub: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: 13,
  },
  secondaryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryOptionTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  secondaryOptionSub: {
    color: palette.textMuted,
    fontSize: 13,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
  },
  dividerText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  vowkeeperOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  vowkeeperIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(212,162,79,0.12)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explainerCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  explainerTitle: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  explainerBody: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  contactsList: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
  },
  contactRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInitial: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  contactName: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  manualInputShell: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  manualLabel: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
  },
  manualInput: {
    color: palette.text,
    fontSize: 17,
    minHeight: 28,
    paddingVertical: 0,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  methodCardActive: {
    borderColor: palette.borderStrong,
    backgroundColor: palette.surfaceElevated,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(212,162,79,0.08)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodEmoji: {
    fontSize: 18,
  },
  methodCopy: {
    flex: 1,
    gap: 2,
  },
  methodTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  methodSub: {
    color: palette.textMuted,
    fontSize: 13,
  },
  linkPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },
  linkUrl: {
    flex: 1,
    color: palette.textMuted,
    fontSize: 13,
    marginRight: 8,
  },
  copyBtn: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyBtnCopied: {
    backgroundColor: palette.successMuted,
    borderColor: 'rgba(82,214,154,0.22)',
  },
  copyBtnText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  copyBtnTextCopied: {
    color: palette.success,
  },
});

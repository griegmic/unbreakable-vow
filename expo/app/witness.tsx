import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Link, Search, UserPlus, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  BackButton,
  PrimaryButton,
  RitualScreen,
  TitleBlock,
} from '@/components/vow-ui';
import { palette, serifFont } from '@/constants/unbreakable';
import { updateVowWitness } from '@/lib/vow-api';
import { useVowFlow } from '@/providers/vow-flow';

type WitnessMode = 'choose' | 'contacts' | 'confirm';

interface ContactEntry {
  id: string;
  name: string;
  phone: string;
}

export default function WitnessScreen() {
  const { setWitness, setWitnessType, vow, updateConsequence, updateWitnessMidVow, setVowId } = useVowFlow();
  const params = useLocalSearchParams<{ midVow?: string }>();
  const isMidVow = params.midVow === '1' && !!vow.vowId;
  const [mode, setMode] = useState<WitnessMode>('choose');
  const [inlineNameText, setInlineNameText] = useState<string>('');
  const [showNameAfterShare, setShowNameAfterShare] = useState<boolean>(false);
  const nameInputRef = React.useRef<TextInput>(null);

  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [pendingName, setPendingName] = useState<string>('');
  const [pendingPhone, setPendingPhone] = useState<string>('');

  const stakeAmount = vow.stake.amount;

  useEffect(() => {
    if (stakeAmount <= 0) {
      console.log('[WitnessScreen] no stake set, redirecting to /stake');
      router.replace('/stake');
    }
  }, [stakeAmount]);

  console.log('[WitnessScreen] mode:', mode);

  const handlePickFromContacts = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoadingContacts(true);

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setLoadingContacts(false);
        Alert.alert(
          'Contacts access needed',
          'Go to Settings \u2192 Unbreakable Vow \u2192 Contacts to allow access.',
        );
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
        sort: Contacts.SortTypes.FirstName,
      });

      const parsed: ContactEntry[] = [];
      for (const c of data) {
        if (!c.name) continue;
        const phoneNum = c.phoneNumbers?.[0]?.number;
        if (phoneNum) {
          parsed.push({
            id: c.id ?? c.name,
            name: c.name,
            phone: phoneNum,
          });
        }
      }

      if (parsed.length === 0) {
        setLoadingContacts(false);
        Alert.alert(
          'No contacts found',
          'We couldn\'t find contacts with phone numbers.',
          [{ text: 'OK', style: 'cancel' }],
        );
        return;
      }

      setContacts(parsed);
      setLoadingContacts(false);
      setMode('contacts');
    } catch {
      setLoadingContacts(false);
      Alert.alert(
        'Contacts unavailable',
        'Contacts aren\'t available in this environment.',
        [{ text: 'OK', style: 'cancel' }],
      );
    }
  }, []);

  const handleSelectContact = useCallback((contact: ContactEntry) => {
    void Haptics.selectionAsync();
    const firstName = contact.name.split(' ')[0];
    console.log('[WitnessScreen] contact selected:', firstName, contact.phone);
    setPendingName(firstName);
    setPendingPhone(contact.phone);
    setMode('confirm');
  }, []);

  const [updatingWitness, setUpdatingWitness] = useState<boolean>(false);

  const handleConfirmWitness = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isMidVow && vow.vowId) {
      setUpdatingWitness(true);
      const result = await updateVowWitness(vow.vowId, {
        witnessName: pendingName,
        witnessPhone: pendingPhone || null,
      });
      setUpdatingWitness(false);

      if (result.success) {
        setWitnessType('friend');
        updateWitnessMidVow(pendingName, pendingPhone || '');
        if (result.witnessInviteToken) {
          setVowId(vow.vowId, result.witnessInviteToken);
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        Alert.alert('Something went wrong', result.error || 'Please try again.');
      }
      return;
    }

    setWitnessType('friend');
    setWitness(pendingName, pendingPhone ? 'sms' : 'link', pendingPhone || undefined);
    router.push('/seal');
  }, [pendingName, pendingPhone, setWitnessType, setWitness, isMidVow, vow.vowId, updateWitnessMidVow, setVowId]);

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(c => c.name.toLowerCase().includes(q));
  }, [contacts, contactSearch]);

  const handleInlineNameSubmit = () => {
    if (!inlineNameText.trim()) return;
    void Haptics.selectionAsync();
    const name = inlineNameText.trim();
    console.log('[WitnessScreen] inline name submitted:', name);
    setPendingName(name);
    setPendingPhone('');
    setMode('confirm');
  };

  if (mode === 'confirm') {
    const consequenceLabel = `$${stakeAmount} goes to ${vow.stake.destination}`;

    return (
      <RitualScreen
        footer={
          <PrimaryButton
            label={updatingWitness ? 'Updating...' : 'Lock it in'}
            onPress={handleConfirmWitness}
            disabled={updatingWitness}
            testID="witness-confirm-continue"
          />
        }
      >
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title={`${pendingName} is your witness.`}
          subtitle="Here's what happens if you break it."
        />

        <View style={styles.consequenceCard}>
          <Text style={styles.consequenceLabel}>IF YOU BREAK IT</Text>
          <Text style={styles.consequenceValue}>{consequenceLabel}</Text>
        </View>
      </RitualScreen>
    );
  }

  if (mode === 'choose') {
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title={`$${stakeAmount} is on the line.`}
          subtitle="Who's going to hold you to it?"
        />

        <Pressable
          onPress={handlePickFromContacts}
          style={({ pressed }) => [styles.heroButton, pressed && styles.heroButtonPressed]}
          testID="witness-pick-friend"
        >
          <View style={styles.heroIconWrap}>
            {loadingContacts ? (
              <ActivityIndicator size="small" color={palette.goldBright} />
            ) : (
              <UserPlus color={palette.goldBright} size={22} />
            )}
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Pick a friend</Text>
            <Text style={styles.heroSubtitle}>They'll decide if you kept your word</Text>
          </View>
          <ChevronRight color={palette.goldBright} size={18} />
        </Pressable>

        <Pressable
          onPress={async () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
              const vowText = vow.rawInput || 'my vow';
              const msg = `I'm making an Unbreakable Vow: "${vowText}" — ${stakeAmount} is on the line. I need you to hold me accountable. I'll send you the official witness link once it's sealed!`;
              console.log('[WitnessScreen] sharing invite link');
              const result = await Share.share(
                Platform.OS === 'ios'
                  ? { message: msg }
                  : { message: msg }
              );
              if (result.action !== Share.dismissedAction) {
                console.log('[WitnessScreen] share completed, showing name input');
                setShowNameAfterShare(true);
                setTimeout(() => nameInputRef.current?.focus(), 300);
              }
            } catch {
              console.log('[WitnessScreen] share cancelled');
            }
          }}
          style={({ pressed }) => [styles.shareLinkBtn, pressed && styles.shareLinkBtnPressed]}
          testID="witness-share-link"
        >
          <Link color={palette.textSecondary} size={16} />
          <Text style={styles.shareLinkText}>Send a link instead</Text>
        </Pressable>

        {showNameAfterShare && (
          <View style={styles.namePromptCard}>
            <Text style={styles.namePromptText}>Link shared! Who did you send it to?</Text>
          </View>
        )}

        <View style={styles.inlineInputWrap}>
          <TextInput
            ref={nameInputRef}
            style={styles.inlineInput}
            placeholder={showNameAfterShare ? "Their first name..." : "Or type a name..."}
            placeholderTextColor={palette.textMuted}
            value={inlineNameText}
            onChangeText={setInlineNameText}
            onSubmitEditing={handleInlineNameSubmit}
            returnKeyType="go"
            autoCapitalize="words"
            testID="witness-inline-name"
          />
          {inlineNameText.trim().length > 0 && (
            <Pressable onPress={handleInlineNameSubmit} style={styles.inlineNextBtn} testID="witness-inline-next">
              <Text style={styles.inlineNextText}>Next</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.soloFooterMinimal}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWitnessType('self');
              setWitness('Just me', 'link');
              router.push('/seal');
            }}
            style={styles.soloTextLink}
            testID="witness-solo"
          >
            <Text style={styles.soloTextLinkLabel}>I'll hold myself accountable</Text>
          </Pressable>
        </View>
      </RitualScreen>
    );
  }

  if (mode === 'contacts') {
    return (
      <RitualScreen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.contactsHeader}>
          <Pressable onPress={() => setMode('choose')} style={styles.contactsBackBtn} testID="contacts-back">
            <X color={palette.textSecondary} size={18} />
          </Pressable>
          <Text style={styles.contactsTitle}>Pick a friend</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.searchBar}>
          <Search color={palette.textMuted} size={16} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={palette.textMuted}
            value={contactSearch}
            onChangeText={setContactSearch}
            autoFocus
            testID="contacts-search"
          />
        </View>

        {filteredContacts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {contactSearch ? 'No contacts match your search.' : 'No contacts with phone numbers found.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            style={styles.contactsList}
            contentContainerStyle={styles.contactsListContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => {
              const initial = item.name.charAt(0).toUpperCase();
              const colors = ['#4A7BF7', '#52D69A', '#D4A24F', '#F76E6E', '#9B6EF7'];
              const bg = colors[initial.charCodeAt(0) % colors.length];
              return (
                <Pressable
                  style={[styles.contactRow, index < filteredContacts.length - 1 && styles.contactRowBorder]}
                  onPress={() => handleSelectContact(item)}
                  testID={`contact-${item.id}`}
                >
                  <View style={[styles.contactAvatar, { backgroundColor: bg }]}>
                    <Text style={styles.contactInitial}>{initial}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactPhone}>{item.phone}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </RitualScreen>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  heroButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(212,162,79,0.1)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 3,
  },
  heroTitle: {
    color: palette.goldBright,
    fontSize: 17,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  shareLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginTop: 2,
  },
  shareLinkBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  shareLinkText: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  namePromptCard: {
    backgroundColor: 'rgba(82,214,154,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(82,214,154,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 6,
  },
  namePromptText: {
    color: palette.success,
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  inlineInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingVertical: 14,
    gap: 10,
    marginTop: 4,
  },
  inlineInput: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  inlineNextBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: palette.goldBright,
  },
  inlineNextText: {
    color: '#0B0D11',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  soloFooterMinimal: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 20,
  },
  soloTextLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  soloTextLinkLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '400' as const,
    textAlign: 'center' as const,
  },
  consequenceCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  consequenceLabel: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.3,
  },
  consequenceValue: {
    color: palette.goldBright,
    fontSize: 22,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    textAlign: 'center' as const,
    letterSpacing: -0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  toggleCopy: {
    flex: 1,
    gap: 3,
  },
  toggleTitle: {
    color: palette.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  toggleTitleActive: {
    color: palette.text,
  },
  toggleDesc: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  contactsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  contactsBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '700' as const,
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
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
  },
  contactsListContent: {
    paddingHorizontal: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
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
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  contactPhone: {
    color: palette.textMuted,
    fontSize: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 14,
    textAlign: 'center' as const,
  },

});

import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Check, Link2, MessageSquareText, Search, UserPlus, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  BackButton,
  PrimaryButton,
  RitualScreen,
  TitleBlock,
  VowPreview,
} from '@/components/vow-ui';
import { palette } from '@/constants/unbreakable';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

type WitnessMode = 'choose' | 'contacts' | 'manual' | 'invite';

interface ContactEntry {
  id: string;
  name: string;
  phone: string;
}

export default function WitnessScreen() {
  const { displayName } = useAuth();
  const { activeVowText, setWitness } = useVowFlow();
  const [mode, setMode] = useState<WitnessMode>('choose');
  const [selectedName, setSelectedName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [linkShared, setLinkShared] = useState(false);


  // Contact picker state
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  console.log('[WitnessScreen] mode:', mode, 'selectedName:', selectedName);

  const hasPhone = phone.replace(/\D/g, '').length >= 10;
  const canFinish = useMemo(() => {
    if (!selectedName.trim()) return false;
    return hasPhone || linkShared;
  }, [selectedName, hasPhone, linkShared]);

  const handleConfirm = () => {
    if (!selectedName.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWitness(selectedName, 'sms', phone);
    router.push('/stake');
  };

  const makerName = displayName || 'Your friend';
  const witnessUrl = `https://unbreakablevow.app/witness?preview&vow=${encodeURIComponent(activeVowText)}&name=${encodeURIComponent(selectedName)}&maker=${encodeURIComponent(makerName)}`;
  const shareMessage = `I just made an Unbreakable Vow and I need you to hold me to it. Will you be my witness?\n\n${witnessUrl}`;

  const handleShareLink = async () => {
    if (Platform.OS !== 'web') {
      try {
        const result = await Share.share({
          message: shareMessage,
          url: witnessUrl,
        });
        if (result.action === Share.sharedAction) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setLinkShared(true);
        }
      } catch {
        console.log('[WitnessScreen] share failed');
      }
    }
  };

  const handlePickFromContacts = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoadingContacts(true);

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setLoadingContacts(false);
        Alert.alert(
          'Contacts access needed',
          'Go to Settings → Unbreakable Vow → Contacts to allow access.',
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
          'We couldn\'t find contacts with phone numbers. Try typing a name instead.',
          [
            { text: 'Type a name', onPress: () => setMode('manual') },
            { text: 'Cancel', style: 'cancel' },
          ],
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
        'Contacts aren\'t available in this environment. Try typing a name instead.',
        [
          { text: 'Type a name', onPress: () => setMode('manual') },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  }, []);

  const handleSelectContact = useCallback((contact: ContactEntry) => {
    void Haptics.selectionAsync();
    setSelectedName(contact.name.split(' ')[0]);
    setPhone(contact.phone);
    setMode('invite');
  }, []);

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(c => c.name.toLowerCase().includes(q));
  }, [contacts, contactSearch]);

  // ─── Choose mode ───
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
          onPress={handlePickFromContacts}
          style={styles.heroOption}
          testID="witness-contacts"
        >
          {loadingContacts ? (
            <View style={styles.heroOptionIcon}>
              <ActivityIndicator size="small" color="#000" />
            </View>
          ) : (
            <View style={styles.heroOptionIcon}>
              <UserPlus color="#000" size={20} />
            </View>
          )}
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
            <MessageSquareText color={palette.textSecondary} size={18} />
          </View>
          <View style={styles.heroOptionCopy}>
            <Text style={styles.secondaryOptionTitle}>Type a name</Text>
            <Text style={styles.secondaryOptionSub}>Enter their name and send a link</Text>
          </View>
        </Pressable>

        <View style={styles.explainerCard}>
          <Text style={styles.explainerTitle}>What does a witness do?</Text>
          <Text style={styles.explainerBody}>
            Your witness gets a text when you seal your vow. When the time is up, they deliver the verdict — kept or broken. Their call is final.
          </Text>
        </View>
      </RitualScreen>
    );
  }

  // ─── Contact picker mode ───
  if (mode === 'contacts') {
    return (
      <RitualScreen scroll={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.contactsHeader}>
          <Pressable onPress={() => setMode('choose')} style={styles.contactsBackBtn} testID="contacts-back">
            <X color={palette.textSecondary} size={18} />
          </Pressable>
          <Text style={styles.contactsTitle}>Pick a witness</Text>
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

  // ─── Manual name entry mode ───
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

  // ─── Invite mode ───
  return (
    <RitualScreen
      footer={
        <PrimaryButton
          label="Continue"
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
        subtitle={linkShared
          ? `Link shared! Add their number for SMS reminders, or continue.`
          : `Share a link or add their phone number so we can reach them.`}
      />
      <VowPreview text={activeVowText} compact />

      <Pressable
        onPress={handleShareLink}
        style={[styles.sharePreviewCard, linkShared && styles.sharePreviewCardDone]}
        testID="witness-share-preview"
      >
        <View style={[styles.methodIcon, linkShared && styles.methodIconDone]}>
          {linkShared
            ? <Check color={palette.success} size={18} />
            : <Link2 color={palette.goldBright} size={18} />}
        </View>
        <View style={styles.methodCopy}>
          <Text style={styles.methodTitle}>{linkShared ? 'Link shared' : 'Share invite link'}</Text>
          <Text style={styles.methodSub}>{linkShared ? 'Tap to share again' : 'Send via iMessage, WhatsApp, etc'}</Text>
        </View>
      </Pressable>

      <View style={styles.manualInputShell}>
        <Text style={styles.manualLabel}>PHONE NUMBER {linkShared ? '(OPTIONAL)' : ''}</Text>
        <TextInput
          style={styles.manualInput}
          placeholder="(555) 123-4567"
          placeholderTextColor={palette.textMuted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          autoFocus={!phone && !linkShared}
          accessibilityLabel={`Phone number for ${selectedName}`}
          testID="witness-phone-input"
        />
      </View>

      <Text style={styles.inviteExplainer}>
        {hasPhone
          ? `We'll text ${selectedName} when you seal the vow.`
          : linkShared
            ? `${selectedName} will get the details via the link you shared.`
            : `Share a link or enter their number to continue.`}
      </Text>
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
  // Contact picker
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
  // Manual input
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
  // Invite method
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
  sharePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sharePreviewCardDone: {
    borderColor: 'rgba(82,214,154,0.25)',
    backgroundColor: 'rgba(82,214,154,0.06)',
  },
  methodIconDone: {
    backgroundColor: 'rgba(82,214,154,0.12)',
    borderColor: 'rgba(82,214,154,0.25)',
  },
  inviteExplainer: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 19,
    paddingHorizontal: 20,
  },
});

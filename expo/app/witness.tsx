import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Search, UserPlus, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import ContactPickerModal from '@/components/contact-picker-modal';
import {
  BackButton,
  RitualScreen,
  TitleBlock,
} from '@/components/vow-ui';
import { palette, serifFont } from '@/constants/unbreakable';
import { type ContactEntry, requestAndLoadContacts } from '@/lib/contacts';
import { updateVowWitness } from '@/lib/vow-api';
import { useVowFlow } from '@/providers/vow-flow';

type WitnessMode = 'choose' | 'contacts';

export default function WitnessScreen() {
  const { setWitness, setWitnessType, vow, updateWitnessMidVow, setVowId } = useVowFlow();
  const params = useLocalSearchParams<{ midVow?: string }>();
  const isMidVow = params.midVow === '1' && !!vow.vowId;
  const [mode, setMode] = useState<WitnessMode>('choose');

  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

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
      const { granted, contacts: loaded } = await requestAndLoadContacts();
      setLoadingContacts(false);
      if (!granted || loaded.length === 0) return;
      setContacts(loaded);
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

  const handleSelectContact = useCallback(async (contact: ContactEntry) => {
    void Haptics.selectionAsync();
    const firstName = contact.name.split(' ')[0];
    console.log('[WitnessScreen] contact selected:', firstName, contact.phone);

    if (isMidVow && vow.vowId) {
      try {
        const result = await updateVowWitness(vow.vowId, {
          witnessName: firstName,
          witnessPhone: contact.phone || null,
        });

        if (result.success) {
          setWitnessType('friend');
          updateWitnessMidVow(firstName, contact.phone || '');
          if (result.witnessInviteToken) {
            setVowId(vow.vowId, result.witnessInviteToken);
          }
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        } else {
          Alert.alert('Something went wrong', result.error || 'Please try again.');
        }
      } catch {
        Alert.alert('Something went wrong', 'Please try again.');
      }
      return;
    }

    setWitnessType('friend');
    setWitness(firstName, contact.phone ? 'sms' : 'link', contact.phone || undefined);
    router.push('/seal');
  }, [setWitnessType, setWitness, isMidVow, vow.vowId, updateWitnessMidVow, setVowId]);

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(c => c.name.toLowerCase().includes(q));
  }, [contacts, contactSearch]);

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
            <Text style={styles.heroTitle}>Text a friend</Text>
            <Text style={styles.heroSubtitle}>They'll decide if you kept your word</Text>
          </View>
          <ChevronRight color={palette.goldBright} size={18} />
        </Pressable>

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

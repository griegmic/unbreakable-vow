import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { Check, Link2, MessageSquareText, Search, Shield, User, UserPlus, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  BackButton,
  PrimaryButton,
  RitualScreen,
  TitleBlock,
  VowPreview,
} from '@/components/vow-ui';
import { palette, serifFont } from '@/constants/unbreakable';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

type WitnessMode = 'choose' | 'contacts' | 'manual' | 'invite' | 'solo-oath';

interface ContactEntry {
  id: string;
  name: string;
  phone: string;
}

export default function WitnessScreen() {
  const { displayName } = useAuth();
  const { activeVowText, setWitness, setWitnessType } = useVowFlow();
  const [mode, setMode] = useState<WitnessMode>('choose');
  const [selectedName, setSelectedName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [linkShared, setLinkShared] = useState(false);
  const [soloSworn, setSoloSworn] = useState<boolean>(false);
  const soloCheckScale = useRef(new Animated.Value(1)).current;
  const soloGlow = useRef(new Animated.Value(0)).current;


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
    setWitnessType('friend');
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

  const handleSoloSwear = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSoloSworn(true);
    Animated.parallel([
      Animated.timing(soloGlow, { toValue: 1, duration: 600, useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(soloCheckScale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
        Animated.spring(soloCheckScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
      ]),
    ]).start();
  };

  const handleSoloUnswear = () => {
    void Haptics.selectionAsync();
    setSoloSworn(false);
    Animated.timing(soloGlow, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  };

  const handleSoloContinue = () => {
    if (!soloSworn) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWitnessType('self');
    setWitness('Just me', 'link');
    router.push('/stake');
  };

  // ─── Choose mode ───
  if (mode === 'choose') {
    return (
      <RitualScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title="Who holds you accountable?"
          subtitle="A witness makes it real. Pick someone who won't let you off easy."
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
            <Text style={styles.heroOptionTitle}>Vow with a friend</Text>
            <Text style={styles.heroOptionSub}>They deliver the final verdict</Text>
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
            <Text style={styles.secondaryOptionTitle}>Type their name instead</Text>
            <Text style={styles.secondaryOptionSub}>Enter a name and send them a link</Text>
          </View>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or go solo</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setMode('solo-oath');
          }}
          style={styles.soloOption}
          testID="witness-solo"
        >
          <View style={styles.soloOptionIcon}>
            <User color={palette.textMuted} size={18} />
          </View>
          <View style={styles.heroOptionCopy}>
            <Text style={styles.soloOptionTitle}>Just me</Text>
            <Text style={styles.soloOptionSub}>Hold yourself accountable</Text>
          </View>
        </Pressable>
      </RitualScreen>
    );
  }

  // ─── Solo oath mode ───
  if (mode === 'solo-oath') {
    const soloBorderColor = soloGlow.interpolate({
      inputRange: [0, 1],
      outputRange: [palette.border, palette.borderStrong],
    });
    const soloBgOpacity = soloGlow.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.06],
    });

    return (
      <RitualScreen
        footer={
          <PrimaryButton
            label="Continue"
            onPress={handleSoloContinue}
            disabled={!soloSworn}
            testID="solo-continue"
          />
        }
      >
        <Stack.Screen options={{ headerShown: false }} />
        <BackButton />
        <TitleBlock
          title="A promise to yourself."
          subtitle="No witness. No one watching. Just you and your word. That makes it harder — and more meaningful."
        />
        <VowPreview text={activeVowText} compact />

        <View style={styles.soloOathCard}>
          <View style={styles.soloOathIconWrap}>
            <Shield color={palette.goldBright} size={24} />
          </View>
          <Text style={styles.soloOathHeading}>How this works</Text>
          <Text style={styles.soloOathBody}>
            When your vow window ends, you'll judge yourself. You'll be asked to honestly declare whether you kept or broke your word — under oath.
          </Text>
          <Text style={styles.soloOathBody}>
            No one can verify this but you. That's the point. This is about integrity.
          </Text>
        </View>

        <Animated.View style={[styles.solemnCard, { borderColor: soloBorderColor }]}>
          <Animated.View style={[styles.solemnGlowBg, { opacity: soloBgOpacity }]} />
          <Pressable
            onPress={soloSworn ? handleSoloUnswear : handleSoloSwear}
            style={styles.solemnRow}
            testID="solo-swear"
          >
            <Animated.View style={[styles.solemnCheckbox, soloSworn && styles.solemnCheckboxChecked, { transform: [{ scale: soloCheckScale }] }]}>
              {soloSworn ? <Check color="#0B0D11" size={14} strokeWidth={3} /> : null}
            </Animated.View>
            <View style={styles.solemnCopy}>
              <Text style={styles.solemnTitle}>I solemnly swear</Text>
              <Text style={styles.solemnText}>
                to be completely honest when I judge myself. I will not bend the truth, make excuses, or let myself off easy.
              </Text>
            </View>
          </Pressable>
        </Animated.View>
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
  soloOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: palette.border,
    opacity: 0.7,
  },
  soloOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soloOptionTitle: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  soloOptionSub: {
    color: palette.textMuted,
    fontSize: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
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
    textTransform: 'lowercase' as const,
  },
  soloOathCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 20,
    gap: 12,
    alignItems: 'center',
  },
  soloOathIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212,162,79,0.1)',
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soloOathHeading: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  soloOathBody: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center' as const,
  },
  solemnCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    backgroundColor: palette.surface,
    overflow: 'hidden',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  solemnGlowBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.goldBright,
  },
  solemnRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  solemnCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: palette.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  solemnCheckboxChecked: {
    backgroundColor: palette.goldBright,
    borderColor: palette.goldBright,
  },
  solemnCopy: {
    flex: 1,
    gap: 6,
  },
  solemnTitle: {
    color: palette.goldBright,
    fontSize: 18,
    fontWeight: '700' as const,
    fontFamily: serifFont,
    letterSpacing: -0.3,
  },
  solemnText: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
});

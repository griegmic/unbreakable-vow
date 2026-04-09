import { Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { palette } from '@/constants/unbreakable';
import { type ContactEntry, requestAndLoadContacts } from '@/lib/contacts';

const AVATAR_COLORS = ['#4A7BF7', '#52D69A', '#D4A24F', '#F76E6E', '#9B6EF7'];

interface ContactPickerModalProps {
  visible: boolean;
  onSelect: (name: string, phone: string) => void;
  onClose: () => void;
}

export default function ContactPickerModal({ visible, onSelect, onClose }: ContactPickerModalProps) {
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (contacts.length > 0) return; // already loaded
    setLoading(true);
    requestAndLoadContacts()
      .then(({ contacts: loaded }) => {
        setContacts(loaded);
      })
      .catch(() => {
        Alert.alert('Contacts unavailable', "Contacts aren't available in this environment.");
      })
      .finally(() => setLoading(false));
  }, [visible, contacts.length]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter((c) => c.name.toLowerCase().includes(q));
  }, [contacts, search]);

  const handleSelect = useCallback(
    (item: ContactEntry) => {
      const firstName = item.name.split(' ')[0];
      onSelect(firstName, item.phone);
    },
    [onSelect],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X color={palette.textSecondary} size={18} />
          </Pressable>
          <Text style={styles.title}>Pick a friend</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search color={palette.textMuted} size={16} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={palette.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={palette.goldBright} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              {search ? 'No contacts match your search.' : 'No contacts with phone numbers found.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => {
              const initial = item.name.charAt(0).toUpperCase();
              const bg = AVATAR_COLORS[initial.charCodeAt(0) % AVATAR_COLORS.length];
              return (
                <Pressable
                  style={[styles.row, index < filtered.length - 1 && styles.rowBorder]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={[styles.avatar, { backgroundColor: bg }]}>
                    <Text style={styles.initial}>{initial}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.phone}>{item.phone}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '700',
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
    marginHorizontal: 16,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    marginHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '500',
  },
  phone: {
    color: palette.textMuted,
    fontSize: 12,
  },
});

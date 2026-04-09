import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';

export interface ContactEntry {
  id: string;
  name: string;
  phone: string;
}

export async function requestAndLoadContacts(): Promise<{ granted: boolean; contacts: ContactEntry[] }> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Contacts access needed',
      'Go to Settings \u2192 Unbreakable Vow \u2192 Contacts to allow access.',
    );
    return { granted: false, contacts: [] };
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
    Alert.alert(
      'No contacts found',
      'We couldn\'t find contacts with phone numbers.',
      [{ text: 'OK', style: 'cancel' }],
    );
    return { granted: true, contacts: [] };
  }

  return { granted: true, contacts: parsed };
}

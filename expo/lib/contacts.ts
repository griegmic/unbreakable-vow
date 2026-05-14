import * as Contacts from 'expo-contacts';

export interface ContactEntry {
  id: string;
  name: string;
  phone: string;
}

export interface ContactPermissionResult {
  granted: boolean;
  contacts: ContactEntry[];
  status: Contacts.PermissionStatus;
  canAskAgain: boolean;
}

export async function requestAndLoadContacts(): Promise<ContactPermissionResult> {
  const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    return { granted: false, contacts: [], status, canAskAgain };
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
    return { granted: true, contacts: [], status, canAskAgain };
  }

  return { granted: true, contacts: parsed, status, canAskAgain };
}

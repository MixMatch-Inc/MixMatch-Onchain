import type { SavedContact } from '@mixmatch/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createContact, deleteContact, getContacts } from '../services/wallet-client';
import { ErrorState } from './states';

export interface ContactsPickerProps {
  accessToken: string;
  onSelect: (contact: SavedContact) => void;
}

/** Saved recipients (#1387): pick one to prefill destination and memo in Send. */
export default function ContactsPicker({ accessToken, onSelect }: ContactsPickerProps) {
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const { contacts: rows } = await getContacts(accessToken);
      setContacts(rows);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const created = await createContact(
        { label, destinationPublicKey: address, memo: memo || null },
        accessToken,
      );
      setContacts((prev) => [...prev, created]);
      setLabel('');
      setAddress('');
      setMemo('');
      setShowForm(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContact(id, accessToken);
      setContacts((prev) => prev.filter((contact) => contact.id !== id));
    } catch {
      setError(true);
    }
  };

  return (
    <View style={styles.container} testID="contacts-picker">
      <TouchableOpacity onPress={() => setShowForm((prev) => !prev)} testID="toggle-contact-form">
        <Text style={styles.link}>{showForm ? 'Cancel' : '+ Add saved recipient'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Label" value={label} onChangeText={setLabel} testID="contact-label-input" />
          <TextInput
            style={styles.input}
            placeholder="Stellar address"
            value={address}
            onChangeText={setAddress}
            autoCapitalize="characters"
            testID="contact-address-input"
          />
          <TextInput style={styles.input} placeholder="Default memo (optional)" value={memo} onChangeText={setMemo} testID="contact-memo-input" />
          <TouchableOpacity style={styles.button} onPress={() => void handleSave()} disabled={saving} testID="save-contact-button">
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save recipient</Text>}
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? <ActivityIndicator style={styles.loading} /> : null}
      {error ? <ErrorState message="Could not load saved recipients." action={{ label: 'Retry', onPress: () => void load() }} /> : null}
      {!isLoading && !error && contacts.length === 0 ? <Text style={styles.empty}>No saved recipients yet.</Text> : null}

      {contacts.map((contact) => (
        <View style={styles.row} key={contact.id} testID={`contact-${contact.id}`}>
          <TouchableOpacity style={styles.select} onPress={() => onSelect(contact)} testID={`select-contact-${contact.id}`}>
            <Text style={styles.label}>{contact.label}</Text>
            <Text style={styles.address} numberOfLines={1}>{contact.destinationPublicKey}</Text>
            {contact.memo ? <Text style={styles.memo}>Memo: {contact.memo}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void handleDelete(contact.id)} testID={`delete-contact-${contact.id}`}>
            <Text style={styles.delete}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  link: { color: '#0066cc', fontSize: 14 },
  form: { marginTop: 8, gap: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  button: { backgroundColor: '#000', borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  loading: { marginTop: 12 },
  empty: { color: '#666', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 8 },
  select: { flex: 1 },
  label: { fontWeight: '600' },
  address: { fontSize: 12, color: '#666' },
  memo: { fontSize: 12, color: '#999' },
  delete: { color: '#c00', fontSize: 12 },
});

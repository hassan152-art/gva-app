/**
 * Register a complaint: type, title, details, optional child and screenshot.
 */
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../api/client';
import { Text } from '../../components/Text';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/ui';
import { ChoiceChip, ErrorNote, Page, SectionLabel } from '../../components/donor/Kit';
import { colors } from '../../theme/tokens';
import { appendFile, pickFile } from '../../lib/donorApp';

const TYPES = [
  { key: 'payment', label: 'Payment' },
  { key: 'child_update', label: 'Child update' },
  { key: 'account', label: 'Account' },
  { key: 'other', label: 'Other' },
];

const input = { borderRadius: 12, borderWidth: 1, borderColor: colors.fieldBorder, paddingHorizontal: 14, fontSize: 15, color: colors.ink };

export default function NewTicket() {
  const router = useRouter();
  const [category, setCategory] = useState('payment');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .appMe()
      .then((r) => setChildren(r.children || []))
      .catch(() => {});
  }, []);

  async function submit() {
    setError(null);
    if (!subject.trim()) return setError('Write a short title');
    if (!message.trim()) return setError('Describe the problem');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('category', category);
      form.append('subject', subject.trim());
      form.append('message', message.trim());
      if (childId) form.append('orphanId', childId);
      await appendFile(form, 'attachment', file);
      const r = await api.createTicket(form);
      router.replace(`/tickets/${r.ticket.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="New complaint" subtitle="Our team replies here" back tab="help">
      <ErrorNote message={error} />
      <SectionLabel>Type</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {TYPES.map((t) => (
          <ChoiceChip key={t.key} label={t.label} on={category === t.key} onPress={() => setCategory(t.key)} />
        ))}
      </View>

      {children.length ? (
        <>
          <SectionLabel>About which child? (optional)</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <ChoiceChip label="Not about a child" on={!childId} onPress={() => setChildId(null)} />
            {children.map((c) => (
              <ChoiceChip key={c.id} label={c.code} on={childId === c.id} onPress={() => setChildId(c.id)} />
            ))}
          </View>
        </>
      ) : null}

      <SectionLabel>Title</SectionLabel>
      <TextInput
        value={subject}
        onChangeText={setSubject}
        placeholder="e.g. Payment sent 10 days ago, not delivered"
        placeholderTextColor={colors.placeholder}
        style={[input, { height: 48 }]}
        maxLength={120}
      />

      <SectionLabel>Details</SectionLabel>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Tell us what happened, dates and amounts help"
        placeholderTextColor={colors.placeholder}
        multiline
        style={[input, { minHeight: 120, paddingVertical: 12, textAlignVertical: 'top' }]}
      />

      <SectionLabel>Screenshot (optional)</SectionLabel>
      <Pressable
        onPress={async () => {
          const f = await pickFile().catch(() => null);
          if (f) setFile(f);
        }}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.fieldBorder, borderRadius: 14, padding: 14 }}
      >
        <Icon name={file ? 'check' : 'image'} size={20} color={colors.green} />
        <Text variant="caption" style={{ flex: 1, color: colors.ink }} numberOfLines={1}>
          {file ? file.name || 'Attached' : 'Attach a photo or PDF'}
        </Text>
        {file ? (
          <Text variant="tiny" color={colors.muted} onPress={() => setFile(null)}>
            Remove
          </Text>
        ) : null}
      </Pressable>

      <Button label="Submit complaint" onPress={submit} loading={busy} style={{ marginTop: 22 }} />
    </Page>
  );
}

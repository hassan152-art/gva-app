/**
 * Help — the donor's complaints (tickets): counts, list, new complaint.
 */
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../api/client';
import { Text } from '../../components/Text';
import { Icon } from '../../components/Icon';
import { Box, Empty, ErrorNote, Loading, Page, StatusPill, font } from '../../components/donor/Kit';
import { colors } from '../../theme/tokens';
import { fmtDate, useCachedState } from '../../lib/donorApp';

const CATEGORY = {
  payment: ['Payment', 'wallet', '#2563EB', '#EEF4FF'],
  child_update: ['Child update', 'heart', '#E11D48', '#FDECEE'],
  account: ['Account', 'user', colors.orange, '#FFF1E6'],
  other: ['Other', 'help', colors.green, '#EAF7EF'],
};

function CountTile({ label, value, on, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flex: 1,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: on ? colors.white : 'rgba(255,255,255,0.16)',
      }}
    >
      <Text variant="h2" color={on ? colors.greenDeep : colors.white} style={font.bold}>
        {value}
      </Text>
      <Text variant="tiny" color={on ? colors.greenText : 'rgba(255,255,255,0.85)'} style={font.medium}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function TicketsScreen() {
  const router = useRouter();
  const { signedIn, user } = useAuth();
  const [filter, setFilter] = useState(null);
  const [data, setData] = useCachedState(`tickets:${user?.id}:${filter || 'all'}`);
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      setError(null);
      if (!signedIn) return;
      api
        .tickets(filter)
        .then(setData)
        .catch((e) => setError(e.message));
    }, [filter, signedIn, setData]),
  );

  const c = data?.counts || { total: 0, pending: 0, resolved: 0 };
  return (
    <Page
      band
      title="Help"
      subtitle="Complaints and questions — our team replies here"
      tab="help"
      bandExtra={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <CountTile label="Total" value={c.total} on={!filter} onPress={() => setFilter(null)} />
          <CountTile label="Pending" value={c.pending} on={filter === 'pending'} onPress={() => setFilter('pending')} />
          <CountTile label="Resolved" value={c.resolved} on={filter === 'resolved'} onPress={() => setFilter('resolved')} />
        </View>
      }
    >
      <Pressable
        onPress={() => router.push('/tickets/new')}
        accessibilityRole="button"
        accessibilityLabel="New complaint"
        style={({ pressed }) => ({
          marginTop: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 18,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: colors.green,
          backgroundColor: pressed ? colors.tint : colors.tint2,
        })}
      >
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={20} color={colors.white} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={colors.ink} style={font.bold}>
            New complaint
          </Text>
          <Text variant="tiny" color={colors.muted}>
            Payment, child update, account or anything else
          </Text>
        </View>
        <Icon name="chevron" size={18} color={colors.green} />
      </Pressable>

      <ErrorNote message={error} />
      {!data && !error ? <Loading /> : null}
      {data && data.tickets.length === 0 ? (
        <Empty
          icon="ticket"
          title={filter ? `No ${filter} complaints` : 'No complaints'}
          text="If something is wrong — a payment, an update about your child — tell us here and our team will reply."
        />
      ) : null}
      {data?.tickets.map((t) => {
        const [catLabel, catIcon, catFg, catBg] = CATEGORY[t.category] || CATEGORY.other;
        return (
          <Box key={t.id} style={{ marginTop: 12 }} onPress={() => router.push(`/tickets/${t.id}`)} accessibilityLabel={t.subject}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: catBg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={catIcon} size={19} color={catFg} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Text variant="tiny" color={colors.muted} style={font.bold} numberOfLines={1}>
                    {t.ticketNo} · {catLabel}
                  </Text>
                  <StatusPill status={t.status} />
                </View>
                <Text variant="bodyStrong" style={[font.bold, { marginTop: 4 }]} numberOfLines={2}>
                  {t.subject}
                </Text>
                {t.lastMessage ? (
                  <View style={{ marginTop: 6, backgroundColor: t.lastMessage.role === 'admin' ? colors.tint2 : colors.canvas, borderRadius: 10, padding: 8 }}>
                    <Text variant="tiny" color={colors.ink2} numberOfLines={2} style={{ lineHeight: 16 }}>
                      <Text variant="tiny" color={t.lastMessage.role === 'admin' ? colors.greenText : colors.ink} style={font.bold}>
                        {t.lastMessage.role === 'admin' ? 'Team: ' : 'You: '}
                      </Text>
                      {t.lastMessage.body}
                    </Text>
                  </View>
                ) : null}
                <Text variant="tiny" color={colors.muted} style={{ marginTop: 6 }}>
                  Updated {fmtDate(t.updatedAt)}
                  {t.child ? ` · ${t.child.code}` : ''}
                </Text>
              </View>
            </View>
          </Box>
        );
      })}
    </Page>
  );
}

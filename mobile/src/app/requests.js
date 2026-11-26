/**
 * My requests — sponsorships and payment slips sent for approval, with the
 * donor's own note and the admin's decision and note.
 */
import { useCallback, useState } from 'react';
import { Linking, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { Button } from '../components/ui';
import { Box, ChildPhoto, Empty, ErrorNote, LinkText, Loading, Page, Stat, StatusPill, font } from '../components/donor/Kit';
import { colors } from '../theme/tokens';
import { fmtDate, pkr, useCachedState, viewUrl } from '../lib/donorApp';

const STRIPE = { pending: colors.orange, approved: colors.green, rejected: '#D92D20' };

/** Sent → Checking → Approved / Rejected */
function Progress({ status }) {
  const steps = ['Sent', 'Checking', status === 'rejected' ? 'Rejected' : 'Approved'];
  const reached = status === 'pending' ? 1 : 2;
  const end = status === 'rejected' ? '#D92D20' : colors.green;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
      {steps.map((s, i) => {
        const on = i <= reached;
        const c = i === 2 && on ? end : on ? colors.green : colors.hairline;
        return (
          <View key={s} style={{ flex: i < 2 ? 1 : 0, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}>
                {on ? <Icon name={i === 2 && status === 'rejected' ? 'x' : 'check'} size={11} color={colors.white} strokeWidth={3} /> : null}
              </View>
              <Text variant="tiny" color={on ? colors.ink2 : colors.muted2} style={[font.medium, { fontSize: 10, marginTop: 3 }]}>
                {s}
              </Text>
            </View>
            {i < 2 ? <View style={{ flex: 1, height: 2, backgroundColor: i < reached ? colors.green : colors.hairline, marginHorizontal: 4, marginBottom: 14 }} /> : null}
          </View>
        );
      })}
    </View>
  );
}

export default function RequestsScreen() {
  const router = useRouter();
  const { signedIn, user } = useAuth();
  const [list, setList] = useCachedState(`requests:${user?.id}`);
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      setError(null);
      if (!signedIn) return;
      api
        .myRequests()
        .then((r) => setList(r.requests))
        .catch((e) => setError(e.message));
    }, [signedIn, setList]),
  );

  const count = (s) => (list || []).filter((r) => r.status === s).length;

  return (
    <Page title="My requests" subtitle="Sponsorships and payments sent for approval" back tab="donations">
      <ErrorNote message={error} />
      {!list && !error ? <Loading /> : null}
      {list && list.length ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Stat icon="clock" label="Waiting" value={String(count('pending'))} tone="orange" />
          <Stat icon="check" label="Approved" value={String(count('approved'))} tone="green" />
          <Stat icon="x" label="Rejected" value={String(count('rejected'))} tone="red" />
        </View>
      ) : null}
      {list && list.length === 0 ? (
        <Empty
          icon="clock"
          title="No requests yet"
          text="When you sponsor a child or send a payment slip, it appears here until our team approves it."
          action={<Button label="See children" icon="heart" onPress={() => router.push('/orphans/all')} />}
        />
      ) : null}
      {list?.map((r) => (
        <Box key={r.id} style={{ marginTop: 12, paddingLeft: 18, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: STRIPE[r.status] || colors.hairline }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name={r.kind === 'sponsorship' ? 'heart' : 'wallet'} size={14} color={colors.green} strokeWidth={2.2} />
              <Text variant="tiny" color={colors.ink2} style={[font.bold, { textTransform: 'uppercase', letterSpacing: 0.4 }]}>
                {r.kind === 'sponsorship' ? 'New sponsorship' : 'Monthly donation'}
              </Text>
            </View>
            <StatusPill status={r.status} label={r.status === 'pending' ? 'Waiting' : undefined} />
          </View>

          {r.children.map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <ChildPhoto uri={c.photoUrl} name={c.name} size={44} radius={13} />
              <View style={{ flex: 1 }}>
                <Text variant="tiny" color={colors.greenText} style={font.bold}>
                  {c.code}
                </Text>
                <Text variant="caption" color={colors.ink} style={font.semi} numberOfLines={1}>
                  {c.name}
                </Text>
              </View>
            </View>
          ))}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, backgroundColor: colors.canvas, borderRadius: 12, padding: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Icon name="calendar" size={14} color={colors.muted} />
              <Text variant="tiny" color={colors.ink2} numberOfLines={2} style={{ flex: 1 }}>
                {r.monthLabels.map((m) => m.slice(0, 3)).join(', ')} {r.year}
              </Text>
            </View>
            <Text variant="bodyStrong" color={colors.greenText} style={font.bold}>
              {pkr(r.amountPkr)}
            </Text>
          </View>

          <Progress status={r.status} />

          {r.note ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, backgroundColor: colors.tint2, borderRadius: 12, padding: 10 }}>
              <Icon name="note" size={15} color={colors.greenText} />
              <Text variant="tiny" color={colors.ink2} style={{ flex: 1, lineHeight: 17 }}>
                <Text variant="tiny" color={colors.greenText} style={font.bold}>
                  Your note:{' '}
                </Text>
                {r.note}
              </Text>
            </View>
          ) : null}
          {r.adminNote ? (
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                marginTop: 8,
                backgroundColor: r.status === 'rejected' ? '#FDECEE' : '#EEF4FF',
                borderRadius: 12,
                padding: 10,
              }}
            >
              <Icon name="shield" size={15} color={r.status === 'rejected' ? '#B42318' : '#1D4ED8'} />
              <Text variant="tiny" color={r.status === 'rejected' ? '#B42318' : '#1D4ED8'} style={{ flex: 1, lineHeight: 17 }}>
                <Text variant="tiny" color={r.status === 'rejected' ? '#B42318' : '#1D4ED8'} style={font.bold}>
                  Team note:{' '}
                </Text>
                {r.adminNote}
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <Text variant="tiny" color={colors.muted}>
              Sent {fmtDate(r.createdAt)}
              {r.decidedAt ? ` · ${r.status === 'rejected' ? 'Rejected' : 'Approved'} ${fmtDate(r.decidedAt)}` : ''}
            </Text>
            {r.slipUrl ? <LinkText onPress={() => Linking.openURL(viewUrl(r.slipUrl))}>View my slip</LinkText> : null}
          </View>
        </Box>
      ))}
    </Page>
  );
}

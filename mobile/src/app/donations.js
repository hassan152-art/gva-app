/**
 * Donor's donations: a 12-month tracker per child, monthly invoices
 * (paid / unpaid), payments received with the donor's note, and the running
 * ledger — the same data as the web Sponsor Ledger.
 */
import { useCallback, useMemo, useState } from 'react';
import { Linking, RefreshControl, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { Button } from '../components/ui';
import {
  BandCard,
  Box,
  ChildPhoto,
  ChoiceChip,
  Empty,
  ErrorNote,
  LinkText,
  Loading,
  MonthTracker,
  Page,
  Stat,
  StatusPill,
  Tabs,
  TrackerLegend,
  font,
} from '../components/donor/Kit';
import { colors } from '../theme/tokens';
import { fmtDate, pkr, viewUrl } from '../lib/donorApp';

const STRIPE = { paid: colors.green, partial: colors.orange, unpaid: '#D92D20' };
const num = (v) => Math.round(v || 0).toLocaleString('en-US');

export default function DonationsScreen() {
  const router = useRouter();
  const { signedIn } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('months');
  const [refreshing, setRefreshing] = useState(false);
  const [childFilter, setChildFilter] = useState('all');
  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    setError(null);
    if (!signedIn) return; // the sign-in redirect is on its way
    try {
      setData(await api.appLedger());
    } catch (e) {
      setError(e.message);
    }
  }, [signedIn]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const invoices = useMemo(() => {
    const list = (data?.invoices || []).filter((i) => childFilter === 'all' || i.orphanId === childFilter);
    return [...list].sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month) || a.childCode.localeCompare(b.childCode));
  }, [data, childFilter]);
  const pendingMonths = (data?.invoices || []).filter((i) => i.status !== 'paid').length;
  const shownChildren = (data?.children || []).filter((c) => childFilter === 'all' || c.id === childFilter);
  const has = Boolean(data?.sponsorCode);

  return (
    <Page
      band
      title="Donations"
      subtitle={has ? `Sponsor ID ${data.sponsorCode}` : 'Your monthly kafalat'}
      tab="donations"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
      bandExtra={
        has ? (
          <BandCard style={{ flexDirection: 'row', alignItems: 'center', marginBottom: -46 }}>
            <View style={{ flex: 1 }}>
              <Text variant="tiny" color={colors.muted}>
                Total given
              </Text>
              <Text variant="h2" color={colors.greenText} style={font.bold} numberOfLines={1} adjustsFontSizeToFit>
                {pkr(data.totals?.paidPkr)}
              </Text>
            </View>
            <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.hairline2, marginHorizontal: 12 }} />
            <View style={{ flex: 1 }}>
              <Text variant="tiny" color={colors.muted}>
                Balance due
              </Text>
              <Text variant="h2" color={data.totals?.balancePkr ? '#B42318' : colors.ink} style={font.bold} numberOfLines={1} adjustsFontSizeToFit>
                {pkr(data.totals?.balancePkr)}
              </Text>
            </View>
          </BandCard>
        ) : undefined
      }
    >
      {has ? <View style={{ height: 40 }} /> : null}
      <ErrorNote message={error} />
      {!data && !error ? <Loading /> : null}
      {data && !has ? (
        <Empty
          icon="receipt"
          title="No donations yet"
          text="When you sponsor a child and your first payment is approved, your monthly donations appear here."
          action={
            <View style={{ gap: 10 }}>
              <Button label="Sponsor a child" icon="heart" onPress={() => router.push('/orphans/all')} />
              <Button label="My requests" kind="secondary" onPress={() => router.push('/requests')} />
            </View>
          }
        />
      ) : null}

      {has ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Stat icon="calendar" label="Pending months" value={String(pendingMonths)} tone={pendingMonths ? 'orange' : 'green'} />
            <Stat icon="users" label="Children" value={String(data.children?.length || 0)} tone="blue" />
            <Stat icon="receipt" label="Payments" value={String(data.history.length)} tone="green" />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <Button label="Pay now" icon="wallet" height={48} onPress={() => router.push('/give?kind=payment')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="My requests" icon="clock" kind="secondary" height={48} onPress={() => router.push('/requests')} />
            </View>
          </View>

          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { key: 'months', label: 'Months' },
              { key: 'payments', label: `Payments (${data.history.length})` },
              { key: 'ledger', label: 'Ledger' },
            ]}
          />

          {tab === 'months' ? (
            <>
              {data.children.length > 1 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
                  <ChoiceChip label="All children" on={childFilter === 'all'} onPress={() => setChildFilter('all')} />
                  {data.children.map((c) => (
                    <ChoiceChip key={c.id} label={c.code} on={childFilter === c.id} onPress={() => setChildFilter(c.id)} />
                  ))}
                </View>
              ) : null}

              {shownChildren.map((c) => (
                <Box key={c.id} style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <ChildPhoto uri={c.photoUrl} name={c.name} size={40} radius={12} />
                    <View style={{ flex: 1 }}>
                      <Text variant="caption" color={colors.ink} style={font.bold} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text variant="tiny" color={colors.muted}>
                        {c.code} · {year}
                      </Text>
                    </View>
                  </View>
                  <MonthTracker invoices={(data.invoices || []).filter((i) => i.orphanId === c.id)} year={year} />
                  <TrackerLegend />
                </Box>
              ))}

              <Text variant="label" style={[font.bold, { marginTop: 22, marginBottom: 2 }]}>
                Monthly invoices
              </Text>
              {invoices.length === 0 ? <Empty icon="calendar" title="No months yet" /> : null}
              {invoices.map((i) => (
                <Box key={i.id} style={{ marginTop: 10, paddingVertical: 12, paddingLeft: 18, overflow: 'hidden' }}>
                  <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: STRIPE[i.status] || colors.hairline }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" style={font.bold}>
                        {i.period}
                      </Text>
                      <Text variant="tiny" color={colors.muted} numberOfLines={1}>
                        {i.childCode} · {i.childName}
                      </Text>
                    </View>
                    <StatusPill status={i.status} />
                  </View>
                  <View style={{ flexDirection: 'row', marginTop: 10, backgroundColor: colors.canvas, borderRadius: 12, padding: 10 }}>
                    {[
                      ['Donation', i.netPkr, colors.ink],
                      ['Paid', i.paidPkr, colors.greenText],
                      ['Due', i.balancePkr, i.balancePkr ? '#B42318' : colors.muted],
                    ].map(([l, v, c], idx) => (
                      <View key={l} style={{ flex: 1, alignItems: idx === 0 ? 'flex-start' : idx === 1 ? 'center' : 'flex-end' }}>
                        <Text variant="tiny" color={colors.muted}>
                          {l}
                        </Text>
                        <Text variant="caption" color={c} style={font.bold}>
                          {num(v)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {i.slips?.length ? (
                    <View style={{ marginTop: 8 }}>
                      <LinkText onPress={() => Linking.openURL(viewUrl(i.slips[0]))}>View slip</LinkText>
                    </View>
                  ) : null}
                </Box>
              ))}
            </>
          ) : null}

          {tab === 'payments' ? (
            data.history.length === 0 ? (
              <Empty icon="coins" title="No payments yet" text="Payments approved by our team show here with your note and slip." />
            ) : (
              data.history.map((h) => (
                <Box key={h.id} style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: '#EAF7EF', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="coins" size={20} color={colors.green} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="h3" color={colors.greenText} style={font.bold}>
                        {pkr(h.amountPkr)}
                      </Text>
                      <Text variant="tiny" color={colors.muted}>
                        {fmtDate(h.receivedAt)}
                        {h.receiptNo ? ` · ${h.receiptNo}` : ''}
                      </Text>
                    </View>
                    <StatusPill status="paid" label="Received" />
                  </View>
                  {h.allocations?.length ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {h.allocations.map((a, idx) => (
                        <View key={`${a.childCode}-${a.period}-${idx}`} style={{ backgroundColor: colors.canvas, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Text variant="tiny" color={colors.ink2} style={font.medium}>
                            {a.childCode} · {a.period}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {h.note ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, backgroundColor: colors.tint2, borderRadius: 12, padding: 10 }}>
                      <Icon name="note" size={15} color={colors.greenText} />
                      <Text variant="tiny" color={colors.ink2} style={{ flex: 1, lineHeight: 17 }}>
                        <Text variant="tiny" color={colors.greenText} style={font.bold}>
                          Your note:{' '}
                        </Text>
                        {h.note}
                      </Text>
                    </View>
                  ) : null}
                  {h.attachments?.length ? (
                    <View style={{ marginTop: 10 }}>
                      <LinkText onPress={() => Linking.openURL(viewUrl(h.attachments[0]))}>View slip</LinkText>
                    </View>
                  ) : null}
                </Box>
              ))
            )
          ) : null}

          {tab === 'ledger' ? (
            <Box style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', backgroundColor: colors.greenDeep, paddingHorizontal: 12, paddingVertical: 10 }}>
                {['Month', 'Invoice', 'Paid', 'Carried'].map((h, idx) => (
                  <Text key={h} variant="tiny" color={colors.white} style={[font.bold, { flex: idx === 0 ? 1.1 : 1, textAlign: idx ? 'right' : 'left' }]}>
                    {h}
                  </Text>
                ))}
              </View>
              {data.ledger.map((r, idx) => (
                <View
                  key={r.key}
                  style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: idx % 2 ? colors.canvas : colors.surface }}
                >
                  <Text variant="tiny" color={colors.ink} style={[font.semi, { flex: 1.1 }]}>
                    {r.label}
                  </Text>
                  <Text variant="tiny" color={colors.ink2} style={{ flex: 1, textAlign: 'right' }}>
                    {num(r.invoicedPkr)}
                  </Text>
                  <Text variant="tiny" color={colors.greenText} style={{ flex: 1, textAlign: 'right' }}>
                    {num(r.paidPkr)}
                  </Text>
                  <Text variant="tiny" color={r.carriedForwardPkr > 0 ? '#B42318' : colors.greenText} style={[font.bold, { flex: 1, textAlign: 'right' }]}>
                    {r.carriedForwardPkr < 0 ? `+${num(Math.abs(r.carriedForwardPkr))}` : num(r.carriedForwardPkr)}
                  </Text>
                </View>
              ))}
              <Text variant="tiny" color={colors.muted} style={{ padding: 12, lineHeight: 17 }}>
                Carried = balance still due after each month (a + means you paid in advance).
              </Text>
            </Box>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}

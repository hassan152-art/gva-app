/**
 * Home.
 *
 * Guests: what the programme is, children waiting for a sponsor, sign in.
 * Donors: their children with a 12-month tracker, totals, quick actions,
 * pending requests, and more children to sponsor.
 */
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { Button } from '../components/ui';
import {
  BandCard,
  Box,
  ChildPhoto,
  ErrorNote,
  LinkText,
  MonthTracker,
  Page,
  SectionLabel,
  StatusPill,
  font,
  shadow,
} from '../components/donor/Kit';
import { colors } from '../theme/tokens';
import { pkr } from '../lib/donorApp';

/** Horizontal carousel of children without a sponsor. */
function Waiting({ items, onOpen, onAll }) {
  if (!items?.length) return null;
  return (
    <>
      <SectionLabel icon="heart" right={<LinkText onPress={onAll}>See all</LinkText>}>
        Children waiting for a sponsor
      </SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 10, paddingTop: 2 }}
      >
        {items.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => onOpen(c.id)}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, ${c.code}`}
            style={({ pressed }) => [
              { width: 150, borderRadius: 20, backgroundColor: colors.surface, overflow: 'hidden', opacity: pressed ? 0.9 : 1 },
              shadow.card,
            ]}
          >
            <ChildPhoto uri={c.photoThumbnailUrl || c.photoUrl} name={c.name} width={150} height={150} radius={0} />
            <View style={{ padding: 10 }}>
              <Text variant="tiny" color={colors.greenText} style={font.bold}>
                {c.code}
              </Text>
              <Text variant="caption" color={colors.ink} style={[font.semi, { marginTop: 1 }]} numberOfLines={1}>
                {c.name}
              </Text>
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 1 }}>
                {[c.age != null ? `${c.age} yrs` : null, c.sex].filter(Boolean).join(' · ') || ' '}
              </Text>
              <View style={{ marginTop: 8, backgroundColor: colors.tint, borderRadius: 10, paddingVertical: 6, alignItems: 'center' }}>
                <Text variant="tiny" color={colors.greenText} style={font.bold}>
                  {c.requested ? 'Request pending' : 'Sponsor'}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

const ACTION_TONE = {
  green: ['#EAF7EF', colors.green],
  orange: ['#FFF1E6', colors.orange],
  blue: ['#EEF4FF', '#2563EB'],
  pink: ['#FDECEE', '#E11D48'],
};

function Action({ icon, label, hint, onPress, badge, tone = 'green' }) {
  const [bg, fg] = ACTION_TONE[tone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        { width: '48.3%', borderRadius: 20, padding: 14, marginBottom: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline2, opacity: pressed ? 0.88 : 1 },
        shadow.card,
      ]}
    >
      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={21} color={fg} strokeWidth={2} />
      </View>
      <Text variant="caption" color={colors.ink} style={[font.bold, { marginTop: 10 }]}>
        {label}
      </Text>
      {hint ? (
        <Text variant="tiny" color={colors.muted} style={{ marginTop: 2 }} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: colors.orangeInk,
            borderRadius: 999,
            minWidth: 22,
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 6,
          }}
        >
          <Text variant="tiny" color={colors.white} style={[font.bold, { fontSize: 11 }]}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function BandStat({ label, value, color = colors.ink, last }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 6, borderRightWidth: last ? 0 : 1, borderRightColor: colors.hairline2 }}>
      <Text variant="tiny" color={colors.muted} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="bodyStrong" color={color} style={[font.bold, { marginTop: 3 }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { signedIn, user } = useAuth();
  const [me, setMe] = useState(null);
  const [waiting, setWaiting] = useState([]);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [w, m] = await Promise.all([api.appOrphans({ pageSize: 8 }), signedIn ? api.appMe() : Promise.resolve(null)]);
      setWaiting(w.orphans);
      setMe(m);
    } catch (e) {
      setError(e.message);
    }
  }, [signedIn]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const open = (id) => router.push(`/orphan/${id}`);
  const first = (user?.fullName || me?.name || '').split(' ')[0];
  const year = new Date().getFullYear();
  const refresh = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
    />
  );

  if (!signedIn) {
    return (
      <Page
        band
        title="Gaza Virtual Adoption"
        subtitle="Sponsor an orphan in Gaza"
        tab="home"
        refreshControl={refresh}
        right={
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="heart" size={22} color={colors.white} strokeWidth={2} />
          </View>
        }
        bandExtra={
          <View>
            <Text variant="h2" color={colors.white} style={font.bold}>
              Be the family a child is waiting for
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.88)" style={{ marginTop: 6, lineHeight: 19 }}>
              Your monthly kafalat of {pkr(30000)} gives an orphan in Gaza food, schooling and care. Follow every month in the app.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Create account"
                  height={46}
                  onPress={() => router.push('/sign-up')}
                  style={{ backgroundColor: colors.white }}
                  textStyle={{ color: colors.greenDeep }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Sign in"
                  height={46}
                  onPress={() => router.push('/sign-in')}
                  style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}
                />
              </View>
            </View>
          </View>
        }
      >
        <ErrorNote message={error} />
        <SectionLabel icon="list">How it works</SectionLabel>
        <Box>
          {[
            ['heart', 'Choose a child', 'See the children waiting and their details.'],
            ['upload', 'Send & upload the slip', 'Pay into our account and upload the screenshot.'],
            ['check', 'We confirm', 'After approval the child is linked to your account.'],
          ].map(([icon, t, d], i) => (
            <View key={t} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.hairline2 }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={19} color={colors.green} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color={colors.ink} style={font.bold}>
                  {i + 1}. {t}
                </Text>
                <Text variant="tiny" color={colors.muted} style={{ marginTop: 2 }}>
                  {d}
                </Text>
              </View>
            </View>
          ))}
        </Box>
        <Waiting items={waiting} onOpen={open} onAll={() => router.push('/orphans/all')} />
      </Page>
    );
  }

  const t = me?.totals;
  return (
    <Page
      band
      title={`Assalam-o-Alaikum${first ? `, ${first}` : ''}`}
      subtitle={me?.sponsorCode ? `Sponsor ID ${me.sponsorCode}` : 'Welcome to the programme'}
      tab="home"
      refreshControl={refresh}
      bandExtra={
        <BandCard style={{ flexDirection: 'row', marginBottom: -46 }}>
          <BandStat label="Children" value={String(me?.children?.length ?? 0)} />
          <BandStat label="Total given" value={pkr(t?.paidPkr || 0)} color={colors.greenText} />
          <BandStat label="Balance due" value={pkr(t?.balancePkr || 0)} color={t?.balancePkr ? '#B42318' : colors.ink} last />
        </BandCard>
      }
    >
      <View style={{ height: 40 }} />
      <ErrorNote message={error} />

      {me?.requests?.pending ? (
        <Box
          style={{ marginTop: 12, backgroundColor: colors.orangeTint, borderColor: colors.orangeBorder, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          onPress={() => router.push('/requests')}
          accessibilityLabel="Requests waiting for approval"
        >
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="clock" size={19} color={colors.orangeInk} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.orangeText} style={font.bold}>
              {me.requests.pending} request{me.requests.pending === 1 ? '' : 's'} waiting for approval
            </Text>
            <Text variant="tiny" color={colors.orangeTextSoft}>
              Tap to see the status
            </Text>
          </View>
          <Icon name="chevron" size={18} color={colors.orangeInk} />
        </Box>
      ) : null}

      <SectionLabel icon="users" right={me?.children?.length ? <LinkText onPress={() => router.push('/donations')}>Donations</LinkText> : null}>
        My children
      </SectionLabel>
      {me && !me.children.length ? (
        <Box style={{ backgroundColor: colors.tint2, borderColor: colors.tintBorder }}>
          <Text variant="bodyStrong" style={font.bold}>
            You haven&apos;t sponsored a child yet
          </Text>
          <Text variant="caption" color={colors.muted} style={{ marginTop: 4 }}>
            Choose a child below — after your first payment is approved, they appear here.
          </Text>
          <Button label="Sponsor a child" icon="heart" onPress={() => router.push('/orphans/all')} style={{ marginTop: 12 }} />
        </Box>
      ) : null}
      {me?.children?.map((c) => (
        <Box key={c.id} style={{ marginBottom: 12 }} onPress={() => open(c.id)} accessibilityLabel={`${c.name}, ${c.code}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ChildPhoto uri={c.photoUrl} name={c.name} size={58} radius={18} />
            <View style={{ flex: 1 }}>
              <Text variant="tiny" color={colors.greenText} style={font.bold}>
                {c.code}
              </Text>
              <Text variant="bodyStrong" color={colors.ink} style={font.bold} numberOfLines={1}>
                {c.name}
              </Text>
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 1 }}>
                {c.monthsPaid} paid · {c.monthsPending} pending
                {c.balancePkr ? ` · due ${pkr(c.balancePkr)}` : ''}
              </Text>
            </View>
            {c.thisMonth ? <StatusPill status={c.thisMonth} label={c.thisMonth === 'paid' ? 'Paid' : 'Due'} /> : null}
          </View>
          <View style={{ marginTop: 12 }}>
            <Text variant="tiny" color={colors.muted} style={[font.semi, { marginBottom: 6 }]}>
              {year} months
            </Text>
            <MonthTracker invoices={c.months} year={year} compact />
          </View>
        </Box>
      ))}

      <SectionLabel icon="star">Quick actions</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Action icon="wallet" label="Pay donation" hint="Upload a payment slip" onPress={() => router.push('/give?kind=payment')} />
        <Action icon="heart" label="Sponsor a child" hint="Children waiting" tone="pink" onPress={() => router.push('/orphans/all')} />
        <Action icon="clock" label="My requests" hint="Approval status" tone="orange" badge={me?.requests?.pending || 0} onPress={() => router.push('/requests')} />
        <Action icon="help" label="Complaints" hint="Talk to our team" tone="blue" badge={me?.tickets?.pending || 0} onPress={() => router.push('/tickets')} />
      </View>

      <Waiting items={waiting} onOpen={open} onAll={() => router.push('/orphans/all')} />
    </Page>
  );
}

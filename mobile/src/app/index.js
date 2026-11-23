/**
 * Home — light-theme dashboard (Mobbin: Blinkit Feeding India carousel,
 * Turo gift-card promo, PayPal amount chips).
 */
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radii, space } from '../theme/tokens';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { HomeIndicator, StatusBarMock, TabBar, navigateTab, LogoLockup } from '../components/chrome';
import { Button, Card } from '../components/ui';
import { orphanPosterUri } from '../lib/orphanMedia';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useInAppNotifications } from '../hooks/useInAppNotifications';
import { useOfficialOrphans } from '../hooks/useOfficialOrphans';
import { SponsorChildCarousel } from '../components/sponsor/SponsorOrphanCards';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signedIn, restoring } = useAuth();
  const firstName = user?.firstName || 'Fardeen';
  const initial = user?.initial || 'F';

  const [impact, setImpact] = useState(null);
  const [orphans, setOrphans] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const {
    orphans: sponsorPreview,
    totals: sponsorTotals,
    reload: reloadSponsorList,
  } = useOfficialOrphans({ limit: 5, waitingOnly: true });
  const { showToast } = useToast();
  const { unreadForImpact } = useInAppNotifications();
  const unreadBell = unreadForImpact(impact);

  const load = useCallback(async () => {
    try {
      const [impactRes, orphansRes] = await Promise.all([api.impact(), api.activeOrphans()]);
      setImpact(impactRes);
      setOrphans(orphansRes.orphans || []);
      await reloadSponsorList();
    } catch (err) {
      if (err?.status === 401) return;
      showToast({ message: err.message || 'Could not refresh home', tone: 'error' });
    }
  }, [showToast, reloadSponsorList]);

  useEffect(() => {
    if (!signedIn) return;
    load();
  }, [load, signedIn]);

  if (restoring) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  }
  if (!signedIn) {
    return <Redirect href="/welcome" />;
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const list = orphans.length ? orphans : PLACEHOLDER_ORPHANS;
  const sponsorCarousel = sponsorPreview.length ? sponsorPreview : PLACEHOLDER_WAITING.slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center' }}>
      <View style={{ width: layout.width, flex: 1, maxWidth: '100%' }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{
            paddingTop: Math.max(insets.top, 12) + space.sm,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: layout.gutter,
          }}
        >
          {/* header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg }}>
            <LogoLockup width={108} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Pressable
                onPress={() => router.push('/notifications')}
                accessibilityLabel={unreadBell ? `Notifications, ${unreadBell} unread` : 'Notifications'}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="bell" size={18} color={colors.orangeInk} strokeWidth={2} />
                {unreadBell > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      paddingHorizontal: 4,
                      backgroundColor: colors.heart,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: colors.surface,
                    }}
                  >
                    <Text variant="label" color={colors.white} style={{ fontSize: 9, lineHeight: 11 }}>
                      {unreadBell > 9 ? '9+' : unreadBell}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                onPress={() => router.push('/profile')}
                accessibilityLabel="Open profile"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.greenDeep,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.surface,
                }}
              >
                <Text variant="label" color={colors.white} style={{ fontSize: 15 }}>
                  {initial}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text variant="display" style={{ marginBottom: space.xs }}>
            Welcome back, {firstName}
          </Text>
          <Text variant="body" color={colors.muted} style={{ marginBottom: space.lg, fontSize: 15 }}>
            Your monthly support keeps children in school and safe.
          </Text>

          <SectionHeader title="Our impact" subtitle="Community sponsorship progress" />
          <OurImpactCard impact={impact} />

          <SectionHeader
            title="My orphans"
            subtitle={`${list.length} ${list.length === 1 ? 'child' : 'children'} you sponsor`}
          />

          <View style={{ gap: space.sm, marginBottom: space.xl }}>
            {list.map((o, i) => (
              <MyOrphanRow key={o.id || i} orphan={o} />
            ))}
          </View>

          <View style={{ marginBottom: space.xl }}>
            <SectionHeader
              title="Sponsor a child"
              subtitle={`${sponsorTotals.totalWaiting || sponsorCarousel.length} children waiting · PKR 30,000/month`}
              action="View all"
              onAction={() => router.push('/orphans/all')}
            />
            <SponsorChildCarousel
              orphans={sponsorCarousel}
              onPressCard={() => router.push('/orphans/all')}
            />
          </View>

          <OneTimeGiftSection onGive={() => router.push('/sponsor')} />

        </ScrollView>

        <StatusBarMock />
        <TabBar active="home" onNavigate={(key) => navigateTab(router, key)} />
        <HomeIndicator />
      </View>
    </View>
  );
}

function SectionHeader({ title, subtitle, action, onAction }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: space.md }}>
      <View style={{ flex: 1, paddingRight: space.sm }}>
        <Text variant="h2" style={{ marginBottom: subtitle ? 4 : 0 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="tiny" color={colors.muted} style={{ fontSize: 13 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text variant="label" color={colors.green} style={{ fontSize: 14 }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function OurImpactCard({ impact }) {
  const sponsored = impact?.communityProgress?.sponsored ?? 700;
  const goal = impact?.communityProgress?.goal ?? 7000;
  const ratio = goal > 0 ? Math.min(1, sponsored / goal) : 0;
  const pct = Math.round(ratio * 100);

  return (
    <Card style={{ marginBottom: space.xl, padding: space.lg }}>
      <Text variant="body" color={colors.muted} style={{ fontSize: 14, marginBottom: space.sm }}>
        Orphans sponsored across the programme
      </Text>
      <Text variant="h2" tabular style={{ fontSize: 22, marginBottom: space.md }}>
        {sponsored.toLocaleString('en-US')}
        <Text variant="label" color={colors.muted2} style={{ fontSize: 16 }}>
          {' '}
          out of {goal.toLocaleString('en-US')}
        </Text>
      </Text>
      <View
        style={{
          height: 10,
          borderRadius: radii.chip,
          backgroundColor: colors.trackAlt,
          overflow: 'hidden',
          marginBottom: space.sm,
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: radii.chip,
            backgroundColor: colors.green,
          }}
        />
      </View>
      <Text variant="tiny" color={colors.muted} style={{ fontSize: 12 }}>
        {pct}% of our {goal.toLocaleString('en-US')} orphan goal
      </Text>
    </Card>
  );
}

function OrphanAvatar({ orphan, size = 44, radius = 14 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: colors.tint,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {orphanPosterUri(orphan) ? (
        <Image source={{ uri: orphanPosterUri(orphan) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <Text variant="label" color={colors.greenText} style={{ fontSize: size * 0.38 }}>
          {orphan.initial || orphan.code?.slice(0, 1) || '?'}
        </Text>
      )}
    </View>
  );
}

function MyOrphanRow({ orphan }) {
  const paid = orphan.paymentStatus === 'paid';
  const statusColor = paid ? colors.greenText : colors.heart;
  const statusLabel = paid ? 'Paid' : 'Unpaid';

  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', padding: space.base }}>
      <OrphanAvatar orphan={orphan} />
      <View style={{ flex: 1, marginLeft: space.md }}>
        <Text variant="label" style={{ fontSize: 15, marginBottom: 4 }}>
          {orphan.fullName}
        </Text>
        <Text variant="tiny" color={colors.muted} style={{ fontSize: 13 }}>
          {orphan.code || '—'}
        </Text>
      </View>
      <Text variant="label" color={statusColor} style={{ fontSize: 14 }}>
        {statusLabel}
      </Text>
    </Card>
  );
}

const GIFT_AMOUNTS = [5000, 10000, 30000];

/** Turo gift-card promo + PayPal amount chips (Mobbin). */
function OneTimeGiftSection({ onGive }) {
  const [amount, setAmount] = useState(GIFT_AMOUNTS[1]);

  return (
    <View style={{ marginBottom: space.lg }}>
      <SectionHeader title="One-time gift" subtitle="Support the general fund without a monthly commitment" />
      <View
        style={{
          borderRadius: radii.card,
          backgroundColor: colors.sand,
          borderWidth: 1,
          borderColor: colors.hairline,
          padding: space.lg,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            right: -20,
            top: -28,
            width: 112,
            height: 112,
            borderRadius: 56,
            backgroundColor: colors.orangeTint,
            opacity: 0.85,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: -16,
            bottom: -24,
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: colors.tint,
            opacity: 0.9,
          }}
        />

        <View style={{ alignItems: 'center', marginBottom: space.lg }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.hairline,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: space.md,
            }}
          >
            <Icon name="spark" size={26} color={colors.greenInk} strokeWidth={1.9} />
          </View>
          <Text variant="h2" align="center" style={{ fontSize: 20, marginBottom: space.sm, maxWidth: 300 }}>
            Give a one-time gift
          </Text>
          <Text variant="body" color={colors.muted} align="center" style={{ fontSize: 14, lineHeight: 20, maxWidth: 310 }}>
            Your gift goes to verified relief work in Gaza — school fees, meals, and safe shelter.
          </Text>
        </View>

        <Text variant="label" color={colors.muted2} style={{ fontSize: 11, letterSpacing: 0.5, marginBottom: space.sm }}>
          CHOOSE AN AMOUNT
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
          {GIFT_AMOUNTS.map((pk) => {
            const selected = amount === pk;
            return (
              <Pressable
                key={pk}
                onPress={() => setAmount(pk)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: radii.buttonSm,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.green : colors.fieldBorder,
                  backgroundColor: selected ? colors.tint : colors.surface,
                  alignItems: 'center',
                }}
              >
                <Text variant="label" color={selected ? colors.greenText : colors.ink} tabular style={{ fontSize: 13 }}>
                  {pk >= 1000 ? `${pk / 1000}k` : pk}
                </Text>
                <Text variant="tiny" color={colors.muted2} style={{ fontSize: 9, marginTop: 2 }}>
                  PKR
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button
          label={`Give PKR ${amount.toLocaleString('en-US')}`}
          onPress={onGive}
          height={52}
          radius={radii.chip}
        />
      </View>
    </View>
  );
}

const PLACEHOLDER_ORPHANS = [
  { id: 'p1', code: 'OR575', fullName: 'OR575', posterUrl: null, paymentStatus: 'paid' },
  { id: 'p2', code: 'OR348', fullName: 'OR348', posterUrl: null, paymentStatus: 'unpaid' },
  { id: 'p3', code: 'OR576', fullName: 'OR576', posterUrl: null, paymentStatus: 'unpaid' },
];

const PLACEHOLDER_WAITING = [
  { id: 'w1', code: 'OR343', fullName: 'OR343', posterUrl: null, available: true, monthlyAmount: { formatted: 'PKR 30,000' } },
  { id: 'w2', code: 'OR344', fullName: 'OR344', posterUrl: null, available: true, monthlyAmount: { formatted: 'PKR 30,000' } },
  { id: 'w3', code: 'OR345', fullName: 'OR345', posterUrl: null, available: true, monthlyAmount: { formatted: 'PKR 30,000' } },
];

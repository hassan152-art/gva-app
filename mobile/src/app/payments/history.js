/**
 * 04 · Payments — donation history.
 *
 * Geometry from design/spec/04-payments-history.json:
 *   green summary card 350x112 at 20r, y=160
 *   "View by orphan" at 288.1, chips at 312
 *   date fields 170x44 at y=392, list starts y=468 with 80-tall rows, stride 88
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/tokens';
import { T } from '../../components/Abs';
import { Icon } from '../../components/Icon';
import { HomeIndicator, StatusBarMock, TabBar , navigateTab } from '../../components/chrome';
import { CalendarGlyph, PaymentsHeader } from '../../components/paymentsParts';
import { api } from '../../api/client';
import { formatAmount } from '../../lib/format';

/**
 * The design shows "12 records", "9 donations" and "PKR 150,000" together with
 * rows dated Oct 20, Oct 8 and Sep 28 — while its date fields read
 * "Oct 1, 2026 – Oct 25, 2026". Those cannot all be true of a strict range
 * filter, so the fields are treated as the *default* range the product offers
 * and the list returns the member's full giving history. That keeps the visible
 * rows, the record count and the summary figures all consistent.
 */
const DEFAULT_FROM = 'Oct 1, 2026';
const DEFAULT_TO = 'Oct 25, 2026';

export default function HistoryScreen() {
  const router = useRouter();

  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [orphans, setOrphans] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [summaryRes, listRes, orphansRes] = await Promise.all([
        api.paymentSummary(),
        api.payments(),
        api.activeOrphans(),
      ]);
      setSummary(summaryRes);
      setPayments(listRes.payments || []);
      setTotalRecords(listRes.count || (listRes.payments || []).length);
      setOrphans(orphansRes.orphans || []);
    } catch (err) {
      setError(err.message);
      setSummary(PLACEHOLDER_SUMMARY);
      setPayments(PLACEHOLDER_PAYMENTS);
      setTotalRecords(12);
      setOrphans(PLACEHOLDER_ORPHANS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Donation History lists verified donations — that is what a "View receipt"
   * action and a "Completed" pill mean. The count above the list reports every
   * record in the range (the design shows 12 records alongside 9 donations),
   * while proofs still awaiting review are surfaced on Profile.
   *
   * Verified rows are ordered by the date the donation was made, newest first,
   * which is the order the design shows.
   */
  const visible = useMemo(() => {
    const verified = payments
      .filter((p) => p.status === 'completed')
      .slice()
      .sort((a, b) => (a.paidOn < b.paidOn ? 1 : a.paidOn > b.paidOn ? -1 : 0));
    if (filter === 'all') return verified;
    return verified.filter((p) => p.orphans.some((name) => name.startsWith(filter)));
  }, [payments, filter]);

  const chips = useMemo(() => {
    const named = orphans.slice(0, 2).map((o) => o.firstName);
    return named;
  }, [orphans]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center' }}>
      <View style={{ width: 390, flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ height: 1000, paddingBottom: 120 }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 1000 }}>
            <PaymentsHeader active={1} onChange={(i) => i === 0 && router.push('/payments/multi-pay')} batchLabel={null} />

            {/* giving summary — 350x112 r20 at y=160 */}
            <View style={{ position: 'absolute', left: 20, top: 160, width: 350, height: 112, borderRadius: 20, backgroundColor: '#0F7F4A', overflow: 'hidden' }}>
              <View style={{ position: 'absolute', left: 0, top: 0, width: 350, height: 80, backgroundColor: '#0E7444', opacity: 0.55 }} />
            </View>
            <T t="Giving summary" x={36} y={173.5} w={140} h={13} fs={11} fw="Semi Bold" ls={0.3} color="#C7EBD6" />
            <T
              t={`PKR ${formatAmount(summary?.totalGiven?.amount ?? 150000)}`}
              x={36}
              y={188.8}
              w={240}
              h={29}
              fs={24}
              fw="Semi Bold"
              ls={-0.7}
              color={colors.white}
              tabular
            />
            <T t="Total given across all orphans" x={36} y={219.7} w={200} h={13} fs={10.5} color="#BCE3CC" />
            <View style={{ position: 'absolute', left: 36, top: 240, width: 318, height: 1, backgroundColor: colors.white, opacity: 0.18 }} />
            <T t={`${summary?.donations ?? 9} donations`} x={36} y={249.5} w={100} h={13} fs={11} fw="Semi Bold" color={colors.white} />
            <T
              t={`PKR ${formatAmount(summary?.averagePerMonth?.amount ?? 50000)} avg / month`}
              x={200}
              y={249.5}
              w={154}
              h={13}
              fs={11}
              fw="Medium"
              color="#C7EBD6"
              align="right"
              tabular
            />
            {/* the three dots in the card's top-right */}
            <View style={{ position: 'absolute', left: 338.4, top: 174.4, width: 3.2, height: 3.2, borderRadius: 1.6, backgroundColor: colors.white, opacity: 0.35 }} />
            <View style={{ position: 'absolute', left: 345.4, top: 174.4, width: 3.2, height: 3.2, borderRadius: 1.6, backgroundColor: colors.white, opacity: 0.35 }} />
            <View style={{ position: 'absolute', left: 352.4, top: 174.4, width: 3.2, height: 3.2, borderRadius: 1.6, backgroundColor: colors.white, opacity: 0.35 }} />

            {/* view by orphan */}
            <T t="View by orphan" x={20} y={288.1} w={140} h={15} fs={12} fw="Semi Bold" />
            <T t="Combined history" x={230} y={289.7} w={112} h={13} fs={10.5} fw="Medium" color="#7B8794" align="right" />

            {/* chips — 30 tall, r15 */}
            <Chip x={20} label="All orphans" active={filter === 'all'} dot onPress={() => setFilter('all')} width={109.47} />
            {chips[0] ? (
              <Chip
                x={137.5}
                label={chips[0]}
                active={filter === chips[0]}
                dot
                onPress={() => setFilter(filter === chips[0] ? 'all' : chips[0])}
                width={70.49}
              />
            ) : null}
            {chips[1] ? (
              <Chip
                x={216}
                label={chips[1]}
                active={filter === chips[1]}
                dot
                onPress={() => setFilter(filter === chips[1] ? 'all' : chips[1])}
                width={76.99}
              />
            ) : null}
            <Chip x={300.9} label={`+${Math.max(0, 24 - chips.length)}`} active={false} width={46.7} />

            {/* date range — two 170x44 r11 fields at y=392 */}
            <View style={{ position: 'absolute', left: 20, top: 392, width: 170, height: 44, borderRadius: 11, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
            <CalendarGlyph x={32} y={404} />
            <T t="From date" x={55} y={405} w={80} h={11} fs={9.5} fw="Medium" color="#9AA5B1" />
            <T t={DEFAULT_FROM} x={55} y={417.7} w={110} h={13} fs={10.5} fw="Semi Bold" />

            <View style={{ position: 'absolute', left: 200, top: 392, width: 170, height: 44, borderRadius: 11, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
            <CalendarGlyph x={212} y={404} />
            <T t="To date" x={235} y={405} w={80} h={11} fs={9.5} fw="Medium" color="#9AA5B1" />
            <T t={DEFAULT_TO} x={235} y={417.7} w={110} h={13} fs={10.5} fw="Semi Bold" />

            <T
              t={`${totalRecords} records`}
              x={20}
              y={445.7}
              w={120}
              h={13}
              fs={10.5}
              fw="Medium"
              color={colors.muted2}
            />
            <T t="Newest first" x={262} y={445.7} w={92} h={13} fs={10.5} fw="Medium" color={colors.muted2} align="right" />

            {/* history rows — 350x80 r16, stride 88 from y=468 */}
            {visible.slice(0, 6).map((p, i) => (
              <HistoryRow key={p.id} y={468 + i * 88} payment={p} />
            ))}

            {loading && payments.length === 0 ? (
              <View style={{ position: 'absolute', left: 0, top: 480, width: 390, alignItems: 'center' }}>
                <ActivityIndicator color={colors.green} />
              </View>
            ) : null}
            {error ? <T t={error} x={20} y={470} w={350} h={13} fs={10} color={colors.heart} align="center" /> : null}
          </View>
        </ScrollView>

        <StatusBarMock />
        <TabBar
          active="payments"
          onNavigate={(key) => navigateTab(router, key)}
        />
        <HomeIndicator />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ parts */

function Chip({ x, label, active, dot, onPress, width }) {
  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: x,
          top: 312,
          width,
          height: 30,
          borderRadius: 15,
          backgroundColor: active ? colors.green : colors.surface,
          borderWidth: active ? 0 : 1,
          borderColor: colors.hairline,
        }}
      />
      {dot ? (
        <View style={{ position: 'absolute', left: x + 11, top: 324, width: 6, height: 6, borderRadius: 3, backgroundColor: active ? colors.white : colors.greenInk }} />
      ) : null}
      <T
        t={label}
        x={x + (dot ? 23 : 13)}
        y={319.8}
        w={width - (dot ? 30 : 20)}
        h={14}
        fs={11.5}
        fw={active ? 'Semi Bold' : 'Medium'}
        color={active ? colors.white : '#5B6773'}
      />
      <Pressable onPress={onPress} style={{ position: 'absolute', left: x, top: 312, width, height: 30 }} accessibilityRole="button" accessibilityLabel={label} />
    </>
  );
}

function HistoryRow({ y, payment }) {
  return (
    <>
      <View style={{ position: 'absolute', left: 20, top: y, width: 350, height: 80, borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
      <View style={{ position: 'absolute', left: 32, top: y + 15, width: 34, height: 34, borderRadius: 11, backgroundColor: colors.tint }} />
      <View style={{ position: 'absolute', left: 41, top: y + 24 }}>
        <Icon name={payment.icon || 'card'} size={16} color={colors.greenInk} strokeWidth={1.95} />
      </View>

      <T t={payment.title} x={78} y={y + 17} w={190} h={15} fs={12.5} fw="Semi Bold" ls={-0.15} />

      {/* status pill — 62x17 r8.5 */}
      <View style={{ position: 'absolute', left: 78, top: y + 38, width: 62, height: 17, borderRadius: 8.5, backgroundColor: payment.status === 'completed' ? colors.successTint : '#FFF4E5' }} />
      <View style={{ position: 'absolute', left: 84.8, top: y + 44.3, width: 4.4, height: 4.4, borderRadius: 2.2, backgroundColor: payment.status === 'completed' ? colors.greenInk : colors.orangeInk }} />
      <T
        t={payment.statusLabel}
        x={93}
        y={y + 41.5}
        w={46}
        h={10}
        fs={8.4}
        fw="Semi Bold"
        color={payment.status === 'completed' ? colors.greenText : colors.orangeInk}
      />

      <T t={payment.subtitle || ''} x={146} y={y + 40} w={130} h={12} fs={9.8} color={colors.muted} />
      <T t={payment.dateLabel} x={78} y={y + 61} w={110} h={11} fs={9.5} color={colors.muted2} />
      <T t={payment.amount.formatted} x={250} y={y + 19} w={104} h={15} fs={12.5} fw="Semi Bold" ls={-0.2} align="right" tabular />
      <T t="View receipt" x={290} y={y + 41} w={64} h={11} fs={9.5} fw="Semi Bold" color={colors.green} align="right" />
    </>
  );
}

/* ------------------------------------------------------- offline fallbacks */

const PLACEHOLDER_SUMMARY = {
  totalGiven: { amount: 150000, formatted: 'PKR 150,000' },
  donations: 9,
  averagePerMonth: { amount: 50000, formatted: 'PKR 50,000' },
};

const PLACEHOLDER_ORPHANS = [
  { id: 'o1', firstName: 'Ahmad' },
  { id: 'o2', firstName: 'Fatima' },
];

const PLACEHOLDER_PAYMENTS = [
  {
    id: 'h1',
    icon: 'card',
    title: 'Monthly sponsorship',
    status: 'completed',
    statusLabel: 'Completed',
    subtitle: 'All sponsored · 3 orphans',
    dateLabel: 'Oct 20, 2026',
    amount: { amount: 30000, formatted: 'PKR 30,000' },
    orphans: ['Ahmad Hassan'],
  },
  {
    id: 'h2',
    icon: 'star',
    title: 'Special campaign',
    status: 'completed',
    statusLabel: 'Completed',
    subtitle: 'Ahmad Hassan',
    dateLabel: 'Oct 8, 2026',
    amount: { amount: 10000, formatted: 'PKR 10,000' },
    orphans: ['Ahmad Hassan'],
  },
  {
    id: 'h3',
    icon: 'heart',
    title: 'One-time gift',
    status: 'completed',
    statusLabel: 'Completed',
    subtitle: 'General fund',
    dateLabel: 'Sep 28, 2026',
    amount: { amount: 5000, formatted: 'PKR 5,000' },
    orphans: [],
  },
];

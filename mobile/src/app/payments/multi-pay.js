/**
 * 03 · Payments — multi-pay.
 *
 * Geometry from design/spec/03-payments-multi-pay.json. The sticky summary
 * block starts at y=540 (hairline at 540, sheet content from 568) and the
 * primary CTA sits at y=678, above the 760 tab bar.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../theme/tokens';
import { T } from '../../components/Abs';
import { Icon } from '../../components/Icon';
import { HomeIndicator, StatusBarMock, TabBar , navigateTab } from '../../components/chrome';
import { PaymentsHeader, Tick } from '../../components/paymentsParts';
import { ProofSheet } from '../../components/ProofSheet';
import { api } from '../../api/client';
import { formatAmount } from '../../lib/format';

const DEFAULT_AMOUNT = 30000;

export default function MultiPayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [orphans, setOrphans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // selection state: orphanId -> amount (undefined = not selected)
  const [selection, setSelection] = useState({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const { orphans: rows } = await api.activeOrphans();
      const list = rows || [];
      setOrphans(list);
      // Start with everything selected at the design's default amount.
      const initial = {};
      for (const o of list) initial[o.id] = DEFAULT_AMOUNT;
      setSelection(initial);
    } catch (err) {
      setError(err.message);
      setOrphans(PLACEHOLDER);
      const initial = {};
      for (const o of PLACEHOLDER) initial[o.id] = DEFAULT_AMOUNT;
      setSelection(initial);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Deep link: /payments/multi-pay?sheet=proof opens the proof sheet (frame 05).
  useEffect(() => {
    if (params.sheet === 'proof') setSheetOpen(true);
  }, [params.sheet]);

  const selectedIds = useMemo(
    () => Object.keys(selection).filter((id) => selection[id] > 0),
    [selection]
  );
  const total = useMemo(
    () => selectedIds.reduce((sum, id) => sum + (selection[id] || 0), 0),
    [selectedIds, selection]
  );
  const allSelected = orphans.length > 0 && selectedIds.length === orphans.length;
  const minimum = 30000;
  const meetsMinimum = total >= minimum;

  function toggle(id) {
    setSelection((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = DEFAULT_AMOUNT;
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelection({});
    } else {
      const next = {};
      for (const o of orphans) next[o.id] = DEFAULT_AMOUNT;
      setSelection(next);
    }
  }

  const allocations = selectedIds.map((id) => ({
    orphanId: Number(id),
    amount: selection[id],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center' }}>
      <View style={{ width: 390, flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ height: 560 }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 560 }}>
            <PaymentsHeader active={0} onChange={(i) => i === 1 && router.push('/payments/history')} />

            <T t="Select orphans & enter amount" x={20} y={157.1} w={250} h={16} fs={13.5} fw="Semi Bold" ls={-0.2} />
            <T t="Each child is sponsored monthly" x={20} y={177.7} w={240} h={13} fs={10.5} color={colors.muted} />

            {/* minimum-order notice — 350x34 r10 at y=202 */}
            <View style={{ position: 'absolute', left: 20, top: 202, width: 350, height: 34, borderRadius: 10, backgroundColor: '#F4F8F5' }} />
            <View style={{ position: 'absolute', left: 32, top: 211 }}>
              <Icon name="check" size={14} color={colors.greenInk} strokeWidth={2.4} />
            </View>
            <T t="Minimum order PKR 30,000" x={52} y={212.7} w={200} h={13} fs={10.5} fw="Medium" color="#4B6152" />
            <T t="Met" x={334} y={213.4} w={20} h={12} fs={10} fw="Semi Bold" color={colors.greenText} align="right" />

            {/* select all — 350x44 r12 at y=250 */}
            <Pressable onPress={toggleAll} style={{ position: 'absolute', left: 20, top: 250, width: 350, height: 44, borderRadius: 12, backgroundColor: colors.fieldAlt }} />
            <Tick x={32} y={262} checked={allSelected} />
            <T t="Select all" x={62} y={264.9} w={100} h={15} fs={12.5} fw="Semi Bold" />
            <T
              t={`${selectedIds.length} of ${orphans.length} selected`}
              x={250}
              y={266.7}
              w={104}
              h={13}
              fs={10.5}
              fw="Medium"
              color={colors.muted}
              align="right"
            />
            <Pressable
              onPress={toggleAll}
              style={{ position: 'absolute', left: 20, top: 250, width: 350, height: 44 }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: allSelected }}
              accessibilityLabel="Select all children"
            />

            {/* orphan rows — 350x66 r14, stride 74, first at y=306 */}
            {orphans.map((o, i) => {
              const y = 306 + i * 74;
              const checked = Boolean(selection[o.id]);
              return (
                <View key={o.id}>
                  <View style={{ position: 'absolute', left: 20, top: y, width: 350, height: 66, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
                  <Pressable
                    onPress={() => toggle(o.id)}
                    style={{ position: 'absolute', left: 20, top: y, width: 250, height: 66 }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={o.fullName}
                  />
                  <Tick x={31} y={y + 23} checked={checked} />
                  <View style={{ position: 'absolute', left: 62, top: y + 11, width: 44, height: 44, borderRadius: 14, backgroundColor: colors.tint }} />
                  <T t={o.initial} x={62} y={y + 24} w={44} h={18} fs={15} fw="Semi Bold" color={colors.greenText} align="center" />
                  <T t={o.fullName} x={114} y={y + 19} w={160} h={15} fs={12.5} fw="Semi Bold" ls={-0.15} />
                  <T t={o.metaShort} x={114} y={y + 37.3} w={160} h={12} fs={10.2} color={colors.muted} />

                  {/* amount input — 70x34 r9 at x=280 */}
                  <View style={{ position: 'absolute', left: 280, top: y + 16, width: 70, height: 34, borderRadius: 9, borderWidth: 1.25, borderColor: colors.fieldBorder, backgroundColor: colors.surface }} />
                  <T t="PKR" x={288} y={y + 30.8} w={16} h={9} fs={7.5} fw="Bold" ls={0.2} color="#9BA6B1" />
                  <T
                    t={checked ? formatAmount(selection[o.id]) : '0'}
                    x={290}
                    y={y + 25.5}
                    w={54}
                    h={13}
                    fs={11}
                    fw="Semi Bold"
                    ls={-0.15}
                    align="right"
                    tabular
                    color={checked ? colors.ink : colors.muted2}
                  />
                </View>
              );
            })}

            {loading && orphans.length === 0 ? (
              <View style={{ position: 'absolute', left: 0, top: 320, width: 390, alignItems: 'center' }}>
                <ActivityIndicator color={colors.green} />
              </View>
            ) : null}
            {error ? (
              <T t={error} x={20} y={440} w={350} h={13} fs={10} color={colors.heart} align="center" />
            ) : null}
          </View>
        </ScrollView>

        {/* sticky order summary — hairline at 540, CTA at 678.
            Rendered as a sibling of the ScrollView (not inside it) so it stays
            pinned while the list scrolls, and so it cannot be clipped. */}
        <View style={{ position: 'absolute', left: 0, top: 540, width: 390, height: 220, backgroundColor: colors.surface }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 1, backgroundColor: colors.hairline2 }} />
          <T t="Order summary" x={20} y={12} w={200} h={15} fs={12.5} fw="Semi Bold" />
          <T
            t={`${selectedIds.length} ${selectedIds.length === 1 ? 'orphan' : 'orphans'}`}
            x={250}
            y={13.7}
            w={104}
            h={13}
            fs={10.5}
            fw="Medium"
            color={colors.muted}
            align="right"
          />

          <T t="Base donation" x={20} y={41.5} w={160} h={13} fs={11} fw="Medium" color={colors.muted} />
          <T t={`PKR ${formatAmount(total)}`} x={250} y={40.8} w={104} h={14} fs={11.5} fw="Semi Bold" align="right" tabular />

          <T t="Platform fee" x={20} y={63.5} w={160} h={13} fs={11} fw="Medium" color={colors.muted} />
          <T t="PKR 0" x={306} y={62.8} w={48} h={14} fs={11.5} fw="Semi Bold" align="right" tabular />

          <View style={{ position: 'absolute', left: 20, top: 90, width: 334, height: 1, backgroundColor: colors.divider }} />

          <T t="Total" x={20} y={103.3} w={60} h={16} fs={13} fw="Semi Bold" />
          <T t={`PKR ${formatAmount(total)}`} x={236} y={100.3} w={118} h={21} fs={17} fw="Semi Bold" ls={-0.4} color={colors.greenText} align="right" tabular />

          <Pressable
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Submit payment proof"
            style={{
              position: 'absolute',
              left: 20,
              top: 138,
              width: 350,
              height: 50,
              borderRadius: 14,
              backgroundColor: colors.green,
              opacity: meetsMinimum ? 1 : 0.55,
            }}
          />
          <View style={{ position: 'absolute', left: 129, top: 155 }}>
            <Icon name="upload" size={17} color={colors.white} strokeWidth={2.1} />
          </View>
          <T
            t="Submit payment proof"
            x={155}
            y={154.3}
            w={190}
            h={16}
            fs={13}
            fw="Semi Bold"
            color={colors.white}
            pointerEvents="none"
          />
        </View>

        <StatusBarMock />
        <TabBar
          active="payments"
          onNavigate={(key) => navigateTab(router, key)}
        />
        <HomeIndicator />

        <ProofSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          allocations={allocations}
          total={total}
          count={selectedIds.length}
          onSubmitted={() => {
            setSheetOpen(false);
            router.push('/payments/history');
          }}
        />
      </View>
    </View>
  );
}

/** Rendered if the API is unreachable so the screen still matches the design. */
const PLACEHOLDER = [
  { id: 'p1', initial: 'A', fullName: 'Ahmad Hassan', metaShort: '8 yrs · Male' },
  { id: 'p2', initial: 'F', fullName: 'Fatima Ali', metaShort: '6 yrs · Female' },
  { id: 'p3', initial: 'O', fullName: 'Omar Yusuf', metaShort: '9 yrs · Male' },
];

/**
 * Children waiting for a sponsor — public (no login). Search by name / code,
 * tap a child to see the details and "Sponsor now".
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../../api/client';
import { Text } from '../../../components/Text';
import { Icon } from '../../../components/Icon';
import { Button } from '../../../components/ui';
import { ChildPhoto, Empty, ErrorNote, Loading, Page, font, shadow } from '../../../components/donor/Kit';
import { colors, layout } from '../../../theme/tokens';
import { pkr, useCachedState } from '../../../lib/donorApp';

export default function ChildrenScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardW = Math.floor((Math.min(width, layout.width) - 40 - 12) / 2);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  // The first page of the plain list is cached so the tab opens instantly.
  const [first, setFirst] = useCachedState('children:first');
  const [items, setItems] = useState(() => first?.items || []);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(() => first?.total || 0);
  const [monthly, setMonthly] = useState(() => first?.monthly || 30000);
  const [loading, setLoading] = useState(!first);
  const hasCache = useRef(Boolean(first));
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(
    async (p, replace) => {
      if (!(p === 1 && replace && !query && hasCache.current)) setLoading(true);
      setError(null);
      try {
        const r = await api.appOrphans({ q: query, page: p, pageSize: 20 });
        setItems((cur) => (replace ? r.orphans : [...cur, ...r.orphans]));
        setTotal(r.total);
        setMonthly(r.monthlyPkr || 30000);
        if (p === 1 && !query) setFirst({ items: r.orphans, total: r.total, monthly: r.monthlyPkr || 30000 });
        setPage(p);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [query, setFirst],
  );

  useEffect(() => {
    load(1, true);
  }, [load]);

  return (
    <Page
      band
      title="Children"
      subtitle={`${total} waiting for a sponsor · ${pkr(monthly)} / month`}
      tab="children"
      bandExtra={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.white,
            borderRadius: 16,
            paddingHorizontal: 14,
            height: 48,
          }}
        >
          <Icon name="search" size={19} color={colors.muted} strokeWidth={2} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search name or code (OR740)"
            placeholderTextColor={colors.placeholder}
            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: colors.ink, fontFamily: font.regular.fontFamily, outlineStyle: 'none' }}
            autoCapitalize="characters"
            accessibilityLabel="Search children"
          />
          {q ? (
            <Pressable onPress={() => setQ('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
              <Icon name="x" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      }
    >
      <View style={{ height: 18 }} />
      <ErrorNote message={error} />
      {!loading && items.length === 0 ? (
        <Empty
          title={query ? 'No child matches your search' : 'No children waiting right now'}
          text={query ? 'Try another name or code.' : 'Please check again soon — new children are added regularly.'}
        />
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {items.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(`/orphan/${c.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, ${c.code}`}
            style={({ pressed }) => [
              {
                width: cardW,
                marginBottom: 14,
                borderRadius: 20,
                backgroundColor: colors.surface,
                overflow: 'hidden',
                opacity: pressed ? 0.88 : 1,
              },
              shadow.card,
            ]}
          >
            <ChildPhoto uri={c.photoThumbnailUrl || c.photoUrl} name={c.name} width={cardW} height={cardW + 14} radius={0} />
            <View style={{ padding: 10 }}>
              <Text variant="tiny" color={colors.greenText} style={font.bold}>
                {c.code}
              </Text>
              <Text variant="caption" numberOfLines={1} color={colors.ink} style={[font.semi, { marginTop: 1 }]}>
                {c.name}
              </Text>
              <Text variant="tiny" color={colors.muted} style={{ marginTop: 1 }} numberOfLines={1}>
                {[c.age != null ? `${c.age} yrs` : null, c.sex].filter(Boolean).join(' · ') || ' '}
              </Text>
              <View
                style={{
                  marginTop: 8,
                  borderRadius: 10,
                  paddingVertical: 7,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 5,
                  backgroundColor: c.requested ? colors.orangeTint : colors.green,
                }}
              >
                {!c.requested ? <Icon name="heart" size={12} color={colors.white} strokeWidth={2.4} /> : null}
                <Text variant="tiny" color={c.requested ? colors.orangeInk : colors.white} style={font.bold}>
                  {c.requested ? 'Request pending' : 'Sponsor'}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {loading ? <Loading /> : null}
      {!loading && items.length < total ? (
        <Button label={`Load more (${total - items.length} more)`} kind="secondary" onPress={() => load(page + 1, false)} style={{ marginTop: 4 }} />
      ) : null}
    </Page>
  );
}

/**
 * Sponsor tab — the children who still need a sponsor.
 *
 * Layout follows the board's component language rather than a board frame,
 * because this screen has none: 20pt gutter, 350pt content column, cards at the
 * board's radii with a 1px hairline, the board's overline/heading/body type
 * scale, and one card per child (one orphan, one row) as requested.
 *
 * The carousel at the top carries the hadith and motivational content taken
 * from the official site.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii } from '../theme/tokens';
import { T } from '../components/Abs';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { Carousel } from '../components/Carousel';
import { HomeIndicator, StatusBarMock, TabBar, navigateTab } from '../components/chrome';
import { api } from '../api/client';
import { orphanPosterUri } from '../lib/orphanMedia';

export default function SponsorScreen() {
  const router = useRouter();
  const [slides, setSlides] = useState([]);
  const [orphans, setOrphans] = useState([]);
  const [totals, setTotals] = useState({ waiting: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [poster, setPoster] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [carouselRes, allRes] = await Promise.all([api.carousel(), api.allOrphans()]);
      setSlides(carouselRes.slides || []);
      const waiting = (allRes.orphans || []).filter((o) => o.available);
      setOrphans(waiting.length ? waiting : allRes.orphans || []);
      setTotals({
        waiting: allRes.totalWaiting ?? 0,
        total: allRes.totalOrphans ?? 0,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center' }}>
      <View style={{ width: 390, flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* title block — board convention: 20/600 with a muted subline */}
          <View style={{ paddingHorizontal: 20, paddingTop: 62 }}>
            <Text variant="h1" color={colors.ink}>
              Sponsor a child
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <Text variant="body" color={colors.muted} style={{ fontSize: 12, flex: 1 }}>
                {totals.waiting > 0
                  ? `${totals.waiting} children waiting for support`
                  : 'Choose a child to sponsor'}
              </Text>
              <Pressable onPress={() => router.push('/orphans/all')} hitSlop={8}>
                <Text variant="label" color={colors.green} style={{ fontSize: 13 }}>
                  All orphans
                </Text>
              </Pressable>
            </View>
          </View>

          {/* carousel: hadith + motivational content */}
          <View style={{ marginTop: 16 }}>
            <Carousel
              slides={slides}
              height={172}
              onPress={() => router.push('/payments/multi-pay')}
            />
          </View>

          {/* the list: one card per child */}
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            {loading && orphans.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={colors.green} />
              </View>
            ) : null}

            {error ? (
              <View
                style={{
                  borderRadius: radii.inner,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                  backgroundColor: colors.surface,
                  padding: 14,
                }}
              >
                <Text variant="bodyStrong" color={colors.heart}>
                  {error}
                </Text>
                <Text variant="tiny" color={colors.muted} style={{ marginTop: 4, fontSize: 10.5 }}>
                  Pull down to try again.
                </Text>
              </View>
            ) : null}

            {orphans.map((orphan) => (
              <OrphanRow
                key={orphan.id}
                orphan={orphan}
                onSponsor={() =>
                  router.push({
                    pathname: '/payments/multi-pay',
                    params: { addOrphan: orphan.id },
                  })
                }
                onOpenPoster={() => {
                  const uri = orphanPosterUri(orphan);
                  setPoster(uri ? { uri, code: orphan.code } : null);
                }}
              />
            ))}

            {!loading && !error && orphans.length === 0 ? (
              <View
                style={{
                  borderRadius: radii.inner,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                  backgroundColor: colors.tint2,
                  padding: 20,
                  alignItems: 'center',
                }}
              >
                <Icon name="heart" size={22} color={colors.greenInk} strokeWidth={1.9} />
                <Text
                  variant="bodyStrong"
                  color={colors.greenText}
                  style={{ marginTop: 10, textAlign: 'center' }}
                >
                  Every child has a sponsor
                </Text>
                <Text
                  variant="tiny"
                  color={colors.muted}
                  style={{ marginTop: 4, textAlign: 'center', fontSize: 10.5 }}
                >
                  Thank you. New children are added as they are registered.
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* full-size poster: the child's name and age are printed on it */}
        <Modal visible={Boolean(poster)} transparent animationType="fade" onRequestClose={() => setPoster(null)}>
          <View style={{ flex: 1, backgroundColor: colors.scrim, opacity: 1 }}>
            <Pressable
              onPress={() => setPoster(null)}
              accessibilityRole="button"
              accessibilityLabel="Close card"
              style={{ position: 'absolute', right: 16, top: 56, zIndex: 2, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="x" size={16} color={colors.muted} strokeWidth={2} />
            </Pressable>
            {poster ? (
              <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
                <Image
                  source={{ uri: poster.uri }}
                  style={{ width: '100%', height: '82%' }}
                  resizeMode="contain"
                  accessibilityLabel={`Orphan ${poster.code} card`}
                />
              </View>
            ) : null}
          </View>
        </Modal>

        <StatusBarMock />
        <TabBar active="sponsor" onNavigate={(key) => navigateTab(router, key)} />
        <HomeIndicator />
      </View>
    </View>
  );
}

/**
 * One child, one row card.
 *
 * The published data gives a poster JPEG per child and a code. The child's
 * name and age live *inside* that poster, so the poster is shown at a readable
 * size rather than being cropped into a thumbnail — a 74pt crop of a 1080x1528
 * poster makes the name illegible, which would defeat the point of showing it.
 *
 * Tapping the poster opens it full-screen, where the name and age are legible.
 */
function OrphanRow({ orphan, onSponsor, onOpenPoster }) {
  const posterUri = orphanPosterUri(orphan);

  return (
    <View
      style={{
        borderRadius: radii.inner,
        borderWidth: 1,
        borderColor: colors.hairline,
        backgroundColor: colors.surface,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        {/* poster — portrait, tall enough to read the printed name and age */}
        <Pressable
          onPress={posterUri ? onOpenPoster : undefined}
          accessibilityRole={posterUri ? 'imagebutton' : undefined}
          accessibilityLabel={`View ${orphan.code} card`}
          style={{
            width: 92,
            height: 128,
            borderRadius: radii.innerSm,
            overflow: 'hidden',
            backgroundColor: colors.tint,
          }}
        >
          {posterUri ? (
            <Image
              source={{ uri: posterUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              accessibilityLabel={`Orphan ${orphan.code} poster`}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="user" size={24} color={colors.greenText} strokeWidth={1.8} />
            </View>
          )}
        </Pressable>

        {/* details */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text variant="bodyStrong" color={colors.ink} style={{ fontSize: 15 }}>
              {orphan.fullName}
            </Text>
            <View
              style={{
                marginLeft: 8,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: radii.chip,
                backgroundColor: colors.successTint,
              }}
            >
              <Text variant="label" color={colors.greenText} style={{ fontSize: 8.6 }}>
                Available
              </Text>
            </View>
          </View>

          <Text variant="tiny" color={colors.muted} style={{ marginTop: 4, fontSize: 10.5 }}>
            {orphan.meta || 'Gaza · needs a sponsor'}
          </Text>

          {/* sponsorship price */}
          <Text variant="bodyStrong" color={colors.ink} style={{ marginTop: 10, fontSize: 14 }}>
            {orphan.monthlyAmount.formatted}
            <Text variant="caption" color={colors.muted2} style={{ fontSize: 9.5 }}>
              {' '}
              / month
            </Text>
          </Text>

          {posterUri ? (
            <Text
              variant="caption"
              color={colors.green}
              style={{ marginTop: 6, fontSize: 9.5 }}
              onPress={onOpenPoster}
            >
              View card
            </Text>
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={onSponsor}
        accessibilityRole="button"
        accessibilityLabel={`Sponsor Now for ${orphan.fullName}`}
        style={{
          marginTop: 12,
          height: 46,
          borderRadius: radii.buttonSm,
          backgroundColor: colors.green,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="label" color={colors.white} style={{ fontSize: 13 }}>
          Sponsor Now
        </Text>
      </Pressable>
    </View>
  );
}

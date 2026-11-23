/**
 * Full orphan roster — same source as https://gazavirtualadoption.org/orphans/all
 */
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radii, space } from '../../theme/tokens';
import { Text } from '../../components/Text';
import { Icon } from '../../components/Icon';
import { Button, Pill } from '../../components/ui';
import { useOfficialOrphans } from '../../hooks/useOfficialOrphans';
import { orphanPosterUri } from '../../lib/orphanMedia';

export default function AllOrphansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orphans, totals, loading, error, reload } = useOfficialOrphans();
  const [refreshing, setRefreshing] = useState(false);
  const [poster, setPoster] = useState(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center' }}>
      <View style={{ width: layout.width, flex: 1, maxWidth: '100%' }}>
        <View
          style={{
            paddingTop: Math.max(insets.top, 12) + space.sm,
            paddingHorizontal: layout.gutter,
            paddingBottom: space.md,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: radii.iconButton,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.hairline,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: space.md,
            }}
          >
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="chevron" size={20} color={colors.ink} strokeWidth={2} />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="h2" style={{ fontSize: 20 }}>
              All orphans
            </Text>
            <Text variant="tiny" color={colors.muted} style={{ fontSize: 12, marginTop: 2 }}>
              {totals.totalOrphans} published · {totals.totalWaiting} waiting for sponsors
            </Text>
          </View>
        </View>

        {loading && !orphans.length ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.green} />
          </View>
        ) : (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{
              paddingHorizontal: layout.gutter,
              paddingBottom: insets.bottom + space.xl,
            }}
            showsVerticalScrollIndicator={false}
          >
            {error ? (
              <Text variant="body" color={colors.heart} style={{ marginBottom: space.md }}>
                {error}
              </Text>
            ) : null}

            {orphans.map((orphan) => (
              <OrphanListCard
                key={orphan.id}
                orphan={orphan}
                onOpenPoster={() => {
                  const uri = orphanPosterUri(orphan);
                  if (uri) setPoster({ uri, code: orphan.code });
                }}
                onSponsor={() => router.push('/sponsor')}
              />
            ))}
          </ScrollView>
        )}

        <Modal visible={Boolean(poster)} transparent animationType="fade" onRequestClose={() => setPoster(null)}>
          <View style={{ flex: 1, backgroundColor: colors.scrim }}>
            <Pressable
              onPress={() => setPoster(null)}
              style={{
                position: 'absolute',
                right: 16,
                top: Math.max(insets.top, 12) + 8,
                zIndex: 2,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="x" size={16} color={colors.muted} strokeWidth={2} />
            </Pressable>
            {poster ? (
              <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: layout.gutter }}>
                <Image source={{ uri: poster.uri }} style={{ width: '100%', height: '82%' }} resizeMode="contain" />
              </View>
            ) : null}
          </View>
        </Modal>
      </View>
    </View>
  );
}

function OrphanListCard({ orphan, onOpenPoster, onSponsor }) {
  const posterUri = orphanPosterUri(orphan);
  const waiting = orphan.available !== false && !orphan.sponsored;

  return (
    <View
      style={{
        flexDirection: 'row',
        borderRadius: radii.inner,
        borderWidth: 1,
        borderColor: colors.hairline,
        backgroundColor: colors.surface,
        padding: space.md,
        marginBottom: space.md,
      }}
    >
      <Pressable
        onPress={posterUri ? onOpenPoster : undefined}
        style={{
          width: 92,
          height: 128,
          borderRadius: radii.innerSm,
          overflow: 'hidden',
          backgroundColor: colors.tint2,
        }}
      >
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={24} color={colors.greenInk} strokeWidth={1.8} />
          </View>
        )}
      </Pressable>

      <View style={{ flex: 1, marginLeft: space.md, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: 6, flexWrap: 'wrap' }}>
          <Text variant="label" style={{ fontSize: 16 }}>
            {orphan.code}
          </Text>
          <Pill label={waiting ? 'Waiting' : 'Sponsored'} tone={waiting ? 'accent' : 'success'} />
        </View>
        <Text variant="body" color={colors.muted} style={{ fontSize: 13, marginBottom: space.sm }}>
          {orphan.monthlyAmount?.formatted || 'PKR 30,000'} / month
        </Text>
        {waiting ? (
          <Button label="Sponsor" onPress={onSponsor} height={40} radius={radii.buttonSm} full={false} style={{ alignSelf: 'flex-start', minWidth: 120 }} />
        ) : null}
      </View>
    </View>
  );
}

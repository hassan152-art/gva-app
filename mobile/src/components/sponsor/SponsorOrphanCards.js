import { Image, Pressable, ScrollView, View } from 'react-native';
import { colors, layout, radii, space } from '../../theme/tokens';
import { Text } from '../Text';
import { Icon } from '../Icon';
import { orphanPosterUri } from '../../lib/orphanMedia';

export const SPONSOR_CARD_W = 156;
export const SPONSOR_CARD_H = 208;

export function SponsorCarouselCard({ orphan, onPress }) {
  const code = orphan.code || orphan.fullName || 'Child';
  const monthly = orphan.monthlyAmount?.formatted || 'PKR 30,000';
  const posterUri = orphanPosterUri(orphan);
  const waiting = orphan.available !== false && !orphan.sponsored;

  return (
    <Pressable onPress={onPress} style={{ width: SPONSOR_CARD_W }}>
      <View
        style={{
          width: SPONSOR_CARD_W,
          height: SPONSOR_CARD_H,
          borderRadius: radii.inner,
          overflow: 'hidden',
          backgroundColor: colors.canvas,
          borderWidth: 1,
          borderColor: colors.hairline,
        }}
      >
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            accessibilityLabel={`Orphan ${code} poster`}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint2 }}>
            <Icon name="user" size={32} color={colors.greenInk} strokeWidth={1.8} />
          </View>
        )}

        {waiting ? (
          <View
            style={{
              position: 'absolute',
              left: space.sm,
              top: space.sm,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radii.chip,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.orangeBorder,
            }}
          >
            <Text variant="label" color={colors.orangeInk} style={{ fontSize: 10 }}>
              Waiting
            </Text>
          </View>
        ) : null}

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: space.md,
            paddingTop: space.lg,
            paddingBottom: space.md,
            backgroundColor: 'rgba(11, 18, 32, 0.62)',
          }}
        >
          <Text variant="label" color={colors.white} style={{ fontSize: 15, marginBottom: 2 }}>
            {code}
          </Text>
          <Text variant="label" color="rgba(255,255,255,0.9)" tabular style={{ fontSize: 12 }}>
            {monthly}/mo
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function SponsorChildCarousel({ orphans, onPressCard, contentPadding = layout.gutter }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space.md, paddingRight: contentPadding }}
      style={{ marginHorizontal: -contentPadding, paddingLeft: contentPadding }}
    >
      {orphans.map((orphan, i) => (
        <SponsorCarouselCard key={orphan.id || i} orphan={orphan} onPress={() => onPressCard?.(orphan)} />
      ))}
    </ScrollView>
  );
}

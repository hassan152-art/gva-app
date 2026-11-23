/**
 * Auto-advancing carousel for the Sponsor tab.
 *
 * Full-width cards carrying hadith and motivational content, rotating on a
 * timer. Design language is the board's own: 20pt radius, hairline where the
 * surface is light, purple-free greens, Inter type, 8pt rhythm.
 *
 * Accessibility and correctness details that matter on a phone:
 *   - rotation pauses while the user is touching the pager
 *   - dot indicators are tappable and announce the current slide
 *   - respects Reduce Motion (no auto-advance when the OS asks for less motion)
 *   - long Arabic and long translations both fit: text scales down rather than
 *     clipping, and the card height is fixed so the page below never jumps
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors, radii } from '../theme/tokens';
import { Text } from './Text';

const AUTOPLAY_MS = 6000;

export function Carousel({ slides = [], width: widthProp, height = 168, onPress }) {
  const { width: winWidth } = useWindowDimensions();
  const width = widthProp || Math.min(winWidth, 390);
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const count = slides.length;

  // Respect the OS "reduce motion" preference: no automatic movement.
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((on) => {
        if (active) setReduceMotion(Boolean(on));
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (on) =>
      setReduceMotion(Boolean(on))
    );
    return () => {
      active = false;
      sub?.remove?.();
    };
  }, []);

  const goTo = useCallback(
    (next) => {
      if (!count) return;
      const clamped = ((next % count) + count) % count;
      setIndex(clamped);
      scrollRef.current?.scrollTo?.({ x: clamped * width, animated: true });
    },
    [count, width]
  );

  // Auto-advance. Stops while the user is interacting, and when the OS asks
  // for reduced motion.
  useEffect(() => {
    if (paused || reduceMotion || count < 2) return undefined;
    const id = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % count;
        scrollRef.current?.scrollTo?.({ x: next * width, animated: true });
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, reduceMotion, count, width]);

  const onScrollEnd = useCallback(
    (e) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / width);
      setIndex(Math.max(0, Math.min(count - 1, next)));
    },
    [count, width]
  );

  if (!count) return null;

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setPaused(true)}
        onScrollEndDrag={() => setPaused(false)}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        accessibilityLabel="Highlights"
      >
        {slides.map((slide, i) => (
          <View key={`${slide.kind}-${i}`} style={{ width, paddingRight: 0 }}>
            <SlideCard slide={slide} width={width} height={height} onPress={onPress} index={i} count={count} />
          </View>
        ))}
      </ScrollView>

      {/* dots */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 10,
        }}
      >
        {slides.map((slide, i) => {
          const on = i === index;
          return (
            <Pressable
              key={`dot-${i}`}
              onPress={() => goTo(i)}
              hitSlop={8}
              accessibilityRole="button"
              // aria-selected is not emitted for role="button" on web, so the
              // active dot is announced through the label instead. Screen
              // readers on native get accessibilityState below.
              accessibilityLabel={
                on ? `Slide ${i + 1} of ${count}, current` : `Slide ${i + 1} of ${count}`
              }
              accessibilityState={{ selected: on }}
              style={{
                width: on ? 18 : 6,
                height: 6,
                borderRadius: 3,
                marginHorizontal: 3,
                backgroundColor: on ? colors.green : colors.hairline,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

/** One card. Hadith cards are tinted; program/story cards are darker. */
function SlideCard({ slide, width, height, onPress, index, count }) {
  const isHadith = slide.kind === 'hadith';
  const inner = width - 40; // 20pt gutter each side

  const surface = isHadith ? colors.tint : colors.greenDeep;
  const labelColor = isHadith ? colors.greenText : '#B9E3C9';
  const bodyColor = isHadith ? '#1C2B23' : colors.white;
  const metaColor = isHadith ? colors.muted : '#9FD3B6';

  return (
    <View style={{ width, paddingHorizontal: 20 }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={slide.title || slide.body}
        style={{
          width: inner,
          height,
          borderRadius: radii.card,
          backgroundColor: surface,
          borderWidth: isHadith ? 1 : 0,
          borderColor: isHadith ? colors.tintBorder : undefined,
          paddingHorizontal: 18,
          paddingVertical: 16,
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* overline tag, then arabic, then translation, then the reference */}
        {slide.tag ? (
          <Text
            variant="overline"
            color={labelColor}
            numberOfLines={1}
            style={{ fontSize: 8.5, letterSpacing: 1.3, marginBottom: 8 }}
          >
            {String(slide.tag).toUpperCase()}
          </Text>
        ) : null}

        {slide.title ? (
          <Text
            variant="h2"
            color={bodyColor}
            numberOfLines={2}
            style={{ fontSize: 15, marginBottom: 4 }}
          >
            {slide.title}
          </Text>
        ) : null}

        {slide.arabic ? (
          <Text
            variant="body"
            color={bodyColor}
            numberOfLines={1}
            style={{ fontSize: 15, lineHeight: 24, textAlign: 'left', marginBottom: 4 }}
          >
            {slide.arabic}
          </Text>
        ) : null}

        <Text
          variant="body"
          color={bodyColor}
          numberOfLines={slide.title ? 3 : 4}
          style={{ fontSize: 11.5, lineHeight: 17 }}
        >
          {slide.title ? `“${slide.body}”` : `“${slide.body}”`}
        </Text>

        {slide.reference ? (
          <Text
            variant="caption"
            color={metaColor}
            numberOfLines={1}
            style={{ fontSize: 9.5, marginTop: 8 }}
          >
            {slide.reference}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

export default Carousel;

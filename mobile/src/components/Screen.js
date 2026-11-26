/**
 * Screen shell.
 *
 * Owns the things every screen on the board shares: the white page, the design
 * status bar / home indicator in preview mode, the tab bar, and a fixed 390pt
 * content column. Screens supply their own scrolling content.
 */
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout } from '../theme/tokens';
import { HomeIndicator, StatusBarMock, TabBar, designPreview } from './chrome';

export function Screen({
  children,
  tab,
  onNavigate,
  scrollable = true,
  scrollRef,
  onScroll,
  scrollEventThrottle,
  contentStyle,
  withTabBar = true,
  edges,
  ...rest
}) {
  const insets = useSafeAreaInsets();
  const topPad = designPreview ? 0 : insets.top;
  const bottomPad = withTabBar ? layout.navHeight + (designPreview ? 0 : insets.bottom) : insets.bottom;

  const body = (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.surface,
          paddingTop: topPad,
          paddingBottom: withTabBar ? bottomPad : 0,
          // Always fill the width (on Android a centred view without a width
          // shrinks to its content while a screen is loading). Keep a
          // phone-width column on wider web viewports.
          width: '100%',
          maxWidth: Platform.OS === 'web' ? layout.width : undefined,
          alignSelf: 'center',
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {scrollable ? (
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          {...rest}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}

      <StatusBarMock />
      {withTabBar ? (
        <TabBar active={tab} onNavigate={onNavigate} bottomInset={designPreview ? 0 : insets.bottom} />
      ) : null}
      <HomeIndicator />
    </View>
  );
}

export default Screen;

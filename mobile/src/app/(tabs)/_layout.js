/**
 * The five bottom tabs. The bar is drawn once here, so it never moves or
 * redraws when you switch tabs, and every tab stays mounted (its data and
 * scroll position are kept instead of loading again).
 */
// Same component as 'expo-router/js-tabs' (this path keeps the lint resolver happy).
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar, designPreview } from '../../components/chrome';
import { InTabsContext } from '../../components/TabsContext';
import { colors } from '../../theme/tokens';

/** Route name in this folder ↔ key used by the tab bar. */
const KEY_BY_ROUTE = {
  index: 'home',
  'orphans/all': 'children',
  donations: 'donations',
  'tickets/index': 'help',
  profile: 'profile',
};
const ROUTE_BY_KEY = Object.fromEntries(Object.entries(KEY_BY_ROUTE).map(([r, k]) => [k, r]));

/** expo-router's tab view hands the bar `navigateToTab(routeKey)`. */
function Bar({ state, navigateToTab }) {
  const insets = useSafeAreaInsets();
  const active = KEY_BY_ROUTE[state.routes[state.index]?.name] || 'home';
  return (
    <TabBar
      inline
      active={active}
      bottomInset={designPreview ? 0 : insets.bottom}
      onNavigate={(key) => {
        const route = state.routes.find((r) => r.name === ROUTE_BY_KEY[key]);
        if (route) navigateToTab(route.key);
      }}
    />
  );
}

export default function TabsLayout() {
  return (
    <InTabsContext.Provider value>
      <Tabs
        tabBar={(props) => <Bar {...props} />}
        screenOptions={{ headerShown: false, animation: 'none', sceneStyle: { backgroundColor: colors.surface } }}
        backBehavior="history"
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="orphans/all" />
        <Tabs.Screen name="donations" />
        <Tabs.Screen name="tickets/index" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </InTabsContext.Provider>
  );
}

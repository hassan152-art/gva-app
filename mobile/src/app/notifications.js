/**
 * In-app notifications — PayPal-style list + “mark all read” success toast.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { colors, layout, radii, space } from '../theme/tokens';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { HomeIndicator, TabBar, navigateTab } from '../components/chrome';
import {
  buildInAppNotifications,
  formatNotificationTime,
} from '../lib/inAppNotifications';
import { useInAppNotifications } from '../hooks/useInAppNotifications';
import { useToast } from '../hooks/useToast';

const KIND_ICON = {
  payment: { name: 'bell', bg: colors.orangeTint, color: colors.orangeInk },
  impact: { name: 'users', bg: colors.tint, color: colors.greenInk },
  gift: { name: 'heart', bg: colors.successTint, color: colors.greenText },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { readSet, markRead, markAllRead } = useInAppNotifications();
  const { showToast } = useToast();

  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.impact();
      setImpact(res);
    } catch {
      setImpact(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const notifications = useMemo(() => buildInAppNotifications(impact), [impact]);
  const unreadCount = notifications.filter((n) => !readSet.has(n.id)).length;

  function onMarkAllRead() {
    if (!notifications.length) return;
    markAllRead(notifications.map((n) => n.id));
    showToast({ message: 'All notifications marked as read.', tone: 'success' });
  }

  function openItem(item) {
    markRead(item.id);
    if (item.route) router.push(item.route);
  }

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
            accessibilityLabel="Go back"
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
              Notifications
            </Text>
            {unreadCount > 0 ? (
              <Text variant="tiny" color={colors.muted} style={{ fontSize: 12, marginTop: 2 }}>
                {unreadCount} unread
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onMarkAllRead} hitSlop={8} disabled={!notifications.length}>
            <Text
              variant="label"
              color={notifications.length ? colors.green : colors.muted2}
              style={{ fontSize: 13 }}
            >
              Mark all read
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.green} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: layout.gutter,
              paddingBottom: insets.bottom + 100,
            }}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 ? (
              <View
                style={{
                  marginTop: space.xl,
                  padding: space.xl,
                  borderRadius: radii.inner,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                  alignItems: 'center',
                }}
              >
                <Icon name="bell" size={28} color={colors.muted2} strokeWidth={1.8} />
                <Text variant="label" style={{ marginTop: space.md, fontSize: 16 }}>
                  You&apos;re all caught up
                </Text>
                <Text variant="body" color={colors.muted} align="center" style={{ marginTop: space.sm, fontSize: 14 }}>
                  Payment reminders and impact updates will show up here.
                </Text>
              </View>
            ) : (
              notifications.map((item) => {
                const unread = !readSet.has(item.id);
                const meta = KIND_ICON[item.kind] || KIND_ICON.impact;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => openItem(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      backgroundColor: colors.surface,
                      borderRadius: radii.inner,
                      borderWidth: 1,
                      borderColor: unread ? colors.tintBorder : colors.hairline,
                      padding: space.base,
                      marginBottom: space.md,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: meta.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: space.md,
                      }}
                    >
                      <Icon name={meta.name} size={20} color={meta.color} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text variant="label" style={{ flex: 1, fontSize: 15 }}>
                          {item.title}
                        </Text>
                        {unread ? (
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: colors.green,
                              marginLeft: space.sm,
                            }}
                          />
                        ) : null}
                      </View>
                      <Text variant="body" color={colors.muted} style={{ fontSize: 14, lineHeight: 20, marginBottom: 6 }}>
                        {item.body}
                      </Text>
                      <Text variant="tiny" color={colors.muted2} style={{ fontSize: 11 }}>
                        {formatNotificationTime(item.createdAt)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        )}

        <TabBar active="home" onNavigate={(key) => navigateTab(router, key)} />
        <HomeIndicator />
      </View>
    </View>
  );
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { buildInAppNotifications, countUnread } from '../lib/inAppNotifications';

const READ_KEY = 'gva.notifications.read';

const isWeb = Platform.OS === 'web';

async function loadReadIds() {
  try {
    const raw = isWeb
      ? globalThis.localStorage?.getItem(READ_KEY)
      : await SecureStore.getItemAsync(READ_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function persistReadIds(ids) {
  try {
    const payload = JSON.stringify(ids);
    if (isWeb) globalThis.localStorage?.setItem(READ_KEY, payload);
    else await SecureStore.setItemAsync(READ_KEY, payload);
  } catch {
    // Non-fatal — badge may reset on next launch.
  }
}

const NotificationContext = createContext(null);

export function InAppNotificationProvider({ children }) {
  const [readIds, setReadIds] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadReadIds().then((ids) => {
      if (!cancelled) {
        setReadIds(ids);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const markRead = useCallback((id) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      persistReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback((ids) => {
    setReadIds((prev) => {
      const merged = new Set([...prev, ...ids]);
      const next = [...merged];
      persistReadIds(next);
      return next;
    });
  }, []);

  const unreadForImpact = useCallback(
    (impact) => {
      if (!ready) return 0;
      const list = buildInAppNotifications(impact);
      return countUnread(list, readSet);
    },
    [readSet, ready]
  );

  const value = useMemo(
    () => ({
      readSet,
      markRead,
      markAllRead,
      unreadForImpact,
      ready,
    }),
    [readSet, markRead, markAllRead, unreadForImpact, ready]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useInAppNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useInAppNotifications must be used within InAppNotificationProvider');
  return ctx;
}

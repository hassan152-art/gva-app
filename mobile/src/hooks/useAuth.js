/**
 * Auth state.
 *
 * The session token lives in expo-secure-store on device. On web SecureStore
 * is unavailable, so it falls back to localStorage — the visual-parity harness
 * runs on web and needs a working session.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clearScreenCache } from '../lib/donorApp';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, configureApi } from '../api/client';

const TOKEN_KEY = 'gva.session';

const isWeb = Platform.OS === 'web';

async function readToken() {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function writeToken(value) {
  try {
    if (isWeb) {
      if (value) globalThis.localStorage?.setItem(TOKEN_KEY, value);
      else globalThis.localStorage?.removeItem(TOKEN_KEY);
      return;
    }
    if (value) await SecureStore.setItemAsync(TOKEN_KEY, value);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // A failed token write must not break the session in memory.
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);
  const tokenRef = useRef(null);

  // The API client reads the token through this ref so it never captures a
  // stale value between renders. It is updated in an effect (never during
  // render) and also written alongside every setToken below, so the ref is
  // current by the time any request is made.
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    configureApi({
      getToken: () => tokenRef.current,
      unauthorized: () => {
        tokenRef.current = null;
        setToken(null);
        setUser(null);
        writeToken(null);
      },
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await readToken();
      if (cancelled) return;
      if (stored) {
        tokenRef.current = stored;
        setToken(stored);
        try {
          const { user: me } = await api.me();
          if (!cancelled) setUser(me);
        } catch {
          // Token expired or server restarted — fall back to signed out.
          tokenRef.current = null;
          setToken(null);
          await writeToken(null);
        }
      }
      if (!cancelled) setRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { token: next, user: nextUser } = await api.login(email, password);
    tokenRef.current = next;
    setToken(next);
    setUser(nextUser);
    await writeToken(next);
    return nextUser;
  }, []);

  const register = useCallback(async (payload) => {
    const { token: next, user: nextUser } = await api.register(payload);
    tokenRef.current = next;
    setToken(next);
    setUser(nextUser);
    await writeToken(next);
    return nextUser;
  }, []);

  const signOut = useCallback(async () => {
    clearScreenCache();
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    await writeToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { user: me } = await api.me();
    setUser(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      setUser,
      restoring,
      signedIn: Boolean(token && user),
      signIn,
      register,
      signOut,
      refreshUser,
    }),
    [token, user, restoring, signIn, register, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthProvider;

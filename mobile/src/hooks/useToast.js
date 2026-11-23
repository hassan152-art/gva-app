/**
 * Global toast queue — Mobbin refs: PayPal success pill, Neo Financial top bar,
 * Fabric “Preferences updated” dark pill, Craft centered light toast.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ToastHost } from '../components/ToastHost';

const ToastContext = createContext(null);

const DEFAULT_DURATION = 3200;

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const idRef = useRef(0);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    ({ message, tone = 'success', duration = DEFAULT_DURATION } = {}) => {
      if (!message) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      idRef.current += 1;
      setToast({ message, tone, key: idRef.current });
      timerRef.current = setTimeout(hideToast, duration);
    },
    [hideToast]
  );

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toast={toast} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

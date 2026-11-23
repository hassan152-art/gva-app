import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { QuickSearchSpotlight } from '@/components/QuickSearchSpotlight';

type QuickSearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const QuickSearchContext = createContext<QuickSearchContextValue | null>(null);

export function QuickSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Shift + S (when not typing in an input/textarea)
      if (!isInput && e.shiftKey && (e.key === 'S' || e.key === 's') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // Ctrl + K or Cmd + K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

  return (
    <QuickSearchContext.Provider value={value}>
      {children}
      <QuickSearchSpotlight open={open} onOpenChange={setOpen} />
    </QuickSearchContext.Provider>
  );
}

export function useQuickSearch(): QuickSearchContextValue {
  const ctx = useContext(QuickSearchContext);
  if (!ctx) throw new Error('useQuickSearch must be used within QuickSearchProvider');
  return ctx;
}

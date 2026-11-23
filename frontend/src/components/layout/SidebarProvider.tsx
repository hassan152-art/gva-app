import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const SIDEBAR_STORAGE_KEY = 'gva_sidebar_expanded';

type SidebarContextValue = {
  expanded: boolean;
  openMobile: boolean;
  isMobile: boolean;
  setExpanded: (open: boolean) => void;
  toggleExpanded: () => void;
  setOpenMobile: (open: boolean) => void;
  toggleMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [expanded, setExpandedState] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [openMobile, setOpenMobile] = useState(false);

  const setExpanded = useCallback((open: boolean) => {
    setExpandedState(open);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpandedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toggleMobile = useCallback(() => setOpenMobile((v) => !v), []);

  useEffect(() => {
    if (!isMobile) setOpenMobile(false);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !openMobile) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isMobile, openMobile]);

  const value = useMemo(
    () => ({
      expanded,
      openMobile,
      isMobile,
      setExpanded,
      toggleExpanded,
      setOpenMobile,
      toggleMobile,
    }),
    [expanded, openMobile, isMobile, setExpanded, toggleExpanded, toggleMobile],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}

import { useCallback, useEffect, useState } from 'react';

const KEY = 'gva-theme';
export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
}

export function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0d1117' : '#149954');
}

/** Light / dark theme, remembered on this device and shared across components. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getTheme);
  useEffect(() => {
    const sync = () => setTheme(getTheme());
    window.addEventListener('gva-theme', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('gva-theme', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const toggle = useCallback(() => {
    const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event('gva-theme'));
  }, []);
  return { theme, toggle };
}

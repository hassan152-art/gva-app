import { useEffect } from 'react';
import {
  setMobileTopBarOverride,
  type MobileTopBarOverride,
} from '@/lib/mobileTopBarOverride';

/** Sets mobile header back/title while mounted (Edspire inner-page pattern). */
export function useMobilePageChrome(config: MobileTopBarOverride | null): void {
  const title = config?.title;
  const backTo = config?.backTo;
  const onBack = config?.onBack;

  useEffect(() => {
    if (config == null) {
      setMobileTopBarOverride(null);
      return;
    }
    setMobileTopBarOverride(config);
    return () => setMobileTopBarOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply when chrome fields change
  }, [title, backTo, onBack]);
}

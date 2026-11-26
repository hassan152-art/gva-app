import { createContext, useContext } from 'react';

/**
 * True for screens rendered inside the (tabs) navigator. There the bottom bar
 * lives once in the tabs layout, so screens must not draw their own copy.
 */
export const InTabsContext = createContext(false);

export function useInTabs() {
  return useContext(InTabsContext);
}

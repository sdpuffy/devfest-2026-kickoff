import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False while React hydrates the static web build's HTML, true right after (and always true on
 * phones). Screens whose first render depends on saved data can wait for it, so the browser
 * doesn't render something different from the pre-built HTML.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

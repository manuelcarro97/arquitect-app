import { useSyncExternalStore } from 'react';

/** Whether a CSS media query matches, updated when it changes (window resized, device rotated…). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

/** Phone-sized screen: the compact layout is used. Same breakpoint as the CSS. */
export const COMPACT_QUERY = '(max-width: 767px)';

export function useIsCompact(): boolean {
  return useMediaQuery(COMPACT_QUERY);
}

/** Main input is a finger (phones, tablets): touch buttons replace keyboard shortcuts and right click. */
export function useIsTouchScreen(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

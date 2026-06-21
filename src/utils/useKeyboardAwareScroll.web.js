import { useRef, useCallback } from "react";

/**
 * Web no-op: browsers manage their own keyboard/viewport, and the
 * react-native internal TextInputState path used by the native variant does
 * not resolve under react-native-web. Returns the same shape so callers can
 * spread it onto the scrolling container unconditionally.
 */
export function useKeyboardAwareScroll() {
  const scrollRef = useRef(null);
  const onScroll = useCallback(() => {}, []);
  return { scrollRef, onScroll };
}

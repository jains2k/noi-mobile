import { useRef, useEffect, useCallback } from "react";
import { Keyboard } from "react-native";
// Import the REAL TextInputState directly. Importing { TextInput } from
// "react-native" returns the native polyfill wrapper (see metro.config.js
// NATIVE_ALIASES) which drops the static `.State`, so `TextInput.State` is
// undefined on native and `TextInput.State.currentlyFocusedInput()` throws —
// silently in dev, fatally in a production/Hermes build.
import TextInputState from "react-native/Libraries/Components/TextInput/TextInputState";

/**
 * Keeps the focused text input visible above the software keyboard.
 *
 * The keyboard does not scroll the focused field into view on its own
 * (ScrollView's automaticallyAdjustKeyboardInsets only adds bottom inset).
 * When the keyboard appears we measure the focused input and scroll it above
 * the keyboard. Everything is wrapped in try/catch so keyboard handling can
 * never crash the app.
 *
 * Returns props to spread onto the scrolling container.
 */
export function useKeyboardAwareScroll() {
  const scrollRef = useRef(null);
  const scrollY = useRef(0);

  const onScroll = useCallback((e) => {
    scrollY.current = e?.nativeEvent?.contentOffset?.y ?? 0;
  }, []);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", (e) => {
      try {
        const focused = TextInputState?.currentlyFocusedInput?.();
        const sv = scrollRef.current;
        if (!focused?.measureInWindow || !sv?.scrollTo) return;
        const keyboardTop = e?.endCoordinates?.screenY;
        if (typeof keyboardTop !== "number") return;
        focused.measureInWindow((x, y, width, height) => {
          try {
            const overlap = y + height - keyboardTop + 24; // breathing room
            if (overlap > 0) {
              sv.scrollTo({ y: scrollY.current + overlap, animated: true });
            }
          } catch (err) {
            // never let keyboard handling crash the app
          }
        });
      } catch (err) {
        // never let keyboard handling crash the app
      }
    });
    return () => sub.remove();
  }, []);

  return { scrollRef, onScroll };
}

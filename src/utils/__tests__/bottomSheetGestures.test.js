import { shouldDismissBottomSheetGesture } from "@/utils/bottomSheetGestures";

describe("shouldDismissBottomSheetGesture", () => {
  test("dismisses after a clear downward pull", () => {
    expect(shouldDismissBottomSheetGesture({ dy: 96, vy: 0.2 })).toBe(true);
  });

  test("dismisses a short but fast downward flick", () => {
    expect(shouldDismissBottomSheetGesture({ dy: 32, vy: 1.4 })).toBe(true);
  });

  test("keeps the sheet open for small drags and upward gestures", () => {
    expect(shouldDismissBottomSheetGesture({ dy: 20, vy: 2 })).toBe(false);
    expect(shouldDismissBottomSheetGesture({ dy: -120, vy: -1.5 })).toBe(false);
    expect(shouldDismissBottomSheetGesture(null)).toBe(false);
  });
});

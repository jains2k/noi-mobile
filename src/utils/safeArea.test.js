import { getShellTopInset } from "./safeArea";

describe("getShellTopInset", () => {
  it("uses a conservative iOS fallback when native insets are unavailable", () => {
    expect(getShellTopInset({ top: 0 }, { platform: "ios" })).toBe(96);
  });

  it("prefers larger measured iOS insets for Dynamic Island devices", () => {
    expect(getShellTopInset({ top: 112 }, { platform: "ios" })).toBe(112);
  });

  it("uses Android status bar height when it is larger than the measured inset", () => {
    expect(
      getShellTopInset(
        { top: 12 },
        { platform: "android", statusBarHeight: 32 },
      ),
    ).toBe(32);
  });
});

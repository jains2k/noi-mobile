import { Platform, StatusBar } from "react-native";

const IOS_STATUS_BAR_CLEARANCE = 96;
const ANDROID_STATUS_BAR_CLEARANCE = 24;

/**
 * Returns the top padding needed before rendering Shell chrome.
 *
 * iOS safe-area values can briefly report 0 during startup in Expo builds, so
 * the shell keeps a conservative fallback that clears Dynamic Island devices
 * and iOS simulator status chrome while still preferring the device-reported
 * inset when it is larger.
 */
export function getShellTopInset(
  insets = {},
  {
    platform = Platform.OS,
    statusBarHeight = StatusBar.currentHeight,
  } = {},
) {
  const measuredTop = Number.isFinite(insets.top) ? insets.top : 0;

  if (platform === "ios") {
    return Math.max(measuredTop, IOS_STATUS_BAR_CLEARANCE);
  }

  return Math.max(
    measuredTop,
    statusBarHeight || ANDROID_STATUS_BAR_CLEARANCE,
  );
}

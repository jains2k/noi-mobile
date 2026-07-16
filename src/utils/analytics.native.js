import { getAnalytics, logEvent, setUserId } from "@react-native-firebase/analytics";

function analytics() {
  try {
    return getAnalytics();
  } catch {
    // Firebase remains disabled until a valid GoogleService-Info.plist is bundled.
    return null;
  }
}

/** Records a privacy-safe product event without allowing analytics to break UX. */
export async function trackEvent(name, parameters = {}) {
  const instance = analytics();
  if (!instance) return;
  try {
    await logEvent(instance, name, parameters);
  } catch (error) {
    if (__DEV__) console.warn("Firebase Analytics event failed:", error);
  }
}

/** Records both Firebase screen reporting and a feature visit for easy funnels. */
export async function trackScreen(feature) {
  await trackEvent("screen_view", {
    firebase_screen: feature,
    firebase_screen_class: feature,
  });
  await trackEvent("feature_used", { feature, action: "viewed" });
}

/** Associates events across sessions using the existing opaque application ID. */
export async function setAnalyticsUser(userId) {
  const instance = analytics();
  if (!instance) return;
  try {
    await setUserId(instance, userId ? String(userId) : null);
  } catch (error) {
    if (__DEV__) console.warn("Firebase Analytics user update failed:", error);
  }
}

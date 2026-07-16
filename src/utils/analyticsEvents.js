/**
 * Privacy-safe Firebase Analytics event helpers shared by native code and tests.
 * Event properties intentionally describe behavior, never user-authored content.
 */
export const TRACKED_SCREENS = new Set([
  "dashboard", "tasks", "journal", "focus", "calendar", "settings",
]);

/** Converts an Expo Router pathname into a stable feature name. */
export function featureFromPathname(pathname) {
  const feature = String(pathname || "").split("?")[0].replace(/^\/+|\/+$/g, "");
  return TRACKED_SCREENS.has(feature) ? feature : null;
}

/** Returns a coarse notification type without exposing task IDs or titles. */
export function notificationType(response) {
  const data = response?.notification?.request?.content?.data || {};
  if (data.planningDate || String(data.noiNotificationKey || "").startsWith("planning:")) {
    return "planning";
  }
  if (data.taskId || String(data.noiNotificationKey || "").startsWith("task:")) return "task";
  if (data.noiNotificationKey === "test") return "test";
  return "unknown";
}

/** Maps successful API writes to feature actions for aggregate usage reporting. */
export function apiFeatureEvent(endpoint, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  if (method === "GET" || method === "DELETE") return null;
  const path = String(endpoint || "").split("?")[0];
  const body = parseRequestBody(options.body);
  if (method === "POST" && path === "/api/tasks") {
    const feature = body?.planned_at != null || body?.due_date != null ? "calendar" : "tasks";
    return { feature, action: feature === "calendar" ? "task_scheduled" : "created" };
  }
  if (method === "POST" && path === "/api/journal") return { feature: "journal", action: "entry_created" };
  if (method === "POST" && path === "/api/mood") return { feature: "mood", action: "logged" };
  if (method === "POST" && path === "/api/focus") return { feature: "focus", action: "completed" };
  if (method === "POST" && path === "/api/ai") {
    const action = {
      "magic-sort": "magic_sort",
      "task-suggestion": "task_suggestion",
      "journal-reflection": "journal_reflection",
      "daily-insights": "daily_insights",
    }[body?.action];
    if (action) return { feature: "ai", action };
  }
  if (["PATCH", "PUT"].includes(method) && /^\/api\/tasks\/[^/]+$/.test(path)) {
    if (body?.status === "completed") return { feature: "tasks", action: "completed" };
    if (body?.planned_at !== undefined || body?.due_date !== undefined) {
      return { feature: "calendar", action: "task_scheduled" };
    }
  }
  return null;
}

/** Parses an API request body without ever returning or logging malformed content. */
function parseRequestBody(body) {
  if (body == null) return null;
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

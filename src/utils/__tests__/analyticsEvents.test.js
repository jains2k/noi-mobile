import {
  apiFeatureEvent,
  featureFromPathname,
  notificationType,
} from "../analyticsEvents";

describe("analytics event classification", () => {
  it("tracks only product feature routes", () => {
    expect(featureFromPathname("/journal")).toBe("journal");
    expect(featureFromPathname("/tasks?taskId=private")).toBe("tasks");
    expect(featureFromPathname("/landing")).toBeNull();
  });

  it("classifies notifications without returning private identifiers", () => {
    const response = (data) => ({ notification: { request: { content: { data } } } });
    expect(notificationType(response({ taskId: "secret-task-id" }))).toBe("task");
    expect(notificationType(response({ planningDate: "2026-07-15" }))).toBe("planning");
    expect(notificationType(response({ noiNotificationKey: "test" }))).toBe("test");
  });

  it("maps successful writes to aggregate feature actions", () => {
    expect(apiFeatureEvent("/api/journal", { method: "POST" })).toEqual({
      feature: "journal", action: "entry_created",
    });
    expect(apiFeatureEvent("/api/tasks/42", {
      method: "PUT", body: JSON.stringify({ status: "completed", title: "private" }),
    })).toEqual({ feature: "tasks", action: "completed" });
    expect(apiFeatureEvent("/api/tasks", {
      method: "POST", body: JSON.stringify({ title: "private", planned_at: "2026-07-15" }),
    })).toEqual({ feature: "calendar", action: "task_scheduled" });
    expect(apiFeatureEvent("/api/ai", {
      method: "POST", body: JSON.stringify({ action: "magic-sort", text: "private" }),
    })).toEqual({ feature: "ai", action: "magic_sort" });
    expect(apiFeatureEvent("/api/tasks", { method: "GET" })).toBeNull();
  });

  it("ignores malformed and unknown request bodies", () => {
    expect(apiFeatureEvent("/api/ai", { method: "POST", body: "private raw text" })).toBeNull();
    expect(apiFeatureEvent("/api/ai", {
      method: "POST", body: JSON.stringify({ action: "unknown", text: "private" }),
    })).toBeNull();
  });
});

/** Unit tests for deterministic notification scheduling and owned reconciliation. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  MAX_SCHEDULED_NOTIFICATIONS,
  PLANNING_CATEGORY,
  PLANNING_HORIZON_DAYS,
  buildDesiredNotificationSchedule,
  cleanupUserNotifications,
  completePlanningRemindersForToday,
  configurePlanningNotificationActions,
  getNotificationPrefs,
  isNotificationPermissionUsable,
  reconcileNotifications,
  saveNotificationPrefs,
  scheduleTestNotification,
} from "../notifications";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));

const NOW = new Date("2026-07-03T12:00:00.000Z");

function task(id, plannedAt, overrides = {}) {
  return { id, title: `Task ${id}`, planned_at: plannedAt, status: "active", ...overrides };
}

describe("buildDesiredNotificationSchedule", () => {
  test("includes only active tasks with valid future plans and future reminders", () => {
    const schedule = buildDesiredNotificationSchedule({
      now: NOW,
      prefs: { taskReminders: true, taskReminderMinutes: 10 },
      tasks: [
        task("valid", "2026-07-03T13:00:00.000Z"),
        task("completed", "2026-07-03T14:00:00.000Z", { status: "completed" }),
        task("deleted", "2026-07-03T14:00:00.000Z", { status: "deleted" }),
        task("maybe", "2026-07-03T14:00:00.000Z", { status: "maybe later" }),
        task("past", "2026-07-03T11:00:00.000Z"),
        task("too-close", "2026-07-03T12:05:00.000Z"),
        task("invalid", "not-a-date"),
      ],
    });

    expect(schedule).toHaveLength(1);
    expect(schedule[0].key).toBe("task:valid");
    expect(schedule[0].trigger.type).toBe("date");
    expect(schedule[0].trigger.date.toISOString()).toBe("2026-07-03T12:50:00.000Z");
  });

  test("creates a bounded horizon of actionable planning reminders", () => {
    const planningNow = new Date(2026, 6, 3, 5, 0, 0);
    const schedule = buildDesiredNotificationSchedule({
      now: planningNow,
      prefs: { todoReminders: true, todoStartHour: 9, todoIntervalHours: 3 },
    });

    expect(schedule).toHaveLength(PLANNING_HORIZON_DAYS * 5);
    expect(schedule[0].key).toMatch(/^planning:\d{4}-\d{2}-\d{2}:9$/);
    expect(schedule.every((item) => item.trigger.type === "date")).toBe(true);
    expect(schedule.every((item) => item.content.categoryIdentifier === PLANNING_CATEGORY)).toBe(true);
  });

  test("skips a locally completed planning day but preserves future days", () => {
    const planningNow = new Date(2026, 6, 3, 5, 0, 0);
    const today = "2026-07-03";
    const schedule = buildDesiredNotificationSchedule({
      now: planningNow,
      prefs: { todoReminders: true, todoStartHour: 9, todoIntervalHours: 3 },
      planningState: { completedDate: today },
    });
    expect(schedule).toHaveLength((PLANNING_HORIZON_DAYS - 1) * 5);
    expect(schedule.some((item) => item.key.startsWith(`planning:${today}:`))).toBe(false);
  });

  test("sorts task reminders by time and enforces the documented pending cap", () => {
    const tasks = Array.from({ length: MAX_SCHEDULED_NOTIFICATIONS + 10 }, (_, index) =>
      task(index, new Date(NOW.getTime() + (index + 2) * 60 * 60 * 1000).toISOString()),
    ).reverse();
    const schedule = buildDesiredNotificationSchedule({
      now: NOW,
      prefs: { taskReminders: true, taskReminderMinutes: 10 },
      tasks,
    });

    expect(schedule).toHaveLength(MAX_SCHEDULED_NOTIFICATIONS);
    expect(schedule[0].key).toBe("task:0");
    expect(schedule.at(-1).key).toBe(`task:${MAX_SCHEDULED_NOTIFICATIONS - 1}`);
  });
});

describe("scheduleTestNotification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    Notifications.scheduleNotificationAsync.mockResolvedValue("test-id");
  });

  test("uses an SDK 54 date trigger when permission is usable", async () => {
    await expect(scheduleTestNotification()).resolves.toBe(true);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ type: "date", date: expect.any(Date) }),
      }),
    );
  });

  test("does not schedule after permission is denied", async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: "denied" });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: "denied" });
    await expect(scheduleTestNotification()).resolves.toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe("planning actions", () => {
  test("registers Snooze and Done for today actions", async () => {
    Notifications.setNotificationCategoryAsync.mockResolvedValue({});
    await configurePlanningNotificationActions();
    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
      PLANNING_CATEGORY,
      expect.arrayContaining([
        expect.objectContaining({ buttonTitle: "Snooze" }),
        expect.objectContaining({ buttonTitle: "Done for today" }),
      ]),
    );
  });
});

describe("preferences and permissions", () => {
  beforeEach(() => jest.clearAllMocks());

  test("stores preferences in separate encoded user scopes", async () => {
    await saveNotificationPrefs({ taskReminders: true }, "user@example.com");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@noi_notification_prefs:user%40example.com",
      expect.stringContaining('"taskReminders":true'),
    );
  });

  test("moves legacy device preferences into only the first user scope", async () => {
    AsyncStorage.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('{"todoReminders":true}')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(getNotificationPrefs("first-user")).resolves.toMatchObject({ todoReminders: true });
    await expect(getNotificationPrefs("second-user")).resolves.toMatchObject({ todoReminders: false });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@noi_notification_prefs");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@noi_notification_prefs:first-user",
      '{"todoReminders":true}',
    );
  });

  test("returns defaults when preference storage is corrupt", async () => {
    AsyncStorage.getItem.mockResolvedValue("{");
    await expect(getNotificationPrefs("user-1")).resolves.toMatchObject({
      taskReminders: false,
      todoReminders: false,
    });
  });

  test.each([
    [{ status: "granted" }, true],
    [{ status: "denied", ios: { status: 3 } }, true],
    [{ status: "denied", ios: { status: 2 } }, false],
  ])("recognizes usable permission %#", (permission, expected) => {
    expect(isNotificationPermissionUsable(permission)).toBe(expected);
  });
});

describe("reconcileNotifications", () => {
  let storage;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new Map();
    AsyncStorage.getItem.mockImplementation(async (key) => storage.get(key) ?? null);
    AsyncStorage.setItem.mockImplementation(async (key, value) => storage.set(key, value));
    AsyncStorage.removeItem.mockImplementation(async (key) => storage.delete(key));
    Notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    let id = 0;
    Notifications.scheduleNotificationAsync.mockImplementation(async () => `native-${++id}`);
    Notifications.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
  });

  test("preserves unchanged notifications and selectively replaces changed ones", async () => {
    const tasks = [task("a", "2026-07-03T13:00:00.000Z")];
    const prefs = { taskReminders: true, taskReminderMinutes: 10 };

    await reconcileNotifications(tasks, { userId: "u1", prefs, now: NOW });
    await reconcileNotifications(tasks, { userId: "u1", prefs, now: NOW });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();

    await reconcileNotifications([], { userId: "u1", prefs, now: NOW });
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("native-1");
  });

  test("disabling the final preference cancels owned notifications only", async () => {
    const planningNow = new Date(2026, 6, 3, 5, 0, 0);
    await reconcileNotifications([], {
      userId: "u1",
      prefs: { todoReminders: true, todoStartHour: 21, todoIntervalHours: 3 },
      now: planningNow,
    });
    const result = await reconcileNotifications([], {
      userId: "u1",
      prefs: { todoReminders: false },
      now: planningNow,
    });

    expect(result.cancelled).toBe(PLANNING_HORIZON_DAYS);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("native-1");
    expect(Notifications.cancelAllScheduledNotificationsAsync).toBeUndefined();
  });

  test("does not schedule when permission is unavailable", async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: "denied" });
    const result = await reconcileNotifications([], { userId: "u1", prefs: {} });
    expect(result.permission).toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test("still cancels stale owned notifications when permission is unavailable", async () => {
    storage.set("@noi_notification_registry:u1", JSON.stringify({
      "planning:2026-07-03:9": { id: "stale", fingerprint: "old" },
    }));
    Notifications.getPermissionsAsync.mockResolvedValue({ status: "denied" });
    const result = await reconcileNotifications([], { userId: "u1", prefs: {} });
    expect(result).toMatchObject({ permission: false, cancelled: 1 });
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("stale");
  });

  test("serializes overlapping reconciliations", async () => {
    let release;
    Notifications.scheduleNotificationAsync.mockImplementationOnce(() =>
      new Promise((resolve) => { release = () => resolve("native-1"); }),
    );
    const first = reconcileNotifications([], {
      userId: "u1",
      prefs: { todoReminders: true, todoStartHour: 21 },
      now: NOW,
    });
    await Promise.resolve();
    const second = reconcileNotifications([], { userId: "u1", prefs: {}, now: NOW });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    release();
    await first;
    await second;
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("native-1");
  });

  test("cleanup cancels only one user's registered identifiers", async () => {
    storage.set("@noi_notification_registry:u1", JSON.stringify({
      "task:a": { id: "owned-a", fingerprint: "a" },
      "todo:9": { id: "owned-b", fingerprint: "b" },
    }));
    const result = await cleanupUserNotifications("u1");

    expect(result.cancelled).toBe(2);
    expect(Notifications.cancelScheduledNotificationAsync.mock.calls.flat()).toEqual([
      "owned-a", "owned-b",
    ]);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@noi_notification_registry:u1");
  });

  test("Done cancels only today's remaining planning reminders", async () => {
    const planningNow = new Date(2026, 6, 3, 12, 0, 0);
    storage.set("@noi_notification_registry:u1", JSON.stringify({
      "planning:2026-07-03:12": { id: "today", fingerprint: "a" },
      "planning:2026-07-04:9": { id: "tomorrow", fingerprint: "b" },
      "task:a": { id: "task", fingerprint: "c" },
    }));
    const result = await completePlanningRemindersForToday("u1", planningNow);
    expect(result.cancelled).toBe(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("today");
    const registry = JSON.parse(storage.get("@noi_notification_registry:u1"));
    expect(Object.keys(registry)).toEqual(["planning:2026-07-04:9", "task:a"]);
  });

});

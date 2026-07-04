jest.mock("expo-notifications", () => ({
  PermissionStatus: { GRANTED: "granted" },
}));

const mockToast = jest.fn();
jest.mock("sonner-native", () => ({ toast: (...args: unknown[]) => mockToast(...args) }));

import * as notifications from "./notifications.web";

describe("web notifications polyfill", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 0, 2, 8, 0, 0));
    mockToast.mockClear();
    await notifications.cancelAllScheduledNotificationsAsync();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("delivers a DATE trigger at its requested time and emits a notification", async () => {
    const listener = jest.fn();
    const subscription = notifications.addNotificationReceivedListener(listener);
    const fireAt = new Date(Date.now() + 30_000);

    await notifications.scheduleNotificationAsync({
      content: { title: "Task", body: "Starts now" },
      trigger: { type: "date", date: fireAt } as never,
    });

    jest.advanceTimersByTime(29_999);
    expect(mockToast).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(mockToast).toHaveBeenCalledWith("Task\nStarts now");
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ request: expect.objectContaining({ identifier: expect.any(String) }) }),
    );
    expect(await notifications.getAllScheduledNotificationsAsync()).toEqual([]);
    subscription.remove();
  });

  it("reschedules DAILY triggers and cancellation stops the next delivery", async () => {
    const identifier = await notifications.scheduleNotificationAsync({
      content: { title: "Daily" },
      trigger: { type: "daily", hour: 9, minute: 0 } as never,
    });

    jest.advanceTimersByTime(60 * 60 * 1000);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(await notifications.getAllScheduledNotificationsAsync()).toHaveLength(1);

    await notifications.cancelScheduledNotificationAsync(identifier);
    jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it("supports repeating CALENDAR triggers and removable listeners", async () => {
    const listener = jest.fn();
    const subscription = notifications.addNotificationReceivedListener(listener);
    await notifications.scheduleNotificationAsync({
      content: { body: "Calendar" },
      trigger: { type: "calendar", hour: 8, minute: 1, second: 0, repeats: true } as never,
    });

    jest.advanceTimersByTime(60_000);
    expect(listener).toHaveBeenCalledTimes(1);
    subscription.remove();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(mockToast).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("has no persisted notification response on web", async () => {
    await expect(notifications.getLastNotificationResponseAsync()).resolves.toBeNull();
  });
});

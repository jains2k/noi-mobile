import type { NotificationHandler } from "expo-notifications/src/NotificationsHandler";
import type {
  Notification,
  NotificationRequest,
  NotificationRequestInput,
  NotificationResponse,
  PermissionResponse,
  Subscription,
} from "expo-notifications/src/Notifications.types";
import * as Notifications from "expo-notifications";
import { toast } from "sonner-native";

const { PermissionStatus } = Notifications;
const MAX_TIMEOUT_MS = 2_147_483_647;

type Timer = ReturnType<typeof setTimeout>;
type ScheduledNotification = {
  timeoutId: Timer;
  request: NotificationRequest;
  nextFireAt: number;
};

const scheduledNotifications = new Map<string, ScheduledNotification>();
const receivedListeners = new Set<(notification: Notification) => void>();
const responseListeners = new Set<(response: NotificationResponse) => void>();

export const registerForPushNotificationsAsync = async (): Promise<void> => {};

/** Registers a response listener. Web toasts cannot currently synthesize a tap response. */
export const addNotificationResponseReceivedListener = (
  listener: (response: NotificationResponse) => void,
): Subscription => createSubscription(responseListeners, listener);

export const removeNotificationSubscription = (subscription: Subscription): void => {
  subscription.remove();
};

export const addNotificationReceivedListener = (
  listener: (notification: Notification) => void,
): Subscription => createSubscription(receivedListeners, listener);

/** @deprecated Retained for compatibility; prefer the subscription's `remove` method. */
export const removeNotificationReceivedListener = (
  listener: (notification: Notification) => void,
): void => {
  receivedListeners.delete(listener);
};

function createSubscription<T>(listeners: Set<T>, listener: T): Subscription {
  listeners.add(listener);
  return { remove: () => listeners.delete(listener) };
}

export const setNotificationChannelAsync = async (
  _channelId: string,
  _channel: Notifications.NotificationChannelInput,
): Promise<null> => null;

/** Web toasts do not expose native action buttons; retain API compatibility. */
export const setNotificationCategoryAsync = async (
  identifier: string,
  actions: Notifications.NotificationAction[],
): Promise<Notifications.NotificationCategory> => ({ identifier, actions });

export const setNotificationHandler = (_handler: NotificationHandler | null): void => {};

export const getExpoPushTokenAsync = async (): Promise<string> => "expo-push-token";

const grantedPermissions = (): PermissionResponse => ({
  status: PermissionStatus.GRANTED,
  expires: "never",
  granted: true,
  canAskAgain: true,
});

export const getPermissionsAsync = async (): Promise<PermissionResponse> =>
  grantedPermissions();

export const requestPermissionsAsync = async (): Promise<PermissionResponse> =>
  grantedPermissions();

/** Browser toasts do not persist a response across page loads. */
export const getLastNotificationResponseAsync = async (): Promise<NotificationResponse | null> =>
  null;

/**
 * Schedules a browser toast using Expo's date, daily, or calendar trigger shapes.
 * Calendar and daily repetitions calculate their next occurrence after every delivery.
 */
export const scheduleNotificationAsync = async (
  input: NotificationRequestInput,
): Promise<string> => {
  const identifier = input.identifier ?? createIdentifier();
  const request = { ...input, identifier } as NotificationRequest;
  const nextFireAt = getNextFireTime(input.trigger, Date.now());

  if (nextFireAt === null) {
    throw new Error("Unsupported or invalid web notification trigger");
  }

  cancel(identifier);
  scheduleTimer(identifier, request, nextFireAt);
  return identifier;
};

function scheduleTimer(
  identifier: string,
  request: NotificationRequest,
  nextFireAt: number,
): void {
  const delay = Math.max(0, Math.min(nextFireAt - Date.now(), MAX_TIMEOUT_MS));
  const timeoutId = setTimeout(() => {
    if (Date.now() < nextFireAt) {
      scheduleTimer(identifier, request, nextFireAt);
      return;
    }

    deliver(request);
    const followingFireAt = getFollowingFireTime(request.trigger, nextFireAt);
    if (followingFireAt === null) {
      scheduledNotifications.delete(identifier);
    } else {
      scheduleTimer(identifier, request, followingFireAt);
    }
  }, delay);

  scheduledNotifications.set(identifier, { timeoutId, request, nextFireAt });
}

function deliver(request: NotificationRequest): void {
  const { title, body } = request.content;
  const message = title && body ? `${title}\n${body}` : title ?? body;
  if (message) toast(message);

  const notification: Notification = { date: Date.now(), request };
  receivedListeners.forEach((listener) => listener(notification));
}

function getFollowingFireTime(
  trigger: NotificationRequest["trigger"],
  previousFireAt: number,
): number | null {
  if (!trigger || typeof trigger !== "object") return null;
  if ("type" in trigger && trigger.type === "daily") {
    return nextDaily(trigger.hour, trigger.minute, previousFireAt + 1);
  }
  if ("type" in trigger && trigger.type === "calendar" && trigger.repeats) {
    return nextCalendar(trigger, previousFireAt + 1);
  }
  return null;
}

function getNextFireTime(
  trigger: NotificationRequestInput["trigger"],
  now: number,
): number | null {
  if (trigger === null) return now;
  if (trigger instanceof Date || typeof trigger === "number") {
    return toFutureTimestamp(trigger, now);
  }
  if (!("type" in trigger)) {
    // Expo historically accepted `{ date }`; support it for existing app callers.
    if ("date" in trigger) return toFutureTimestamp(trigger.date as Date | number, now);
    return now;
  }

  switch (trigger.type) {
    case "date":
      return toFutureTimestamp(trigger.date, now);
    case "daily":
      return nextDaily(trigger.hour, trigger.minute, now);
    case "calendar":
      return nextCalendar(trigger, now);
    default:
      return null;
  }
}

function toFutureTimestamp(value: Date | number, now: number): number | null {
  const timestamp = value instanceof Date ? value.getTime() : value;
  return Number.isFinite(timestamp) && timestamp >= now ? timestamp : null;
}

function nextDaily(hour: number, minute: number, after: number): number | null {
  if (!inRange(hour, 0, 23) || !inRange(minute, 0, 59)) return null;
  const date = new Date(after);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() < after) date.setDate(date.getDate() + 1);
  return date.getTime();
}

function nextCalendar(
  trigger: Extract<NotificationRequest["trigger"], { type: "calendar" }>,
  after: number,
): number | null {
  const day = new Date(after);
  day.setHours(0, 0, 0, 0);
  const limit = new Date(after);
  limit.setFullYear(limit.getFullYear() + 8);

  // Iterate calendar days, then only the possible time components. This keeps
  // distant annual reminders cheap while still supporting partially specified times.
  for (; day.getTime() <= limit.getTime(); day.setDate(day.getDate() + 1)) {
    if (!calendarDateMatches(day, trigger)) continue;
    const hours = trigger.hour === undefined ? range(24) : [trigger.hour];
    const minutes = trigger.minute === undefined ? range(60) : [trigger.minute];
    const seconds = trigger.second === undefined ? range(60) : [trigger.second];
    for (const hour of hours) {
      for (const minute of minutes) {
        for (const second of seconds) {
          if (!inRange(hour, 0, 23) || !inRange(minute, 0, 59) || !inRange(second, 0, 59)) {
            return null;
          }
          const candidate = new Date(day);
          candidate.setHours(hour, minute, second, 0);
          if (candidate.getTime() >= after) return candidate.getTime();
        }
      }
    }
  }
  return null;
}

function calendarDateMatches(
  date: Date,
  trigger: Extract<NotificationRequest["trigger"], { type: "calendar" }>,
): boolean {
  return (
    matches(trigger.year, date.getFullYear()) &&
    matches(trigger.month, date.getMonth() + 1) &&
    matches(trigger.day, date.getDate()) &&
    matches(trigger.weekday, date.getDay() + 1)
  );
}

const matches = (expected: number | undefined, actual: number): boolean =>
  expected === undefined || expected === actual;
const inRange = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;
const range = (length: number): number[] => Array.from({ length }, (_, index) => index);
const createIdentifier = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;

function cancel(identifier: string): void {
  const scheduled = scheduledNotifications.get(identifier);
  if (!scheduled) return;
  clearTimeout(scheduled.timeoutId);
  scheduledNotifications.delete(identifier);
}

export const cancelAllScheduledNotificationsAsync = async (): Promise<void> => {
  Array.from(scheduledNotifications.keys()).forEach(cancel);
};

export const cancelScheduledNotificationAsync = async (
  identifier: string,
): Promise<void> => cancel(identifier);

export const getAllScheduledNotificationsAsync = async (): Promise<NotificationRequest[]> =>
  Array.from(scheduledNotifications.values()).map(({ request }) => request);

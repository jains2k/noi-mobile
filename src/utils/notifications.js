/**
 * User-scoped notification preferences and deterministic schedule reconciliation.
 *
 * This module owns only notification identifiers recorded in its registry. It must
 * never cancel all application notifications because other features may schedule
 * notifications independently.
 */
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Linking } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const PREFS_KEY_PREFIX = "@noi_notification_prefs:";
const REGISTRY_KEY_PREFIX = "@noi_notification_registry:";
const PLANNING_STATE_KEY_PREFIX = "@noi_planning_state:";
const LEGACY_PREFS_KEY = "@noi_notification_prefs";
const ANONYMOUS_USER = "anonymous";

export const PLANNING_CATEGORY = "noi-planning-reminder";
export const PLANNING_SNOOZE_ACTION = "noi-planning-snooze";
export const PLANNING_DONE_ACTION = "noi-planning-done";
export const PLANNING_HORIZON_DAYS = 7;

/**
 * iOS supports 64 pending local notifications. Keeping Noi at 50 leaves room for
 * system behavior and notifications scheduled by unrelated application features.
 */
export const MAX_SCHEDULED_NOTIFICATIONS = 50;

export const DEFAULT_NOTIFICATION_PREFS = Object.freeze({
  taskReminders: false,
  taskReminderMinutes: 10,
  showTaskTitles: false,
  todoReminders: false,
  todoStartHour: 9,
  todoIntervalHours: 3,
});

const TODO_MESSAGES = [
  "time to check your to-do list! what needs doing? ✦",
  "hey! have you planned your tasks yet? ✦",
  "gentle nudge — review your tasks and plan ahead ✦",
  "a quick check-in: how's your task list looking? ✦",
  "take a moment to organize your thoughts and tasks ✦",
];

let reconciliationQueue = Promise.resolve();

function scopedKey(prefix, userId) {
  return `${prefix}${encodeURIComponent(String(userId || ANONYMOUS_USER))}`;
}

function normalizePrefs(prefs) {
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(prefs || {}) };
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getPlanningState(userId) {
  try {
    const raw = await AsyncStorage.getItem(scopedKey(PLANNING_STATE_KEY_PREFIX, userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function savePlanningState(userId, state) {
  await AsyncStorage.setItem(
    scopedKey(PLANNING_STATE_KEY_PREFIX, userId),
    JSON.stringify(state),
  );
}

/** Registers the two actions shown on iOS planning reminders. */
export async function configurePlanningNotificationActions() {
  await Notifications.setNotificationCategoryAsync(PLANNING_CATEGORY, [
    {
      identifier: PLANNING_SNOOZE_ACTION,
      buttonTitle: "Snooze",
      options: { opensAppToForeground: true },
    },
    {
      identifier: PLANNING_DONE_ACTION,
      buttonTitle: "Done for today",
      options: { opensAppToForeground: true },
    },
  ]);
}

/** Loads preferences for one authenticated user (or the legacy anonymous scope). */
export async function getNotificationPrefs(userId = ANONYMOUS_USER) {
  try {
    const key = scopedKey(PREFS_KEY_PREFIX, userId);
    let raw = await AsyncStorage.getItem(key);

    // Claim the legacy device-global preference for the first scope that reads it.
    // Removing it prevents a second account on the same device inheriting it.
    if (!raw) {
      raw = await AsyncStorage.getItem(LEGACY_PREFS_KEY);
      if (raw) {
        await AsyncStorage.setItem(key, raw);
        await AsyncStorage.removeItem(LEGACY_PREFS_KEY);
      }
    }
    return raw ? normalizePrefs(JSON.parse(raw)) : { ...DEFAULT_NOTIFICATION_PREFS };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

/** Persists a complete preference snapshot in the supplied user's scope. */
export async function saveNotificationPrefs(prefs, userId = ANONYMOUS_USER) {
  await AsyncStorage.setItem(
    scopedKey(PREFS_KEY_PREFIX, userId),
    JSON.stringify(normalizePrefs(prefs)),
  );
}

/** Returns whether an Expo permission response permits local notifications. */
export function isNotificationPermissionUsable(permission) {
  if (!permission) return false;
  if (permission.status === "granted" || permission.status === "provisional") return true;

  const provisional = Notifications.IosAuthorizationStatus?.PROVISIONAL ?? 3;
  return permission.ios?.status === provisional || permission.ios?.status === "provisional";
}

export async function requestNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (isNotificationPermissionUsable(existing)) return true;
  return isNotificationPermissionUsable(await Notifications.requestPermissionsAsync());
}

export async function checkNotificationPermission() {
  return isNotificationPermissionUsable(await Notifications.getPermissionsAsync());
}

/** Schedules a near-immediate notification for permission and device testing. */
export async function scheduleTestNotification() {
  if (!(await requestNotificationPermission())) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "noi reminders are working ✦",
      body: "you'll receive task and planning reminders here.",
      sound: true,
      data: { noiNotificationKey: "test" },
    },
    trigger: { type: "date", date: new Date(Date.now() + 8_000) },
  });
  return true;
}

export function openNotificationSettings() {
  if (Platform.OS === "ios") Linking.openURL("app-settings:");
  else Linking.openSettings();
}

function validPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

/**
 * Purely builds the desired notification set. Callers inject `now` so schedule
 * behavior is deterministic in tests and around date/time boundaries.
 */
export function buildDesiredNotificationSchedule({
  tasks = [],
  prefs,
  now = new Date(),
  planningState = {},
}) {
  const settings = normalizePrefs(prefs);
  const nowMs = now.getTime();
  const desired = [];

  if (settings.todoReminders) {
    const startHour = Math.max(0, Math.min(21, Math.trunc(Number(settings.todoStartHour)) || 0));
    const interval = validPositiveNumber(settings.todoIntervalHours, 3);
    let messageIndex = 0;
    for (let dayOffset = 0; dayOffset < PLANNING_HORIZON_DAYS; dayOffset += 1) {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() + dayOffset);
      const dateKey = localDateKey(day);
      if (planningState.completedDate === dateKey) continue;

      for (let hour = startHour; hour <= 21; hour += interval) {
        if (!Number.isInteger(hour)) break;
        const reminderTime = new Date(day);
        reminderTime.setHours(hour, 0, 0, 0);
        if (reminderTime <= now) continue;
        const key = `planning:${dateKey}:${hour}`;
        desired.push({
          key,
          content: {
            title: "planning reminder",
            body: TODO_MESSAGES[messageIndex % TODO_MESSAGES.length],
            data: { noiNotificationKey: key, planningDate: dateKey },
            sound: true,
            categoryIdentifier: PLANNING_CATEGORY,
          },
          trigger: { type: "date", date: reminderTime },
          sortTime: reminderTime.getTime(),
        });
        messageIndex += 1;
      }
    }
  }

  if (settings.taskReminders) {
    const minutes = validPositiveNumber(settings.taskReminderMinutes, 10);
    const taskSchedules = tasks.flatMap((task) => {
      if (!task || task.id == null || task.status !== "active") return [];
      const plannedMs = new Date(task.planned_at).getTime();
      if (!Number.isFinite(plannedMs) || plannedMs <= nowMs) return [];
      const reminderMs = plannedMs - minutes * 60 * 1000;
      if (reminderMs <= nowMs) return [];
      return [{
        key: `task:${task.id}`,
        content: {
          title: "upcoming task ✦",
          body: settings.showTaskTitles
            ? `"${task.title || "Untitled task"}" starts in ${minutes} minutes`
            : `a scheduled task starts in ${minutes} minutes`,
          data: { taskId: task.id, noiNotificationKey: `task:${task.id}` },
          sound: true,
        },
        trigger: { type: "date", date: new Date(reminderMs) },
        sortTime: reminderMs,
      }];
    }).sort((a, b) => a.sortTime - b.sortTime);
    desired.push(...taskSchedules);
  }

  return desired
    .sort((a, b) => (a.sortTime ?? 0) - (b.sortTime ?? 0))
    .slice(0, MAX_SCHEDULED_NOTIFICATIONS)
    .map(({ sortTime, ...item }) => item);
}

function fingerprint(definition) {
  const trigger = definition.trigger.date
    ? { type: definition.trigger.type, date: definition.trigger.date.toISOString() }
    : definition.trigger;
  return JSON.stringify({ content: definition.content, trigger });
}

async function loadRegistry(userId) {
  try {
    const raw = await AsyncStorage.getItem(scopedKey(REGISTRY_KEY_PREFIX, userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function storeRegistry(userId, registry) {
  await AsyncStorage.setItem(scopedKey(REGISTRY_KEY_PREFIX, userId), JSON.stringify(registry));
}

async function reconcileNow({ userId, tasks, prefs, now }) {
  if (!userId) throw new Error("reconcileNotifications requires a userId");
  const registry = await loadRegistry(userId);
  const hasPermission = await checkNotificationPermission();
  const settings = prefs || await getNotificationPrefs(userId);
  const planningState = await getPlanningState(userId);
  const desired = buildDesiredNotificationSchedule({
    tasks,
    prefs: settings,
    now,
    planningState,
  });
  const desiredByKey = Object.fromEntries(desired.map((item) => [item.key, item]));
  // Begin with the known registry so a failed cancellation remains owned and can
  // be retried by the next reconciliation.
  const nextRegistry = { ...registry };
  let scheduled = 0;
  let cancelled = 0;

  try {
    for (const [key, record] of Object.entries(registry)) {
      const definition = desiredByKey[key];
      if (definition && record.fingerprint === fingerprint(definition)) {
        delete desiredByKey[key];
        continue;
      }
      await Notifications.cancelScheduledNotificationAsync(record.id);
      delete nextRegistry[key];
      cancelled += 1;
    }

    for (const [key, definition] of hasPermission ? Object.entries(desiredByKey) : []) {
      const id = await Notifications.scheduleNotificationAsync({
        content: definition.content,
        trigger: definition.trigger,
      });
      nextRegistry[key] = { id, fingerprint: fingerprint(definition) };
      scheduled += 1;
    }
  } finally {
    // Persist successful work even if a later native operation fails, preventing
    // newly-created notification identifiers from becoming orphaned.
    await storeRegistry(userId, nextRegistry);
  }

  return {
    scheduled,
    cancelled,
    unchanged: Object.keys(nextRegistry).length - scheduled,
    permission: hasPermission,
  };
}

/**
 * Reconciles only Noi-owned notifications. Calls are globally serialized to avoid
 * races between task mutations, preference changes, and app lifecycle events.
 */
export function reconcileNotifications(tasksOrOptions, options = {}) {
  const reconciliationOptions = Array.isArray(tasksOrOptions)
    ? { ...options, tasks: tasksOrOptions }
    : tasksOrOptions;
  const operation = reconciliationQueue.then(() => reconcileNow(reconciliationOptions));
  reconciliationQueue = operation.catch(() => undefined);
  return operation;
}

/** Suppresses and cancels all remaining planning reminders for the local day. */
export function completePlanningRemindersForToday(userId, now = new Date()) {
  if (!userId) return Promise.reject(new Error("userId is required"));
  const operation = reconciliationQueue.then(async () => {
    const dateKey = localDateKey(now);
    const state = await getPlanningState(userId);
    await savePlanningState(userId, {
      ...state,
      completedDate: dateKey,
    });

    const registry = await loadRegistry(userId);
    const nextRegistry = { ...registry };
    let cancelled = 0;
    for (const [key, record] of Object.entries(registry)) {
      if (key.startsWith(`planning:${dateKey}:`)) {
        await Notifications.cancelScheduledNotificationAsync(record.id);
        delete nextRegistry[key];
        cancelled += 1;
      }
    }
    await storeRegistry(userId, nextRegistry);
    return { cancelled, completedDate: dateKey };
  });
  reconciliationQueue = operation.catch(() => undefined);
  return operation;
}

/** Cancels and forgets every notification owned by one user. */
export function cleanupNotificationsForUser(userId) {
  if (!userId) return Promise.reject(new Error("cleanupNotificationsForUser requires a userId"));
  const operation = reconciliationQueue.then(async () => {
    const registry = await loadRegistry(userId);
    for (const record of Object.values(registry)) {
      await Notifications.cancelScheduledNotificationAsync(record.id);
    }
    await AsyncStorage.removeItem(scopedKey(REGISTRY_KEY_PREFIX, userId));
    await AsyncStorage.removeItem(scopedKey(PLANNING_STATE_KEY_PREFIX, userId));
    return { cancelled: Object.keys(registry).length };
  });
  reconciliationQueue = operation.catch(() => undefined);
  return operation;
}

/** Integration-friendly alias used by authentication cleanup flows. */
export const cleanupUserNotifications = cleanupNotificationsForUser;

/** Backward-compatible wrapper; new integrations should call reconcileNotifications. */
export async function scheduleTaskReminders(tasks, minutesBefore = 10, userId = ANONYMOUS_USER) {
  const prefs = await getNotificationPrefs(userId);
  return reconcileNotifications({
    userId,
    tasks,
    prefs: { ...prefs, taskReminderMinutes: minutesBefore },
  });
}

/** Backward-compatible wrapper for existing screens using the anonymous scope. */
export async function refreshAllNotifications(tasks, userId = ANONYMOUS_USER) {
  return reconcileNotifications({ userId, tasks });
}

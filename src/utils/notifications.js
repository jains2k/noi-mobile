import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Linking } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const PREFS_KEY = "@noi_notification_prefs";

const DEFAULT_PREFS = {
  taskReminders: false,
  taskReminderMinutes: 10,
  todoReminders: false,
  todoStartHour: 9,
  todoIntervalHours: 3,
};

export async function getNotificationPrefs() {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveNotificationPrefs(prefs) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export async function requestNotificationPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function checkNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

export function openNotificationSettings() {
  if (Platform.OS === "ios") {
    Linking.openURL("app-settings:");
  } else {
    Linking.openSettings();
  }
}

export async function scheduleTaskReminders(tasks, minutesBefore = 10) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const prefs = await getNotificationPrefs();

  if (prefs.taskReminders) {
    for (const task of tasks) {
      const taskTime = task.planned_at ? new Date(task.planned_at) : null;
      if (!taskTime || task.status === "completed") continue;

      const reminderTime = new Date(taskTime.getTime() - minutesBefore * 60 * 1000);
      if (reminderTime <= now) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "upcoming task ✦",
          body: `"${task.title}" starts in ${minutesBefore} minutes`,
          data: { taskId: task.id },
          sound: true,
        },
        trigger: { date: reminderTime },
      });
    }
  }

  if (prefs.todoReminders) {
    await scheduleTodoReminders(prefs.todoStartHour, prefs.todoIntervalHours);
  }
}

async function scheduleTodoReminders(startHour, intervalHours) {
  const now = new Date();

  for (let i = 0; i < 5; i++) {
    const hour = startHour + i * intervalHours;
    if (hour > 21) break;

    const reminderTime = new Date();
    reminderTime.setHours(hour, 0, 0, 0);

    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const messages = [
      "time to check your to-do list! what needs doing? ✦",
      "hey! have you planned your tasks yet? ✦",
      "gentle nudge — review your tasks and plan ahead ✦",
      "a quick check-in: how's your task list looking? ✦",
      "take a moment to organize your thoughts and tasks ✦",
    ];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "plan your tasks",
        body: messages[i % messages.length],
        sound: true,
      },
      trigger: { date: reminderTime },
    });
  }
}

export async function refreshAllNotifications(tasks) {
  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) return;

  const prefs = await getNotificationPrefs();
  await scheduleTaskReminders(tasks, prefs.taskReminderMinutes);
}

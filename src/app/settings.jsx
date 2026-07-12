import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Palette, Bell, LogOut, Star, Type, Check, Trash2, HelpCircle, ChevronRight, Clock, ListTodo } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/utils/auth/useAuth";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Shell from "@/components/Shell";
import { useTheme } from "@/utils/ThemeProvider";
import { apiFetch } from "@/utils/api";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  requestNotificationPermission,
  checkNotificationPermission,
  openNotificationSettings,
  reconcileNotifications,
  scheduleTestNotification,
} from "@/utils/notifications";

export default function MobileSettings() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { signOut, isAuthenticated, auth } = useAuth();
  const userId = auth?.user?.id;
  const { themeColors } = useTheme();
  const router = useRouter();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/user/settings");
        if (!res.ok)
          return {
            theme: "lavender",
            font: "cute",
            task_reminders: true,
            mood_checkins: false,
          };
        return res.json();
      } catch (error) {
        console.error("Error fetching settings:", error);
        return {
          theme: "lavender",
          font: "cute",
          task_reminders: true,
          mood_checkins: false,
        };
      }
    },
    enabled: !!isAuthenticated,
    retry: false,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings) => {
      try {
        const res = await apiFetch("/api/user/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSettings),
        });
        if (!res.ok) throw new Error("Failed to update settings");
        return res.json();
      } catch (error) {
        console.error("Error updating settings:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const [taskReminders, setTaskReminders] = useState(true);
  const [moodCheckins, setMoodCheckins] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    taskReminders: false,
    taskReminderMinutes: 10,
    showTaskTitles: false,
    todoReminders: false,
    todoStartHour: 9,
    todoIntervalHours: 3,
  });
  const [hasNotifPermission, setHasNotifPermission] = useState(false);
  const notificationUpdateRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    getNotificationPrefs(userId).then(setNotifPrefs).catch((error) => {
      console.error("Failed to load notification preferences:", error);
    });
  }, [userId]);

  // Permission may be changed in iOS Settings while this screen is backgrounded.
  useFocusEffect(
    useCallback(() => {
      checkNotificationPermission()
        .then(setHasNotifPermission)
        .catch((error) => {
          console.error("Failed to check notification permission:", error);
          setHasNotifPermission(false);
        });
    }, []),
  );

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await apiFetch("/api/tasks");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  const updateNotifPref = async (key, value) => {
    if (!userId || notificationUpdateRef.current) return;
    notificationUpdateRef.current = true;
    const previous = notifPrefs;
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    try {
      await saveNotificationPrefs(updated, userId);
      await reconcileNotifications(tasks, { userId, prefs: updated });
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
      setNotifPrefs(previous);
      try {
        await saveNotificationPrefs(previous, userId);
        await reconcileNotifications(tasks, { userId, prefs: previous });
      } catch (rollbackError) {
        console.error("Failed to restore notification preferences:", rollbackError);
      }
      Alert.alert(
        "couldn't update reminders",
        "your previous reminder settings were restored. please try again.",
      );
    } finally {
      notificationUpdateRef.current = false;
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const granted = await requestNotificationPermission();
      setHasNotifPermission(granted);
      if (granted && userId) {
        await reconcileNotifications(tasks, { userId, prefs: notifPrefs });
      }
      if (granted) return true;

      Alert.alert(
        "notifications disabled",
        "to get reminders, you need to enable notifications for noi in your device settings.",
        [
          { text: "cancel", style: "cancel" },
          { text: "open settings", onPress: openNotificationSettings },
        ]
      );
      return false;
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      Alert.alert(
        "couldn't enable notifications",
        "please try again or enable notifications for noi in iOS Settings.",
      );
      return false;
    }
  };

  const handleTestNotification = async () => {
    try {
      const scheduled = await scheduleTestNotification();
      setHasNotifPermission(scheduled);
      if (!scheduled) {
        await handleEnableNotifications();
        return;
      }
      Alert.alert(
        "test reminder scheduled",
        "dismiss this message. a notification should appear in about 8 seconds, even while noi is open.",
      );
    } catch (error) {
      console.error("Failed to schedule test notification:", error);
      Alert.alert(
        "couldn't schedule test reminder",
        "check notification permission in iOS Settings and try again.",
      );
    }
  };

  useEffect(() => {
    if (settings) {
      setTaskReminders(settings.task_reminders ?? true);
      setMoodCheckins(settings.mood_checkins ?? false);
    }
  }, [settings]);

  const themes = [
    { id: "lavender", name: "lavender", color: "#a78bfa" },
    { id: "ocean", name: "ocean", color: "#60a5fa" },
    { id: "sage", name: "sage", color: "#84cc16" },
    { id: "rose", name: "rose", color: "#fb7185" },
    { id: "citrus", name: "citrus", color: "#fbbf24" },
    { id: "mint", name: "mint", color: "#4ade80" },
  ];

  const fonts = [
    { id: "cute", name: "cute (fredoka)" },
    { id: "modern", name: "modern (inter)" },
    { id: "friendly", name: "friendly (quicksand)" },
    { id: "rounded", name: "rounded (lexend)" },
    { id: "minimal", name: "minimal (space mono)" },
  ];

  const currentTheme = settings?.theme || "lavender";
  const currentFont = settings?.font || "cute";

  const handleSignOut = () => {
    Alert.alert("sign out", "are you sure you want to sign out?", [
      { text: "cancel", style: "cancel" },
      {
        text: "sign out",
        style: "destructive",
        onPress: async () => { await signOut(); router.replace("/landing"); },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "delete account",
      "this will permanently delete your account and all data. this cannot be undone.",
      [
        { text: "cancel", style: "cancel" },
        {
          text: "delete account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "are you sure?",
              "all your tasks, journal entries, mood logs, and focus sessions will be permanently deleted.",
              [
                { text: "cancel", style: "cancel" },
                {
                  text: "yes, delete everything",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const res = await apiFetch("/api/user/delete", { method: "DELETE" });
                      if (!res.ok) throw new Error("delete failed");
                    } catch (error) {
                      Alert.alert("error", "failed to delete account. please try again.");
                      return;
                    }
                    try {
                      await signOut();
                    } catch (_) {}
                    router.replace("/landing");
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <Shell>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          gap: 40,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "bold",
              color: "#1F2937",
              marginBottom: 8,
            }}
          >
            settings
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280" }}>
            customize your noi experience.
          </Text>
        </View>

        <View style={{ gap: 32 }}>
          {/* Theme Section */}
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              borderRadius: 32,
              borderWidth: 2,
              borderColor: themeColors.primary,
              borderStyle: "dashed",
              padding: 32,
              gap: 20,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Palette size={20} color={themeColors.primary} />
              <Text
                style={{ fontSize: 16, fontWeight: "bold", color: "#374151" }}
              >
                color theme
              </Text>
            </View>
            <View style={{ gap: 12 }}>
              {themes.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => updateSettingsMutation.mutate({ theme: t.id })}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor:
                      currentTheme === t.id
                        ? "rgba(255, 255, 255, 0.4)"
                        : "rgba(255, 255, 255, 0.2)",
                    borderWidth: currentTheme === t.id ? 2 : 0,
                    borderColor: themeColors.primary,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: t.color,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: "#374151",
                      flex: 1,
                    }}
                  >
                    {t.name}
                  </Text>
                  {currentTheme === t.id && (
                    <Check size={20} color={themeColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Font Section - with same styling as theme */}
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              borderRadius: 32,
              borderWidth: 2,
              borderColor: themeColors.primary,
              borderStyle: "dashed",
              padding: 32,
              gap: 20,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Type size={20} color={themeColors.primary} />
              <Text
                style={{ fontSize: 16, fontWeight: "bold", color: "#374151" }}
              >
                typography
              </Text>
            </View>
            <View style={{ gap: 12 }}>
              {fonts.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => updateSettingsMutation.mutate({ font: f.id })}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor:
                      currentFont === f.id
                        ? "rgba(255, 255, 255, 0.4)"
                        : "rgba(255, 255, 255, 0.2)",
                    borderWidth: currentFont === f.id ? 2 : 0,
                    borderColor: themeColors.primary,
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#374151" }}>
                    {f.name}
                  </Text>
                  {currentFont === f.id && (
                    <Check size={20} color={themeColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notifications Section */}
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              borderRadius: 32,
              borderWidth: 2,
              borderColor: themeColors.primary,
              borderStyle: "dashed",
              padding: 32,
              gap: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Bell size={20} color={themeColors.primary} />
              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#374151" }}>
                notifications & reminders
              </Text>
            </View>

            {/* Permission banner */}
            {!hasNotifPermission && (
              <TouchableOpacity
                onPress={handleEnableNotifications}
                style={{
                  backgroundColor: `${themeColors.primary}15`,
                  padding: 16,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Bell size={18} color={themeColors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: themeColors.primary }}>
                    enable notifications
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    tap to allow noi to send you gentle reminders
                  </Text>
                </View>
                <ChevronRight size={16} color={themeColors.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleTestNotification}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: themeColors.primary,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "bold", color: themeColors.primary }}>
                send test notification
              </Text>
            </TouchableOpacity>

            <View style={{ gap: 24 }}>
              {/* Task Reminders */}
              <View style={{ gap: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 16,
                    backgroundColor: "rgba(255, 255, 255, 0.4)",
                    borderRadius: 16,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <Clock size={14} color="#374151" />
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: "#374151" }}>
                        task reminders
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>
                      get a nudge before scheduled tasks begin
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="switch"
                    accessibilityState={{ checked: notifPrefs.taskReminders }}
                    onPress={async () => {
                      if (!notifPrefs.taskReminders && !hasNotifPermission) {
                        const granted = await handleEnableNotifications();
                        if (!granted) return;
                      }
                      updateNotifPref("taskReminders", !notifPrefs.taskReminders);
                    }}
                    style={{
                      width: 48,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: notifPrefs.taskReminders ? themeColors.primary : "#D1D5DB",
                      padding: 2,
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: "#FFF",
                        alignSelf: notifPrefs.taskReminders ? "flex-end" : "flex-start",
                      }}
                    />
                  </TouchableOpacity>
                </View>

                {/* Minutes before picker */}
                {notifPrefs.taskReminders && (
                  <View style={{ paddingHorizontal: 8, gap: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: "bold", color: "#9CA3AF", marginBottom: 8, paddingLeft: 4 }}>
                      remind me this many minutes before:
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                      {[5, 10, 15, 30, 60].map((mins) => (
                        <TouchableOpacity
                          key={mins}
                          onPress={() => updateNotifPref("taskReminderMinutes", mins)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 12,
                            backgroundColor: notifPrefs.taskReminderMinutes === mins ? themeColors.primary : "rgba(255,255,255,0.4)",
                          }}
                        >
                          <Text style={{
                            fontSize: 12,
                            fontWeight: "bold",
                            color: notifPrefs.taskReminderMinutes === mins ? "#FFF" : "#6B7280",
                          }}>
                            {mins < 60 ? `${mins} min` : "1 hour"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: "bold", color: "#6B7280" }}>
                          show task names
                        </Text>
                        <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                          names may be visible on your lock screen
                        </Text>
                      </View>
                      <TouchableOpacity
                        accessibilityRole="switch"
                        accessibilityLabel="Show task names in notifications"
                        accessibilityState={{ checked: notifPrefs.showTaskTitles }}
                        onPress={() => updateNotifPref("showTaskTitles", !notifPrefs.showTaskTitles)}
                        style={{
                          width: 48,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: notifPrefs.showTaskTitles ? themeColors.primary : "#D1D5DB",
                          padding: 2,
                          justifyContent: "center",
                        }}
                      >
                        <View style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: "#FFF",
                          alignSelf: notifPrefs.showTaskTitles ? "flex-end" : "flex-start",
                        }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Planning Reminders */}
              <View style={{ gap: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 16,
                    backgroundColor: "rgba(255, 255, 255, 0.4)",
                    borderRadius: 16,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <ListTodo size={14} color="#374151" />
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: "#374151" }}>
                        planning reminders
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>
                      periodic nudges to plan and review your tasks
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="switch"
                    accessibilityState={{ checked: notifPrefs.todoReminders }}
                    onPress={async () => {
                      if (!notifPrefs.todoReminders && !hasNotifPermission) {
                        const granted = await handleEnableNotifications();
                        if (!granted) return;
                      }
                      updateNotifPref("todoReminders", !notifPrefs.todoReminders);
                    }}
                    style={{
                      width: 48,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: notifPrefs.todoReminders ? themeColors.primary : "#D1D5DB",
                      padding: 2,
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: "#FFF",
                        alignSelf: notifPrefs.todoReminders ? "flex-end" : "flex-start",
                      }}
                    />
                  </TouchableOpacity>
                </View>

                {notifPrefs.todoReminders && (
                  <View style={{ paddingHorizontal: 8, gap: 16 }}>
                    {/* Start time */}
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: "bold", color: "#9CA3AF", marginBottom: 8, paddingLeft: 4 }}>
                        start reminders at:
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                        {[7, 8, 9, 10, 11].map((h) => (
                          <TouchableOpacity
                            key={h}
                            onPress={() => updateNotifPref("todoStartHour", h)}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 12,
                              backgroundColor: notifPrefs.todoStartHour === h ? themeColors.primary : "rgba(255,255,255,0.4)",
                            }}
                          >
                            <Text style={{
                              fontSize: 12,
                              fontWeight: "bold",
                              color: notifPrefs.todoStartHour === h ? "#FFF" : "#6B7280",
                            }}>
                              {h > 12 ? h - 12 : h} {h >= 12 ? "pm" : "am"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Interval */}
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: "bold", color: "#9CA3AF", marginBottom: 8, paddingLeft: 4 }}>
                        remind me every:
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {[2, 3, 4].map((hrs) => (
                          <TouchableOpacity
                            key={hrs}
                            onPress={() => updateNotifPref("todoIntervalHours", hrs)}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 12,
                              backgroundColor: notifPrefs.todoIntervalHours === hrs ? themeColors.primary : "rgba(255,255,255,0.4)",
                            }}
                          >
                            <Text style={{
                              fontSize: 12,
                              fontWeight: "bold",
                              color: notifPrefs.todoIntervalHours === hrs ? "#FFF" : "#6B7280",
                            }}>
                              {hrs} hours
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Preview */}
                    <View style={{ backgroundColor: `${themeColors.primary}10`, padding: 12, borderRadius: 12 }}>
                      <Text style={{ fontSize: 11, color: themeColors.primary, fontWeight: "600" }}>
                        you'll get reminders at:{" "}
                        {Array.from({ length: 5 }, (_, i) => {
                          const h = notifPrefs.todoStartHour + i * notifPrefs.todoIntervalHours;
                          if (h > 21) return null;
                          return `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`;
                        }).filter(Boolean).join(", ")}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Open device settings link */}
            {hasNotifPermission && (
              <TouchableOpacity
                onPress={openNotificationSettings}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 }}
              >
                <Text style={{ fontSize: 12, color: "#9CA3AF" }}>manage in device settings</Text>
                <ChevronRight size={12} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Help & Support */}
          <TouchableOpacity
            onPress={() => Linking.openURL("https://noi-web.fly.dev/support")}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              borderRadius: 24,
              padding: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <HelpCircle size={20} color={themeColors.primary} />
              <Text
                style={{ fontSize: 16, fontWeight: "bold", color: themeColors.primary }}
              >
                help & support
              </Text>
            </View>
          </TouchableOpacity>

          {/* Account Section */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              borderRadius: 24,
              padding: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <LogOut size={20} color="#DC2626" />
              <Text
                style={{ fontSize: 16, fontWeight: "bold", color: "#DC2626" }}
              >
                sign out
              </Text>
            </View>
          </TouchableOpacity>

          {isAuthenticated && (
          <TouchableOpacity
            onPress={handleDeleteAccount}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              borderRadius: 24,
              padding: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Trash2 size={20} color="#DC2626" />
              <Text
                style={{ fontSize: 16, fontWeight: "bold", color: "#DC2626" }}
              >
                delete account
              </Text>
            </View>
          </TouchableOpacity>
          )}
        </View>

        <View style={{ alignItems: "center", marginTop: 60, opacity: 0.3 }}>
          <Star size={24} color="#9333EA" />
          <Text
            style={{
              fontSize: 12,
              color: "#9333EA",
              fontWeight: "bold",
              marginTop: 10,
            }}
          >
            noi mobile v1.0.0
          </Text>
        </View>
      </ScrollView>
    </Shell>
  );
}

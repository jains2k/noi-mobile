import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Palette, Bell, LogOut, Star, Type, Check, Trash2, HelpCircle } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/utils/auth/useAuth";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Shell from "@/components/Shell";
import { useTheme } from "@/utils/ThemeProvider";
import { apiFetch } from "@/utils/api";

export default function MobileSettings() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { signOut, isAuthenticated } = useAuth();
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

          {/* Notifications Section - with same styling */}
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
              <Bell size={20} color={themeColors.primary} />
              <Text
                style={{ fontSize: 16, fontWeight: "bold", color: "#374151" }}
              >
                notifications & reminders
              </Text>
            </View>

            <View style={{ gap: 24 }}>
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
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "#374151",
                      marginBottom: 2,
                    }}
                  >
                    task reminders
                  </Text>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    get a nudge 5 minutes before tasks begin.
                  </Text>
                </View>
                <View
                  style={{
                    width: 48,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: taskReminders
                      ? themeColors.primary
                      : "#D1D5DB",
                    padding: 2,
                    justifyContent: "center",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      const newValue = !taskReminders;
                      setTaskReminders(newValue);
                      updateSettingsMutation.mutate({
                        task_reminders: newValue,
                      });
                    }}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: "#FFF",
                      alignSelf: taskReminders ? "flex-end" : "flex-start",
                    }}
                  />
                </View>
              </View>

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
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "#374151",
                      marginBottom: 2,
                    }}
                  >
                    mood check-ins
                  </Text>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    gentle reminders every 3 hours to see how you are.
                  </Text>
                </View>
                <View
                  style={{
                    width: 48,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: moodCheckins
                      ? themeColors.primary
                      : "#D1D5DB",
                    padding: 2,
                    justifyContent: "center",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      const newValue = !moodCheckins;
                      setMoodCheckins(newValue);
                      updateSettingsMutation.mutate({
                        mood_checkins: newValue,
                      });
                    }}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: "#FFF",
                      alignSelf: moodCheckins ? "flex-end" : "flex-start",
                    }}
                  />
                </View>
              </View>
            </View>
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
                style={{ fontSize: 16, fontWeight: "bold", color: "#374151" }}
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

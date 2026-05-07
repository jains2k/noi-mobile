import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import {
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Sparkles,
  Circle,
  Smile,
  Heart,
  BookOpen,
  CheckSquare,
  CheckCircle2,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/auth/useUser";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/utils/auth/useAuth";
import { apiFetch } from "@/utils/api";

export default function Dashboard() {
  const { data: user } = useUser();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [brainDump, setBrainDump] = useState("");
  const [currentEnergy, setCurrentEnergy] = useState("medium");
  const [currentMood, setCurrentMood] = useState(3);
  const [suggestion, setSuggestion] = useState("");
  const [isSorting, setIsSorting] = useState(false);

  const [timeInfo, setTimeInfo] = useState({ greeting: "", Icon: Sunrise });
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeInfo({ greeting: "good morning", Icon: Sunrise });
    else if (hour < 17) setTimeInfo({ greeting: "good afternoon", Icon: Sun });
    else if (hour < 21) setTimeInfo({ greeting: "good evening", Icon: Sunset });
    else setTimeInfo({ greeting: "good night", Icon: Moon });
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/tasks");
        if (!res.ok) return [];
        return res.json();
      } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
      }
    },
    enabled: !!isAuthenticated,
    retry: false,
  });

  const { data: moodLogs = [] } = useQuery({
    queryKey: ["moods"],
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/mood");
        if (!res.ok) return [];
        return res.json();
      } catch (error) {
        console.error("Error fetching moods:", error);
        return [];
      }
    },
    enabled: !!isAuthenticated,
    retry: false,
  });

  const canLogMood = () => {
    if (moodLogs.length === 0) return true;
    const lastMood = moodLogs[0];
    const lastMoodTime = new Date(lastMood.created_at);
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    return lastMoodTime < threeHoursAgo;
  };

  const activeTasks = tasks.filter((t) => t.status === "active").slice(0, 5);

  const saveMoodMutation = useMutation({
    mutationFn: async (moodData) => {
      try {
        const res = await apiFetch("/api/mood", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(moodData),
        });
        if (!res.ok) throw new Error("Failed to save mood");
        return res.json();
      } catch (error) {
        console.error("Error saving mood:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moods"] });
      suggestionMutation.mutate({ energy: currentEnergy, mood: currentMood });
    },
  });

  const magicSortMutation = useMutation({
    mutationFn: async (text) => {
      setIsSorting(true);
      try {
        const res = await apiFetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "magic-sort", text }),
        });
        if (!res.ok) throw new Error("magic sort failed");
        return res.json();
      } catch (error) {
        console.error("Error with magic sort:", error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      try {
        for (const task of data.tasks) {
          await apiFetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: task.title,
              energy_level: task.energy_level,
              estimated_time: task.estimated_time,
              status: "active",
            }),
          });
        }
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        setBrainDump("");
      } catch (error) {
        console.error("Error creating tasks:", error);
      } finally {
        setIsSorting(false);
      }
    },
    onError: (error) => {
      console.error("Magic sort error:", error);
      setIsSorting(false);
    },
  });

  const suggestionMutation = useMutation({
    mutationFn: async ({ energy, mood }) => {
      try {
        const res = await apiFetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "task-suggestion",
            energy,
            mood: mood || currentMood,
          }),
        });
        if (!res.ok) return { suggestion: "" };
        return res.json();
      } catch (error) {
        console.error("Error getting suggestion:", error);
        return { suggestion: "" };
      }
    },
    onSuccess: (data) => setSuggestion(data.suggestion || ""),
  });

  useEffect(() => {
    if (currentEnergy && currentMood) {
      suggestionMutation.mutate({ energy: currentEnergy, mood: currentMood });
    }
  }, []);

  const affirmations = [
    "you are doing enough.",
    "be gentle with yourself today.",
    "small steps are still progress.",
    "your worth is not your productivity.",
    "it's okay to rest.",
    "you have everything you need.",
  ];
  const [affirmation, setAffirmation] = useState(affirmations[0]);
  useEffect(() => {
    const interval = setInterval(() => {
      setAffirmation(
        affirmations[Math.floor(Math.random() * affirmations.length)],
      );
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Shell>
      <StatusBar style="dark" />
      <View style={{ padding: 20, gap: 40 }}>
        {/* Header */}
        <View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <timeInfo.Icon size={32} color="#A78BFA" />
            <Text
              style={{ fontSize: 28, fontWeight: "bold", color: "#A78BFA" }}
            >
              {timeInfo.greeting}, {user?.email?.split("@")[0]}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Heart size={16} color="#FB7185" fill="#FFC0CB" />
            <Text style={{ fontSize: 16, color: "#6B7280" }}>
              {affirmation}
            </Text>
          </View>
        </View>

        {/* Energy Selector */}
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            padding: 16,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "500", color: "#6B7280" }}>
            current energy:
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["low", "medium", "high"].map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => {
                  setCurrentEnergy(e);
                  suggestionMutation.mutate({ energy: e, mood: currentMood });
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor:
                    currentEnergy === e ? "#A78BFA" : "rgba(255,255,255,0.5)",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: currentEnergy === e ? "#FFF" : "#9CA3AF",
                  }}
                >
                  {e}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Suggestion */}
        {suggestion !== "" && (
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              padding: 24,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: "#A78BFA",
              borderStyle: "dashed",
              flexDirection: "row",
              gap: 16,
            }}
          >
            <Sparkles size={24} color="#A78BFA" />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#A78BFA",
                  marginBottom: 4,
                }}
              >
                noi suggests:
              </Text>
              <Text style={{ fontSize: 14, color: "#374151", lineHeight: 20 }}>
                {suggestion}
              </Text>
            </View>
          </View>
        )}

        {/* Mood Check-in */}
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            padding: 32,
            borderRadius: 32,
            borderWidth: 2,
            borderColor: "#A78BFA",
            alignItems: "center",
            gap: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.5)",
              padding: 16,
              borderRadius: 999,
            }}
          >
            <Smile size={40} color="#A78BFA" />
          </View>
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#1F2937",
                marginBottom: 4,
                textAlign: "center",
              }}
            >
              how are you feeling right now?
            </Text>
            {!canLogMood() ? (
              <View style={{ alignItems: "center", gap: 8 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#6B7280",
                    textAlign: "center",
                  }}
                >
                  you logged your mood recently. check back in a bit! ✦
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#9CA3AF",
                    fontStyle: "italic",
                  }}
                >
                  next mood check available in{" "}
                  {Math.ceil(
                    (new Date(moodLogs[0]?.created_at).getTime() +
                      3 * 60 * 60 * 1000 -
                      Date.now()) /
                      (60 * 1000),
                  )}{" "}
                  minutes
                </Text>
              </View>
            ) : (
              <Text
                style={{ fontSize: 14, color: "#6B7280", textAlign: "center" }}
              >
                taking a moment to check in helps maintain balance.
              </Text>
            )}
          </View>
          {canLogMood() ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "center",
              }}
            >
              {[
                { emoji: "😢", label: "sad", score: 1 },
                { emoji: "😐", label: "neutral", score: 2 },
                { emoji: "🙂", label: "okay", score: 3 },
                { emoji: "😊", label: "happy", score: 4 },
                { emoji: "✨", label: "radiant", score: 5 },
                { emoji: "😴", label: "tired", score: 2 },
                { emoji: "🧘", label: "peaceful", score: 4 },
                { emoji: "😰", label: "anxious", score: 2 },
                { emoji: "😤", label: "frustrated", score: 2 },
              ].map((m, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={async () => {
                    setCurrentMood(m.score);
                    await saveMoodMutation.mutateAsync({
                      score: m.score,
                      emoji: m.emoji,
                      note: m.label,
                      energy_level: currentEnergy,
                    });
                  }}
                  disabled={saveMoodMutation.isLoading}
                  style={{
                    width: 80,
                    height: 96,
                    backgroundColor: "rgba(255, 255, 255, 0.4)",
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    opacity: saveMoodMutation.isLoading ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontSize: 32 }}>{m.emoji}</Text>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      color: "#9CA3AF",
                    }}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {saveMoodMutation.isLoading && (
            <ActivityIndicator size="small" color="#A78BFA" />
          )}
        </View>

        {/* Brain Dump */}
        <View style={{ gap: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <BookOpen size={16} color="#6B7280" />
              <Text
                style={{ fontSize: 14, fontWeight: "bold", color: "#374151" }}
              >
                brain dump
              </Text>
            </View>
          </View>
          <View style={{ position: "relative" }}>
            <TextInput
              value={brainDump}
              onChangeText={setBrainDump}
              placeholder="what's on your mind? don't worry about order..."
              placeholderTextColor="#D1D5DB"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.4)",
                padding: 24,
                borderRadius: 24,
                fontSize: 14,
                color: "#374151",
                minHeight: 192,
              }}
            />
            <TouchableOpacity
              disabled={!brainDump.trim() || isSorting}
              onPress={() => magicSortMutation.mutate(brainDump)}
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 24,
                paddingVertical: 8,
                backgroundColor:
                  brainDump.trim() && !isSorting ? "#A78BFA" : "#D1D5DB",
                borderRadius: 16,
                shadowColor: "#A78BFA",
                shadowOpacity: 0.2,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              {isSorting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text
                    style={{ color: "#FFF", fontSize: 14, fontWeight: "bold" }}
                  >
                    magic sort
                  </Text>
                  <Sparkles size={16} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Tasks */}
        <View style={{ gap: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <CheckSquare size={16} color="#6B7280" />
              <Text
                style={{ fontSize: 14, fontWeight: "bold", color: "#374151" }}
              >
                active tasks
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: "#A78BFA" }}>view all</Text>
          </View>
          <View style={{ gap: 12 }}>
            {activeTasks.length === 0 ? (
              <View
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.4)",
                  padding: 32,
                  borderRadius: 24,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#9CA3AF", fontStyle: "italic" }}>
                  no tasks yet. try a brain dump! ✦
                </Text>
              </View>
            ) : (
              activeTasks.map((task) => (
                <View
                  key={task.id}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.4)",
                    padding: 16,
                    borderRadius: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor:
                          task.energy_level === "high"
                            ? "#FB7185"
                            : task.energy_level === "medium"
                              ? "#FBBF24"
                              : "#4ADE80",
                      }}
                    />
                    <Text style={{ color: "#374151", fontSize: 14 }}>
                      {task.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      await apiFetch(`/api/tasks/${task.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          status: "completed",
                          completed_at: new Date().toISOString(),
                        }),
                      });
                      queryClient.invalidateQueries({ queryKey: ["tasks"] });
                    }}
                  >
                    <Circle size={20} color="#D1D5DB" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </Shell>
  );
}

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useState } from "react";
import Shell from "@/components/Shell";
import {
  Sparkles,
  MessageSquare,
  Star,
  Lightbulb,
  X,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/utils/ThemeProvider";
import { useAuth } from "@/utils/auth/useAuth";
import { apiFetch } from "@/utils/api";

export default function JournalPage() {
  const queryClient = useQueryClient();
  const { themeColors, fontFamily } = useTheme();
  const { isAuthenticated } = useAuth();
  const [content, setContent] = useState("");
  const [moodScore, setMoodScore] = useState(3);
  const [isReflecting, setIsReflecting] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [dailyInsights, setDailyInsights] = useState(null);

  const { data: entries = [] } = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/journal");
        if (!res.ok) return [];
        return res.json();
      } catch (error) {
        console.error("Error fetching journal entries:", error);
        return [];
      }
    },
    enabled: !!isAuthenticated,
    retry: false,
  });

  const saveEntryMutation = useMutation({
    mutationFn: async (entry) => {
      setIsReflecting(true);
      try {
        // Try AI reflection but don't block saving if it fails
        let ai_reflection = null;
        let ai_suggestions = null;
        try {
          const aiRes = await apiFetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "journal-reflection",
              text: entry.content,
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            ai_reflection = aiData.reflection ?? null;
            ai_suggestions = aiData.suggestions ?? null;
          }
        } catch (_) {
          // AI is optional — proceed without it
        }

        const res = await apiFetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...entry,
            ai_reflection,
            ai_suggestions,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to save journal entry");
        }

        return res.json();
      } catch (error) {
        console.error("Error saving journal entry:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setContent("");
      setMoodScore(3);
      setIsReflecting(false);
    },
    onError: (error) => {
      console.error("Failed to save journal entry:", error);
      setIsReflecting(false);
    },
  });

  const insightsMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await apiFetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "daily-insights" }),
        });
        if (!res.ok)
          return { reflection: "", action_items: [], encouragement: "" };
        return res.json();
      } catch (error) {
        console.error("Error getting insights:", error);
        return { reflection: "", action_items: [], encouragement: "" };
      }
    },
    onSuccess: (data) => {
      setDailyInsights(data);
      setShowInsights(true);
    },
  });

  const moodEmojis = ["😢", "😐", "🙂", "😊", "✨"];

  return (
    <Shell>
      <StatusBar style="dark" />
      <View style={{ padding: 20, gap: 40 }}>
        {/* Header */}
        <View>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "bold",
              color: "#1F2937",
              marginBottom: 8,
              fontFamily,
            }}
          >
            journal
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", fontFamily }}>
            write your heart out. noi is listening.
          </Text>
        </View>

        {/* New Entry */}
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            padding: 32,
            borderRadius: 32,
            borderWidth: 2,
            borderColor: themeColors.primary,
            gap: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: 2,
                color: "#9CA3AF",
              }}
            >
              {format(new Date(), "EEEE, MMMM do")}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {moodEmojis.map((emoji, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setMoodScore(i + 1)}
                  style={{
                    padding: 8,
                    borderRadius: 12,
                    backgroundColor:
                      moodScore === i + 1
                        ? "rgba(255, 255, 255, 0.4)"
                        : "transparent",
                    opacity: moodScore === i + 1 ? 1 : 0.4,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="how was your day? what made you smile?"
            placeholderTextColor="#D1D5DB"
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            style={{
              backgroundColor: "transparent",
              fontSize: 16,
              color: "#374151",
              minHeight: 256,
            }}
          />

          <TouchableOpacity
            disabled={!content.trim() || isReflecting}
            onPress={() =>
              saveEntryMutation.mutate({ content, mood_score: moodScore })
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 16,
              backgroundColor:
                content.trim() && !isReflecting
                  ? themeColors.primary
                  : "#D1D5DB",
              borderRadius: 16,
              shadowColor: themeColors.primary,
              shadowOpacity: 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            {isReflecting ? (
              <>
                <ActivityIndicator size="small" color="#FFF" />
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 16,
                    fontWeight: "bold",
                    fontFamily,
                  }}
                >
                  noi is reflecting...
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 16,
                    fontWeight: "bold",
                    fontFamily,
                  }}
                >
                  save reflection
                </Text>
                <Sparkles size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Past Reflections */}
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MessageSquare size={16} color="#6B7280" />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "bold",
                color: "#374151",
                fontFamily,
              }}
            >
              past reflections
            </Text>
          </View>
          {entries.map((entry) => (
            <View
              key={entry.id}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.4)",
                padding: 32,
                borderRadius: 24,
                gap: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    color: "#9CA3AF",
                  }}
                >
                  {format(new Date(entry.created_at), "MMM d, yyyy")}
                </Text>
                <Text style={{ fontSize: 24 }}>
                  {moodEmojis[entry.mood_score - 1]}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  color: "#374151",
                  fontStyle: "italic",
                  borderLeftWidth: 4,
                  borderLeftColor: "rgba(167, 139, 250, 0.2)",
                  paddingLeft: 16,
                  lineHeight: 20,
                }}
              >
                {entry.content}
              </Text>
              {entry.ai_reflection && (
                <View
                  style={{
                    backgroundColor: "rgba(167, 139, 250, 0.05)",
                    padding: 24,
                    borderRadius: 16,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Sparkles size={16} color="#A78BFA" />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#A78BFA",
                      }}
                    >
                      noi's reflection
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      fontStyle: "italic",
                      lineHeight: 18,
                    }}
                  >
                    "{entry.ai_reflection}"
                  </Text>
                  {entry.ai_suggestions && (
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {entry.ai_suggestions.map((s, i) => (
                        <View
                          key={i}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            backgroundColor: "#FFF",
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: "rgba(167, 139, 250, 0.2)",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "bold",
                              color: "#A78BFA",
                            }}
                          >
                            ✧ {s}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Monthly Charm */}
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            padding: 32,
            borderRadius: 32,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: "rgba(167, 139, 250, 0.2)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Star size={32} color="#A78BFA" style={{ marginBottom: 16 }} />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: "#1F2937",
              marginBottom: 8,
            }}
          >
            monthly charm
          </Text>
          <Text style={{ fontSize: 12, color: "#6B7280", lineHeight: 18 }}>
            you've completed {entries.length} reflections this month. your
            spirit is growing brighter. ✦
          </Text>
          <View
            style={{
              position: "absolute",
              bottom: -24,
              right: -24,
              opacity: 0.1,
            }}
          >
            <Star size={96} color="#A78BFA" fill="#A78BFA" />
          </View>
        </View>

        {/* Get Insights Button */}
        <TouchableOpacity
          onPress={() => insightsMutation.mutate()}
          disabled={insightsMutation.isLoading}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            paddingVertical: 16,
            backgroundColor: insightsMutation.isLoading
              ? "#D1D5DB"
              : themeColors.primary,
            borderRadius: 24,
            shadowColor: themeColors.primary,
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Lightbulb size={20} color="#FFF" />
          <Text
            style={{
              color: "#FFF",
              fontSize: 16,
              fontWeight: "bold",
              fontFamily,
            }}
          >
            {insightsMutation.isLoading
              ? "analyzing..."
              : "get today's insights"}
          </Text>
          <Sparkles size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Insights Modal */}
      <Modal
        visible={showInsights && dailyInsights !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInsights(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.2)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFF",
              borderRadius: 32,
              padding: 32,
              maxHeight: "90%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Star size={32} color="#A78BFA" fill="#A78BFA" />
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    color: "#1F2937",
                    fontFamily,
                  }}
                >
                  today's insights
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowInsights(false)}>
                <X size={28} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {dailyInsights && (
                <View style={{ gap: 24 }}>
                  <View
                    style={{
                      backgroundColor: "rgba(167, 139, 250, 0.05)",
                      padding: 24,
                      borderRadius: 16,
                      borderLeftWidth: 4,
                      borderLeftColor: "#A78BFA",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <Sparkles size={16} color="#A78BFA" />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "bold",
                          color: "#A78BFA",
                        }}
                      >
                        noi's reflection
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#374151",
                        fontStyle: "italic",
                        lineHeight: 20,
                      }}
                    >
                      {dailyInsights.reflection}
                    </Text>
                  </View>

                  <View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <Lightbulb size={16} color="#6B7280" />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#374151",
                        }}
                      >
                        what you can do next
                      </Text>
                    </View>
                    <View style={{ gap: 8 }}>
                      {dailyInsights.action_items.map((item, i) => (
                        <View
                          key={i}
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.4)",
                            padding: 16,
                            borderRadius: 12,
                            flexDirection: "row",
                            gap: 12,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "bold",
                              color: "#A78BFA",
                            }}
                          >
                            {i + 1}.
                          </Text>
                          <Text
                            style={{ fontSize: 14, color: "#374151", flex: 1 }}
                          >
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor: "rgba(251, 207, 232, 0.2)",
                      padding: 24,
                      borderRadius: 16,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#374151",
                        fontWeight: "500",
                        textAlign: "center",
                        lineHeight: 20,
                      }}
                    >
                      ✦ {dailyInsights.encouragement} ✦
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Shell>
  );
}

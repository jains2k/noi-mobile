import { View, Text, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { Play, Pause, RotateCcw, Star } from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/utils/ThemeProvider";
import { apiFetch } from "@/utils/api";

export default function FocusPage() {
  const queryClient = useQueryClient();
  const { themeColors } = useTheme();
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [isBreak, setIsBreak] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);

      if (!isBreak) {
        saveSessionMutation.mutate({ duration: focusDuration });
        setIsBreak(true);
        setTimeLeft(breakDuration * 60);
      } else {
        setIsBreak(false);
        setTimeLeft(focusDuration * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak, focusDuration, breakDuration]);

  const saveSessionMutation = useMutation({
    mutationFn: async (session) => {
      try {
        const res = await apiFetch("/api/focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session),
        });
        if (!res.ok) return null;
        return res.json();
      } catch (error) {
        console.error("Error saving focus session:", error);
        return null;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["focus"] }),
  });

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(focusDuration * 60);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <Shell>
      <StatusBar style="dark" />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          gap: 48,
        }}
      >
        <View style={{ alignItems: "center", gap: 16 }}>
          <Text style={{ fontSize: 32, fontWeight: "bold", color: "#1F2937" }}>
            focus flow
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280" }}>
            immerse yourself in gentle productivity.
          </Text>
        </View>

        {/* Timer Circle */}
        <View style={{ position: "relative" }}>
          <View
            style={{
              width: 320,
              height: 320,
              borderRadius: 160,
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              borderWidth: 4,
              borderColor: "rgba(255, 255, 255, 0.4)",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: themeColors.primary,
              shadowOpacity: 0.1,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <Text
              style={{
                fontSize: 60,
                fontWeight: "bold",
                color: isBreak ? "#4ADE80" : themeColors.primary,
                marginBottom: 8,
              }}
            >
              {formatTime(timeLeft)}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "bold",
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {isBreak ? "break time" : "focus"}
            </Text>
          </View>
          <View style={{ position: "absolute", top: -16, right: -16 }}>
            <Star
              size={32}
              color={themeColors.primary}
              fill={themeColors.primary}
              opacity={0.4}
            />
          </View>
        </View>

        {/* Duration Controls */}
        <View style={{ flexDirection: "row", gap: 32 }}>
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              padding: 24,
              borderRadius: 24,
              gap: 12,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "bold",
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              focus duration
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <TouchableOpacity
                onPress={() => setFocusDuration(Math.max(1, focusDuration - 5))}
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: "rgba(255, 255, 255, 0.4)",
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 18, color: "#6B7280" }}>-</Text>
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#1F2937",
                  width: 64,
                  textAlign: "center",
                }}
              >
                {focusDuration}m
              </Text>
              <TouchableOpacity
                onPress={() => setFocusDuration(focusDuration + 5)}
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: "rgba(255, 255, 255, 0.4)",
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 18, color: "#6B7280" }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              padding: 24,
              borderRadius: 24,
              gap: 12,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "bold",
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              break duration
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <TouchableOpacity
                onPress={() => setBreakDuration(Math.max(1, breakDuration - 1))}
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: "rgba(255, 255, 255, 0.4)",
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 18, color: "#6B7280" }}>-</Text>
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#1F2937",
                  width: 64,
                  textAlign: "center",
                }}
              >
                {breakDuration}m
              </Text>
              <TouchableOpacity
                onPress={() => setBreakDuration(breakDuration + 1)}
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: "rgba(255, 255, 255, 0.4)",
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 18, color: "#6B7280" }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Timer Controls */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 24 }}>
          <TouchableOpacity
            onPress={resetTimer}
            style={{
              padding: 16,
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              borderRadius: 999,
            }}
          >
            <RotateCcw size={24} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleTimer}
            style={{
              width: 80,
              height: 80,
              backgroundColor: themeColors.primary,
              borderRadius: 40,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: themeColors.primary,
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            {isActive ? (
              <Pause size={32} color="#FFF" fill="#FFF" />
            ) : (
              <Play
                size={32}
                color="#FFF"
                fill="#FFF"
                style={{ marginLeft: 4 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Shell>
  );
}

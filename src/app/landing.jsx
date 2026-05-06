import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Star,
  Sparkles,
  LayoutGrid,
  CheckSquare,
  Timer,
  BookOpen,
  ChevronRight,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/utils/auth/useAuth";
import { useEffect } from "react";

export default function LandingPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, isAuthenticated, isReady } = useAuth();

  // If user is authenticated, redirect to dashboard
  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isReady, isAuthenticated, router]);

  const features = [
    {
      title: "brain dump",
      desc: "voice or type your thoughts, noi sorts them for you.",
      icon: LayoutGrid,
    },
    {
      title: "energy based",
      desc: "organize tasks by your energy levels, not just urgency.",
      icon: CheckSquare,
    },
    {
      title: "focus flow",
      desc: "pomodoro timer with ambient sounds for deep work.",
      icon: Timer,
    },
    {
      title: "journaling",
      desc: "reflect on your day with gentle ai-powered insights.",
      icon: BookOpen,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#FAF5FF" }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 60,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 24,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 48 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <Star size={48} color="#A78BFA" fill="#A78BFA" />
            <Text
              style={{ fontSize: 56, fontWeight: "bold", color: "#A78BFA" }}
            >
              noi
            </Text>
          </View>
          <Text
            style={{
              fontSize: 24,
              color: "#6B7280",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            productivity that feels good
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 4,
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              borderRadius: 999,
            }}
          >
            <Sparkles size={12} color="#A78BFA" />
            <Text style={{ fontSize: 12, color: "#A78BFA", fontWeight: "500" }}>
              simple, cute, chaos-free
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => signIn()}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 32,
            paddingVertical: 16,
            backgroundColor: "#A78BFA",
            borderRadius: 16,
            marginBottom: 80,
            shadowColor: "#A78BFA",
            shadowOpacity: 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "bold" }}>
            start your journey
          </Text>
          <ChevronRight size={16} color="#FFF" />
        </TouchableOpacity>

        <View style={{ gap: 24, width: "100%" }}>
          {features.map((f, i) => (
            <View
              key={f.title}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.4)",
                padding: 32,
                borderRadius: 24,
                borderWidth: 2,
                borderColor: "#A78BFA",
              }}
            >
              <f.icon size={40} color="#A78BFA" style={{ marginBottom: 16 }} />
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  marginBottom: 8,
                  color: "#1F2937",
                }}
              >
                {f.title}
              </Text>
              <Text style={{ fontSize: 14, color: "#6B7280", lineHeight: 20 }}>
                {f.desc}
              </Text>
            </View>
          ))}
        </View>

        <Text style={{ marginTop: 96, color: "#9CA3AF", fontSize: 12 }}>
          built with love by noi ✦ 2026
        </Text>
      </ScrollView>
    </View>
  );
}

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Star,
  LayoutGrid,
  CheckSquare,
  Timer,
  BookOpen,
  Calendar,
  Settings,
} from "lucide-react-native";
import { useRouter, usePathname } from "expo-router";
import { useTheme } from "@/utils/ThemeProvider";
import { useKeyboardAwareScroll } from "@/utils/useKeyboardAwareScroll";

const TAB_ITEMS = [
  { name: "home", icon: LayoutGrid, href: "/dashboard" },
  { name: "tasks", icon: CheckSquare, href: "/tasks" },
  { name: "focus", icon: Timer, href: "/focus" },
  { name: "journal", icon: BookOpen, href: "/journal" },
  { name: "calendar", icon: Calendar, href: "/calendar" },
];

const TAB_BAR_HEIGHT = 60;

export default function Shell({ children }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { themeColors, fontFamily } = useTheme();
  const { scrollRef, onScroll } = useKeyboardAwareScroll();

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bg1, fontFamily }}>
      {/* Top header */}
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingBottom: 8,
          paddingHorizontal: 20,
          backgroundColor: "rgba(255, 255, 255, 0.4)",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.2)",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Star size={20} color={themeColors.primary} fill={themeColors.primary} />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: themeColors.primary,
              fontFamily,
            }}
          >
            noi
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={{ padding: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Settings size={22} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        {children}
      </ScrollView>

      {/* Native iOS-style bottom tab bar */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: TAB_BAR_HEIGHT + insets.bottom,
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          borderTopWidth: 1,
          borderTopColor: "rgba(0, 0, 0, 0.06)",
          flexDirection: "row",
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
          elevation: 10,
        }}
      >
        {TAB_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard" && pathname === "/");
          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => router.push(item.href)}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "flex-start",
                paddingTop: 10,
                gap: 3,
              }}
              accessibilityRole="button"
              accessibilityLabel={item.name}
            >
              <item.icon
                size={24}
                color={isActive ? themeColors.primary : "#C4C9D4"}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? "700" : "500",
                  color: isActive ? themeColors.primary : "#C4C9D4",
                  fontFamily,
                }}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Floating star decoration */}
      <View
        style={{
          position: "absolute",
          bottom: TAB_BAR_HEIGHT + insets.bottom + 20,
          right: 40,
          opacity: 0.12,
          pointerEvents: "none",
        }}
      >
        <Star size={48} color={themeColors.primary} />
      </View>
    </View>
  );
}

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  PanResponder,
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
  Menu,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import { useTheme } from "@/utils/ThemeProvider";
import { useKeyboardAwareScroll } from "@/utils/useKeyboardAwareScroll";
import { shouldDismissBottomSheetGesture } from "@/utils/bottomSheetGestures";

export default function Shell({ children }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { data: user } = useUser();
  const { themeColors, fontFamily } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollRef, onScroll } = useKeyboardAwareScroll();

  const closeMenu = () => setMenuOpen(false);

  const menuPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderRelease: (_, gestureState) => {
          if (shouldDismissBottomSheetGesture(gestureState)) closeMenu();
        },
      }),
    [],
  );

  const handleSignOut = async () => {
    closeMenu();
    await signOut();
    router.replace("/landing");
  };

  const navItems = [
    { name: "dashboard", icon: LayoutGrid, href: "/dashboard" },
    { name: "tasks", icon: CheckSquare, href: "/tasks" },
    { name: "focus", icon: Timer, href: "/focus" },
    { name: "journal", icon: BookOpen, href: "/journal" },
    { name: "calendar", icon: Calendar, href: "/calendar" },
    { name: "settings", icon: Settings, href: "/settings" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bg1, fontFamily }}>
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
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
          onPress={() => setMenuOpen(true)}
          style={{ padding: 8 }}
        >
          <Menu size={24} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        {children}
      </ScrollView>

      {/* Menu Modal */}
      <Modal
        visible={menuOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeMenu}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)" }}>
          <Pressable
            style={{ flex: 1 }}
            onPress={closeMenu}
          />
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: themeColors.bg1,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingTop: 24,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: 20,
            }}
          >
            <View
              {...menuPanResponder.panHandlers}
              accessibilityRole="button"
              accessibilityLabel="Drag down to close navigation menu"
              style={{ alignItems: "center", paddingBottom: 12 }}
            >
              <View
                style={{
                  width: 42,
                  height: 5,
                  borderRadius: 999,
                  backgroundColor: "rgba(156, 163, 175, 0.55)",
                }}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Star
                  size={24}
                  color={themeColors.primary}
                  fill={themeColors.primary}
                />
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    color: themeColors.primary,
                    fontFamily,
                  }}
                >
                  noi
                </Text>
              </View>
              <TouchableOpacity onPress={closeMenu}>
                <X size={28} color={themeColors.primary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, marginBottom: 24 }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <TouchableOpacity
                    key={item.name}
                    onPress={() => {
                      router.push(item.href);
                      closeMenu();
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 16,
                      backgroundColor: isActive
                        ? "rgba(255, 255, 255, 0.4)"
                        : "transparent",
                    }}
                  >
                    <item.icon
                      size={20}
                      color={isActive ? themeColors.primary : "#9CA3AF"}
                    />
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: isActive ? "600" : "400",
                        color: isActive ? themeColors.primary : "#6B7280",
                        fontFamily,
                      }}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {user && (
              <View
                style={{
                  paddingTop: 20,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255, 255, 255, 0.3)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: themeColors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFF",
                      fontWeight: "bold",
                      fontSize: 16,
                      fontFamily,
                    }}
                  >
                    {user.email?.[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: "#374151",
                      fontFamily,
                    }}
                  >
                    {user.email?.split("@")[0]}
                  </Text>
                  <TouchableOpacity onPress={handleSignOut}>
                    <Text
                      style={{ fontSize: 12, color: "#DC2626", fontFamily }}
                    >
                      sign out
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Pressable>
        </View>
      </Modal>

      {/* Floating decoration */}
      <View
        style={{
          position: "absolute",
          bottom: 40,
          right: 40,
          opacity: 0.2,
          pointerEvents: "none",
        }}
      >
        <Star size={48} color={themeColors.primary} />
      </View>
    </View>
  );
}

import { Stack, usePathname, useRouter } from "expo-router";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { AuthModal } from "@/utils/auth/useAuthModal";
import { useAuth } from "@/utils/auth/useAuth";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { ThemeProvider } from "@/utils/ThemeProvider";
import { View, ActivityIndicator, AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { apiFetch } from "@/utils/api";
import {
  cleanupUserNotifications,
  completePlanningRemindersForToday,
  configurePlanningNotificationActions,
  PLANNING_DONE_ACTION,
  PLANNING_SNOOZE_ACTION,
  reconcileNotifications,
} from "@/utils/notifications";
import {
  useFonts,
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
} from "@expo-google-fonts/fredoka";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
} from "@expo-google-fonts/quicksand";
import {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
} from "@expo-google-fonts/lexend";
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono";

SplashScreen.preventAutoHideAsync();

// Routes that are reachable while signed out. Everything else requires auth, so
// when the session is cleared (e.g. a 401 invalidated a stale token) we send the
// user back to the landing screen instead of leaving them on a broken UI.
const PUBLIC_ROUTES = ["/", "/landing"];

function SessionGuard() {
  const { isReady, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace("/landing");
    }
  }, [isReady, isAuthenticated, pathname, router]);

  return null;
}

/**
 * Keeps the signed-in user's local notification schedule aligned with server
 * task state and handles navigation from foreground and cold-start taps.
 *
 * This lives above the route screens so task mutations in any screen share the
 * same React Query cache and trigger a reconciliation.
 */
function NotificationCoordinator() {
  const { auth, isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const userId = auth?.user?.id;
  const previousUserIdRef = useRef(null);
  const handledResponseRef = useRef(null);

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const response = await apiFetch("/api/tasks");
      if (!response.ok) {
        throw new Error(`Failed to load tasks (${response.status})`);
      }
      return response.json();
    },
    enabled: !!isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    configurePlanningNotificationActions().catch((error) => {
      console.error("Failed to configure planning reminder actions:", error);
    });
  }, []);

  const reconcile = useCallback(
    async (tasks) => {
      if (!isAuthenticated || !userId || !Array.isArray(tasks)) return;

      try {
        await reconcileNotifications(tasks, { userId });
      } catch (error) {
        console.error("Failed to reconcile notifications:", error);
      }
    },
    [isAuthenticated, userId]
  );

  useEffect(() => {
    if (tasksQuery.isSuccess) {
      reconcile(tasksQuery.data);
    }
  }, [reconcile, tasksQuery.data, tasksQuery.isSuccess]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state !== "active" || !isAuthenticated) return;

      const result = await tasksQuery.refetch();
      if (result.isSuccess) {
        await reconcile(result.data);
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, reconcile, tasksQuery.refetch]);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    if (previousUserId && previousUserId !== userId) {
      cleanupUserNotifications(previousUserId).catch((error) => {
        console.error("Failed to clean up signed-out user notifications:", error);
      });
    }
    previousUserIdRef.current = userId ?? null;
  }, [userId]);

  const handleNotificationResponse = useCallback(
    async (response) => {
      if (!isReady || !isAuthenticated || !response) return;

      const identifier = response.notification?.request?.identifier;
      if (identifier && handledResponseRef.current === identifier) return;
      handledResponseRef.current = identifier ?? response;

      if (response.actionIdentifier === PLANNING_DONE_ACTION) {
        try {
          await completePlanningRemindersForToday(userId);
        } catch (error) {
          console.error("Failed to complete planning reminders:", error);
        }
        return;
      }

      if (response.actionIdentifier === PLANNING_SNOOZE_ACTION) {
        // Dismissing via Snooze leaves the next configured planning reminder in place.
        return;
      }

      const taskId = response.notification?.request?.content?.data?.taskId;
      router.push(taskId ? { pathname: "/tasks", params: { taskId } } : "/tasks");
    },
    [isAuthenticated, isReady, router, tasksQuery.data, userId]
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );
    Notifications.getLastNotificationResponseAsync()
      .then(handleNotificationResponse)
      .catch((error) => {
        console.error("Failed to read the last notification response:", error);
      });

    return () => subscription.remove();
  }, [handleNotificationResponse]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  },
});

export default function RootLayout() {
  const { initiate, isReady } = useAuth();

  const [fontsLoaded, fontError] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    SpaceMono_400Regular,
  });

  useEffect(() => {
    initiate();
  }, [initiate]);

  useEffect(() => {
    if ((isReady && fontsLoaded) || fontError) {
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded, fontError]);

  if (!isReady || (!fontsLoaded && !fontError)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FAF5FF",
        }}
      >
        <ActivityIndicator size="large" color="#A78BFA" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="landing" options={{ headerShown: false }} />
              <Stack.Screen name="dashboard" options={{ headerShown: false }} />
              <Stack.Screen name="tasks" options={{ headerShown: false }} />
              <Stack.Screen name="journal" options={{ headerShown: false }} />
              <Stack.Screen name="focus" options={{ headerShown: false }} />
              <Stack.Screen name="calendar" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
            </Stack>
            <SessionGuard />
            <NotificationCoordinator />
            <AuthModal />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

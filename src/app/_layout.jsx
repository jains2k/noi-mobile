import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthModal } from "@/utils/auth/useAuthModal";
import { useAuth } from "@/utils/auth/useAuth";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "@/utils/ThemeProvider";
import { View, ActivityIndicator } from "react-native";
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
          <AuthModal />
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

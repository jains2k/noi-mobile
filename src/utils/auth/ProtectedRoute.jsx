import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./useAuth";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/landing");
    }
  }, [isReady, isAuthenticated, router]);

  if (!isReady || !isAuthenticated) {
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

  return children;
}

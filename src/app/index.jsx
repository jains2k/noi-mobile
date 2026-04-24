import { Redirect } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
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

  return <Redirect href={isAuthenticated ? "/dashboard" : "/landing"} />;
}

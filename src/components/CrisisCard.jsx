import { View, Text } from "react-native";
import { LifeBuoy } from "lucide-react-native";

export default function CrisisCard({ message, resources = [] }) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: "#FFF1F2",
        borderColor: "#FDA4AF",
        borderWidth: 2,
        borderRadius: 24,
        padding: 20,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <LifeBuoy size={18} color="#BE123C" />
        <Text style={{ fontSize: 14, fontWeight: "bold", color: "#BE123C" }}>
          you're not alone
        </Text>
      </View>
      <Text style={{ fontSize: 14, lineHeight: 20, color: "#881337" }}>
        {message}
      </Text>
      <View style={{ gap: 6 }}>
        {resources.map((r, i) => (
          <Text key={i} style={{ fontSize: 14, fontWeight: "500", color: "#9F1239" }}>
            • {r}
          </Text>
        ))}
      </View>
    </View>
  );
}

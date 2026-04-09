import { ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ScreenShell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2d145d", "#140a2a", "#090511"]}
      locations={[0, 0.4, 1]}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 90,
          paddingHorizontal: 16,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </LinearGradient>
  );
}

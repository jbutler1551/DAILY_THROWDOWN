import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Pill } from "./Pill";

export function PlayerCard({
  name,
  subtitle,
  streakDays,
  side,
}: {
  name: string;
  subtitle?: string;
  streakDays?: number;
  side?: "left" | "right";
}) {
  const align = side === "right" ? "items-end" : "items-start";

  return (
    <View className={`flex-1 gap-1 ${align}`}>
      <LinearGradient
        colors={["#e879f9", "#8b5cf6"]}
        className="h-12 w-12 items-center justify-center rounded-full"
      >
        <Text className="text-lg font-black text-white">
          {name.charAt(0).toUpperCase()}
        </Text>
      </LinearGradient>
      <Text className="mt-1 text-base font-bold text-white">{name}</Text>
      {subtitle && (
        <Text className="text-xs text-white/50">{subtitle}</Text>
      )}
      {streakDays != null && streakDays > 0 && (
        <Pill color="green">{`${streakDays}-day streak`}</Pill>
      )}
    </View>
  );
}

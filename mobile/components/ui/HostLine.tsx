import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export function HostLine({
  children,
  slot,
}: {
  children: string;
  slot?: string;
}) {
  return (
    <LinearGradient
      colors={["rgba(217,70,239,0.1)", "rgba(139,92,246,0.08)", "rgba(34,211,238,0.08)"]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      className="rounded-2xl border border-fuchsia-300/15 px-4 py-3"
    >
      {slot && (
        <Text className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-fuchsia-200/50">
          {slot}
        </Text>
      )}
      <Text className="text-sm font-medium leading-6 text-white/90">
        &ldquo;{children}&rdquo;
      </Text>
    </LinearGradient>
  );
}

import { View, Text } from "react-native";

const valueColors = {
  default: "text-white",
  green: "text-emerald-200",
  amber: "text-amber-200",
  fuchsia: "text-fuchsia-200",
  cyan: "text-cyan-200",
} as const;

export function StatBox({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string | number;
  color?: keyof typeof valueColors;
}) {
  return (
    <View className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <Text className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </Text>
      <Text className={`mt-1 text-xl font-bold ${valueColors[color]}`}>
        {value}
      </Text>
    </View>
  );
}

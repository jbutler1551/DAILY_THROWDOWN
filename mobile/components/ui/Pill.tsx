import { View, Text } from "react-native";

const colorMap = {
  default: {
    border: "border-white/20",
    bg: "bg-white/10",
    text: "text-white/75",
  },
  green: {
    border: "border-emerald-400/30",
    bg: "bg-emerald-400/10",
    text: "text-emerald-200",
  },
  cyan: {
    border: "border-cyan-300/25",
    bg: "bg-cyan-400/10",
    text: "text-cyan-200",
  },
  amber: {
    border: "border-amber-300/25",
    bg: "bg-amber-400/10",
    text: "text-amber-200",
  },
  red: {
    border: "border-red-400/25",
    bg: "bg-red-400/10",
    text: "text-red-200",
  },
  fuchsia: {
    border: "border-fuchsia-400/25",
    bg: "bg-fuchsia-400/10",
    text: "text-fuchsia-200",
  },
} as const;

type PillColor = keyof typeof colorMap;

export function Pill({
  children,
  color = "default",
}: {
  children: string;
  color?: PillColor;
}) {
  const c = colorMap[color];

  return (
    <View
      className={`self-start rounded-full border px-3 py-1 ${c.border} ${c.bg}`}
    >
      <Text
        className={`text-[10px] font-semibold uppercase tracking-widest ${c.text}`}
      >
        {children}
      </Text>
    </View>
  );
}

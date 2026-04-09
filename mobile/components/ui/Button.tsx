import { Pressable, Text } from "react-native";

const variants = {
  primary: {
    bg: "bg-fuchsia-400",
    text: "text-slate-950 font-bold",
  },
  secondary: {
    bg: "border border-white/15 bg-white/5",
    text: "text-white font-semibold",
  },
  danger: {
    bg: "bg-red-500",
    text: "text-white font-bold",
  },
} as const;

export function Button({
  children,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  children: string;
  onPress?: () => void;
  variant?: keyof typeof variants;
  disabled?: boolean;
}) {
  const v = variants[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-full px-6 py-3 ${v.bg} ${disabled ? "opacity-40" : ""}`}
    >
      <Text className={`text-center text-sm ${v.text}`}>{children}</Text>
    </Pressable>
  );
}

import { View, Text } from "react-native";

export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-3xl border border-white/10 bg-white/5 p-5 ${className}`}
    >
      {title && (
        <View className="mb-4">
          <Text className="text-lg font-semibold text-white">{title}</Text>
          {subtitle && (
            <Text className="mt-1 text-xs text-white/50">{subtitle}</Text>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

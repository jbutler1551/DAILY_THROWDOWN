import { View, Text } from "react-native";

export function VsDivider({ score }: { score?: string }) {
  return (
    <View className="items-center justify-center gap-1 px-3">
      <Text className="text-2xl font-black text-fuchsia-300">VS</Text>
      {score && (
        <>
          <Text className="text-[10px] uppercase tracking-widest text-white/40">
            Series
          </Text>
          <Text className="text-lg font-bold text-white">{score}</Text>
        </>
      )}
    </View>
  );
}

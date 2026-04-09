import { Pressable, Text, View } from "react-native";
import type { Move } from "@/lib/types";

const moveEmojis: Record<Move, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

const moveLabels: Record<Move, string> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
};

export function MoveButton({
  move,
  selected,
  locked,
  onPress,
}: {
  move: Move;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      className={`flex-1 items-center justify-center gap-2 rounded-3xl border-2 p-5 ${
        selected
          ? "border-fuchsia-400 bg-fuchsia-400/15"
          : "border-white/15 bg-white/5"
      } ${locked ? "opacity-50" : ""}`}
    >
      <Text className="text-5xl">{moveEmojis[move]}</Text>
      <Text className="text-xs font-bold uppercase tracking-wider text-white">
        {moveLabels[move]}
      </Text>
    </Pressable>
  );
}

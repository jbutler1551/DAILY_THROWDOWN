import { useState, useCallback } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import {
  ScreenShell,
  Card,
  HostLine,
  Button,
  MoveButton,
  PlayerCard,
  VsDivider,
  Pill,
} from "@/components/ui";
import { resolveThrow, randomMove } from "@/lib/engine";
import { getMoveRevealLine, getHostLine } from "@/lib/host";
import type { Move } from "@/lib/types";

type MatchState = "intro" | "choosing" | "locked" | "reveal" | "result";

const moveEmojis: Record<Move, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

export default function MatchScreen() {
  const router = useRouter();
  const [state, setState] = useState<MatchState>("intro");
  const [selectedMove, setSelectedMove] = useState<Move | null>(null);
  const [opponentMove, setOpponentMove] = useState<Move | null>(null);
  const [result, setResult] = useState<"win" | "loss" | "tie" | null>(null);
  const [hostLine, setHostLine] = useState(getHostLine("match-intro"));
  const [tieCount, setTieCount] = useState(0);
  const [isHouseMatch] = useState(false);
  const [seriesScore, setSeriesScore] = useState({ you: 0, them: 0 });
  const [isBestOf3] = useState(false);

  const opponentName = isHouseMatch ? "The House" : "Opponent";

  const handleStartMatch = useCallback(() => {
    setState("choosing");
    setHostLine(getHostLine("pre-reveal"));
  }, []);

  const handleSelectMove = useCallback(
    (move: Move) => {
      if (state !== "choosing") return;
      setSelectedMove(move);
    },
    [state]
  );

  const handleLockIn = useCallback(() => {
    if (!selectedMove) return;
    setState("locked");
    setHostLine("Moves locked. Revealing in 3... 2... 1...");

    setTimeout(() => {
      const oppMove = randomMove();
      setOpponentMove(oppMove);
      setState("reveal");

      const outcome = resolveThrow(selectedMove, oppMove);

      if (outcome === "tie") {
        const newTieCount = tieCount + 1;
        setTieCount(newTieCount);

        if (newTieCount >= 5) {
          setResult("tie");
          setHostLine(getHostLine("five-tie"));
        } else {
          setResult("tie");
          setHostLine(getHostLine("tie"));
        }
      } else if (outcome === "playerA") {
        setResult("win");
        if (isBestOf3) {
          setSeriesScore((prev) => ({ ...prev, you: prev.you + 1 }));
        }
        setHostLine(getMoveRevealLine(selectedMove, oppMove));
      } else {
        setResult("loss");
        if (isBestOf3) {
          setSeriesScore((prev) => ({ ...prev, them: prev.them + 1 }));
        }
        setHostLine(getMoveRevealLine(oppMove, selectedMove));
      }

      setTimeout(() => setState("result"), 800);
    }, 1500);
  }, [selectedMove, tieCount, isBestOf3]);

  const handleNextAction = useCallback(() => {
    if (result === "tie" && tieCount < 5) {
      setSelectedMove(null);
      setOpponentMove(null);
      setResult(null);
      setState("choosing");
      setHostLine("Again. Let's see if anyone changes their mind.");
    } else {
      if (result === "win" || (result === "tie" && tieCount >= 5)) {
        router.push("/broadcast");
      } else {
        router.push("/results");
      }
    }
  }, [result, tieCount, router]);

  return (
    <ScreenShell>
      {/* Round info */}
      <View className="flex-row flex-wrap items-center gap-2">
        <Pill color="fuchsia">Round --</Pill>
        {isHouseMatch && <Pill color="amber">House Match</Pill>}
        {isBestOf3 && <Pill color="cyan">Best of 3</Pill>}
        {tieCount > 0 && <Pill color="red">{`Tie #${tieCount}`}</Pill>}
      </View>

      {/* Main match area */}
      <View className="rounded-3xl border border-fuchsia-400/20 bg-black/20 p-5">
        {/* Players */}
        <View className="flex-row items-center justify-between">
          <PlayerCard
            name="You"
            subtitle="--"
            side="left"
          />
          <VsDivider
            score={
              isBestOf3
                ? `${seriesScore.you}-${seriesScore.them}`
                : undefined
            }
          />
          <PlayerCard
            name={opponentName}
            subtitle={isHouseMatch ? "Random moves" : "--"}
            side="right"
          />
        </View>

        {/* Host line */}
        <View className="mt-5">
          <HostLine slot="Host">{hostLine}</HostLine>
        </View>

        {/* State: intro */}
        {state === "intro" && (
          <View className="mt-6 items-center gap-4">
            <Text className="text-2xl font-black text-white">Ready</Text>
            <Button onPress={handleStartMatch}>Start Match</Button>
          </View>
        )}

        {/* State: choosing */}
        {state === "choosing" && (
          <View className="mt-6 gap-4">
            <Text className="text-center text-xs uppercase tracking-widest text-white/40">
              Choose your move
            </Text>
            <View className="flex-row gap-3">
              <MoveButton
                move="rock"
                selected={selectedMove === "rock"}
                locked={false}
                onPress={() => handleSelectMove("rock")}
              />
              <MoveButton
                move="paper"
                selected={selectedMove === "paper"}
                locked={false}
                onPress={() => handleSelectMove("paper")}
              />
              <MoveButton
                move="scissors"
                selected={selectedMove === "scissors"}
                locked={false}
                onPress={() => handleSelectMove("scissors")}
              />
            </View>
            <View className="items-center">
              <Button onPress={handleLockIn} disabled={!selectedMove}>
                Lock In
              </Button>
            </View>
          </View>
        )}

        {/* State: locked */}
        {state === "locked" && (
          <View className="mt-6 items-center gap-3">
            <Text className="text-6xl">
              {selectedMove && moveEmojis[selectedMove]}
            </Text>
            <Text className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Move locked — waiting for opponent...
            </Text>
            <View className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <View className="h-full w-full rounded-full bg-fuchsia-400 opacity-60" />
            </View>
          </View>
        )}

        {/* State: reveal + result */}
        {(state === "reveal" || state === "result") && (
          <View className="mt-6 gap-5">
            {/* Move reveal */}
            <View className="flex-row items-center justify-center gap-6">
              <View className="items-center gap-1">
                <Text className="text-[10px] uppercase tracking-widest text-white/40">
                  You
                </Text>
                <Text className="text-6xl">
                  {selectedMove && moveEmojis[selectedMove]}
                </Text>
                <Text className="text-xs font-bold capitalize text-white">
                  {selectedMove}
                </Text>
              </View>

              <Text className="text-xl font-black text-white/30">vs</Text>

              <View className="items-center gap-1">
                <Text className="text-[10px] uppercase tracking-widest text-white/40">
                  {opponentName}
                </Text>
                <Text className="text-6xl">
                  {opponentMove && moveEmojis[opponentMove]}
                </Text>
                <Text className="text-xs font-bold capitalize text-white">
                  {opponentMove}
                </Text>
              </View>
            </View>

            {/* Result banner */}
            {state === "result" && result && (
              <View className="gap-4">
                <View
                  className={`rounded-2xl border p-5 ${
                    result === "win"
                      ? "border-emerald-400/25 bg-emerald-400/10"
                      : result === "loss"
                      ? "border-red-400/25 bg-red-400/10"
                      : "border-amber-400/25 bg-amber-400/10"
                  }`}
                >
                  <Text
                    className={`text-center text-xl font-black ${
                      result === "win"
                        ? "text-emerald-200"
                        : result === "loss"
                        ? "text-red-200"
                        : "text-amber-200"
                    }`}
                  >
                    {result === "win" && "You Win!"}
                    {result === "loss" && "Eliminated"}
                    {result === "tie" && tieCount >= 5
                      ? "5 Ties — Both Advance!"
                      : result === "tie"
                      ? `Tie #${tieCount} — Replay`
                      : ""}
                  </Text>
                </View>

                <View className="flex-row justify-center gap-3">
                  {result === "tie" && tieCount < 5 && (
                    <Button onPress={handleNextAction}>Replay Round</Button>
                  )}
                  {result === "win" && (
                    <Button onPress={handleNextAction}>Continue</Button>
                  )}
                  {result === "loss" && (
                    <View className="flex-row gap-3">
                      <Button
                        variant="secondary"
                        onPress={() => router.push("/broadcast")}
                      >
                        Watch
                      </Button>
                      <Button
                        variant="secondary"
                        onPress={() => router.push("/results")}
                      >
                        Results
                      </Button>
                    </View>
                  )}
                  {result === "tie" && tieCount >= 5 && (
                    <Button onPress={handleNextAction}>Continue</Button>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

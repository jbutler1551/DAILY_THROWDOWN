import { View, Text } from "react-native";
import {
  ScreenShell,
  Card,
  HostLine,
  PlayerCard,
  VsDivider,
  Pill,
} from "@/components/ui";
import { getHostLine } from "@/lib/host";

interface BracketMatch {
  id: string;
  round: string;
  playerA: string;
  playerB: string;
  result?: string;
  winner?: "a" | "b";
  status: "upcoming" | "live" | "complete";
  series?: string;
  isBestOf3?: boolean;
}

// Placeholder bracket data — will be replaced with real Supabase data
const bracketMatches: BracketMatch[] = [
  { id: "r16-1", round: "Round of 16", playerA: "David", playerB: "Tyler", result: "Rock vs Scissors", winner: "a", status: "complete" },
  { id: "r16-2", round: "Round of 16", playerA: "Emily", playerB: "Carlos", result: "Paper vs Rock", winner: "a", status: "complete" },
  { id: "r16-3", round: "Round of 16", playerA: "Marcus", playerB: "Aria", result: "Scissors vs Paper", winner: "a", status: "complete" },
  { id: "r16-4", round: "Round of 16", playerA: "Sofia", playerB: "Jake", winner: "a", status: "complete" },
  { id: "e8-1", round: "Elite 8", playerA: "David", playerB: "Emily", status: "live", series: "1-0" },
  { id: "e8-2", round: "Elite 8", playerA: "Marcus", playerB: "Sofia", status: "upcoming" },
  { id: "f4-1", round: "Final Four", playerA: "TBD", playerB: "TBD", status: "upcoming", isBestOf3: true },
  { id: "final", round: "Championship", playerA: "TBD", playerB: "TBD", status: "upcoming", isBestOf3: true },
];

function MatchCard({ match }: { match: BracketMatch }) {
  const borderColor =
    match.status === "live"
      ? "border-cyan-400/30 bg-cyan-400/8"
      : match.status === "complete"
      ? "border-white/8 bg-white/[0.02]"
      : "border-white/10 bg-white/[0.03]";

  return (
    <View className={`rounded-2xl border p-4 ${borderColor}`}>
      <View className="flex-row items-center justify-between">
        <Text
          className={`text-[10px] uppercase tracking-widest ${
            match.status === "live" ? "text-cyan-300" : "text-white/40"
          }`}
        >
          {match.round}
        </Text>
        <Text
          className={`text-[10px] uppercase tracking-widest ${
            match.status === "live"
              ? "text-cyan-300"
              : match.status === "complete"
              ? "text-emerald-300/60"
              : "text-white/30"
          }`}
        >
          {match.status === "live"
            ? "LIVE"
            : match.status === "complete"
            ? "Complete"
            : "Upcoming"}
        </Text>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text
          className={`text-sm font-bold ${
            match.winner === "a"
              ? "text-white"
              : match.winner === "b"
              ? "text-white/40"
              : "text-white/80"
          }`}
        >
          {match.playerA}
        </Text>
        <View className="items-center">
          {match.result && (
            <Text className="text-[10px] text-white/50">{match.result}</Text>
          )}
          {match.series && (
            <Text className="text-sm font-bold text-cyan-200">
              {match.series}
            </Text>
          )}
          {!match.result && !match.series && (
            <Text className="text-xs text-white/30">vs</Text>
          )}
        </View>
        <Text
          className={`text-sm font-bold ${
            match.winner === "b"
              ? "text-white"
              : match.winner === "a"
              ? "text-white/40"
              : "text-white/80"
          }`}
        >
          {match.playerB}
        </Text>
      </View>

      {match.isBestOf3 && (
        <View className="mt-2 items-center">
          <Pill color="cyan">Best of 3</Pill>
        </View>
      )}
    </View>
  );
}

export default function BroadcastScreen() {
  const liveMatch = bracketMatches.find((m) => m.status === "live");

  return (
    <ScreenShell>
      {/* Broadcast header */}
      <View className="rounded-3xl border border-cyan-400/20 bg-black/20 p-5">
        <View className="flex-row flex-wrap gap-2">
          <Pill color="cyan">Broadcast Mode</Pill>
          <Pill>12 Players Remaining</Pill>
        </View>

        <Text className="mt-3 text-2xl font-black tracking-tight text-white">
          The Tournament Is Live
        </Text>
        <Text className="mt-2 text-sm leading-6 text-white/70">
          Broadcast mode is active. Everyone can watch.
        </Text>
      </View>

      {/* Featured live match */}
      {liveMatch && (
        <View className="rounded-3xl border border-cyan-400/15 bg-cyan-900/10 p-5">
          <View className="flex-row items-center justify-between">
            <Pill color="cyan">Featured Match — LIVE</Pill>
            <Text className="text-xs font-semibold text-cyan-200">
              {liveMatch.round}
            </Text>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <PlayerCard
              name={liveMatch.playerA}
              subtitle="12-day streak"
              streakDays={12}
              side="left"
            />
            <VsDivider score={liveMatch.series} />
            <PlayerCard
              name={liveMatch.playerB}
              subtitle="3-day streak"
              streakDays={3}
              side="right"
            />
          </View>

          <View className="mt-4">
            <HostLine slot="Live Commentary">
              {getHostLine("broadcast-intro")}
            </HostLine>
          </View>
        </View>
      )}

      {/* Bracket matches */}
      <Card title="Bracket" subtitle="All matches">
        <View className="gap-3">
          {bracketMatches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </View>
      </Card>

      {/* Prize reminder */}
      <Card>
        <View className="gap-2">
          {[
            { label: "Champion", prize: "$55", color: "text-amber-200" },
            { label: "Runner-Up", prize: "$25", color: "text-white" },
            { label: "Semifinalists", prize: "$10 each", color: "text-white/80" },
          ].map((item) => (
            <View key={item.label} className="flex-row justify-between">
              <Text className="text-sm text-white/60">{item.label}</Text>
              <Text className={`text-sm font-bold ${item.color}`}>
                {item.prize}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </ScreenShell>
  );
}

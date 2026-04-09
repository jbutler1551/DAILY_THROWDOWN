import { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ScreenShell,
  Card,
  HostLine,
  Pill,
  StatBox,
  Button,
} from "@/components/ui";
import { getHostLine } from "@/lib/host";
import {
  getTodayTournamentStatus,
  getTournamentResults,
  type TournamentResults,
} from "@/lib/data";

export default function ResultsScreen() {
  const router = useRouter();
  const [results, setResults] = useState<TournamentResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const tRes = await getTodayTournamentStatus();
      if (tRes.ok && tRes.tournament) {
        const rRes = await getTournamentResults(tRes.tournament.id);
        if (rRes.ok) {
          setResults(rRes.results);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <ScreenShell>
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-white/50">Loading results...</Text>
        </View>
      </ScreenShell>
    );
  }

  const standings = [
    {
      place: "Champion",
      name: results?.champion?.display_name ?? "TBD",
      initial: (results?.champion?.display_name ?? "?").charAt(0).toUpperCase(),
      prize: "$55",
      stat: "Daily Throwdown Champion",
      borderColor: "border-amber-400/25 bg-amber-400/8",
      nameColor: "text-amber-200",
    },
    {
      place: "Runner-Up",
      name: results?.runnerUp?.display_name ?? "TBD",
      initial: (results?.runnerUp?.display_name ?? "?").charAt(0).toUpperCase(),
      prize: "$25",
      stat: "Lost in championship",
      borderColor: "border-white/15 bg-white/5",
      nameColor: "text-white",
    },
    ...(results?.semifinalists ?? []).map((s, i) => ({
      place: `Semifinalist`,
      name: s.display_name,
      initial: s.display_name.charAt(0).toUpperCase(),
      prize: "$10",
      stat: "Lost in semifinal",
      borderColor: "border-white/10 bg-white/[0.03]",
      nameColor: "text-white/70",
    })),
  ];

  return (
    <ScreenShell>
      {/* Champion banner */}
      <View className="items-center gap-5 rounded-3xl border border-amber-400/20 bg-amber-900/10 p-6">
        <Pill color="amber">Tournament Complete</Pill>
        <Text className="text-5xl">{"\u{1F451}"}</Text>
        <Text className="text-3xl font-black text-white">
          {results?.champion?.display_name ?? "Champion"}
        </Text>
        <Text className="text-sm text-white/60">
          Today's Daily Throwdown Winner
        </Text>

        <HostLine slot="Host">{getHostLine("champion-crowned")}</HostLine>

        <View className="flex-row gap-3">
          <Button onPress={() => router.push("/lobby")}>
            Join Tomorrow
          </Button>
          <Button variant="secondary" onPress={() => router.push("/")}>
            Home
          </Button>
        </View>
      </View>

      {/* Final standings */}
      <Card title="Final Standings" subtitle="Today's prize winners">
        <View className="gap-3">
          {standings.map((entry, i) => (
            <View
              key={i}
              className={`flex-row items-center justify-between rounded-2xl border p-4 ${entry.borderColor}`}
            >
              <View className="flex-row items-center gap-3">
                <LinearGradient
                  colors={["#e879f9", "#8b5cf6"]}
                  className="h-10 w-10 items-center justify-center rounded-full"
                >
                  <Text className="text-sm font-black text-white">
                    {entry.initial}
                  </Text>
                </LinearGradient>
                <View>
                  <Text className={`font-bold ${entry.nameColor}`}>
                    {entry.name}
                  </Text>
                  <Text className="text-xs text-white/40">
                    {entry.place} — {entry.stat}
                  </Text>
                </View>
              </View>
              <Text className={`text-xl font-black ${entry.nameColor}`}>
                {entry.prize}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Tournament stats */}
      <Card title="Tournament Stats">
        <View className="flex-row flex-wrap gap-3">
          <View className="w-[48%]">
            <StatBox
              label="Total Entrants"
              value={String(results?.totalEntrants ?? 0)}
            />
          </View>
          <View className="w-[48%]">
            <StatBox
              label="Total Rounds"
              value={String(results?.totalRounds ?? 0)}
            />
          </View>
          <View className="w-[48%]">
            <StatBox
              label="Total Throws"
              value={String(results?.totalThrows ?? 0)}
            />
          </View>
          <View className="w-[48%]">
            <StatBox
              label="Tie Replays"
              value={String(results?.totalTies ?? 0)}
              color="amber"
            />
          </View>
        </View>
      </Card>

      {/* Next tournament */}
      <View className="items-center rounded-3xl border border-fuchsia-400/15 bg-black/20 p-6">
        <Text className="text-[10px] uppercase tracking-widest text-white/40">
          Next Tournament
        </Text>
        <Text className="mt-2 text-2xl font-black text-fuchsia-200">
          Tomorrow at 2:00 PM CT
        </Text>
        <Text className="mt-2 text-xs text-white/40">
          Your streak continues if you show up.
        </Text>
      </View>
    </ScreenShell>
  );
}
